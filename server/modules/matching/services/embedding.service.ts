/**
 * Embedding Service
 * ----------------------------------------------------------------------
 * Calls OpenAI text-embedding-3-small directly (the LLM provider
 * abstraction doesn't yet expose an embedText method — adding one in
 * a separate pass would touch every existing AI caller). For now the
 * call is direct + minimal; swap to the abstraction in Phase 9 cleanup.
 *
 * Caches via payload hash: if the candidate's profile text hasn't
 * changed since last index, the upstream call is skipped and we reuse
 * the vector already stored in Qdrant (retrieved via point lookup).
 */

import { createHash } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { getEffectiveConfig } from "../../../services/integrationConfig.service";
import { getDb } from "../../../db";
import { candidates, jobs } from "../../../../drizzle/schema";
import * as embRepo from "../repositories/embeddingsMeta.repository";
import * as qdrant from "./qdrantClient.service";
import { candidatesQueryService } from "../../candidates";
import { assertTenantScope } from "../tenant.guard";
import { TenantScope } from "../types";

const PROVIDER = "openai";
const MODEL = "text-embedding-3-small";
const DIM = 1536;
const MAX_REINDEX = 500;

interface OpenAIConfig {
  apiKey: string;
}

async function resolveOpenAI(): Promise<OpenAIConfig | null> {
  const cfg = await getEffectiveConfig("ai-claude", {
    secrets: { openaiApiKey: process.env.OPENAI_API_KEY || "" },
  });
  const apiKey = (cfg?.secrets as any)?.openaiApiKey || null;
  return apiKey ? { apiKey } : null;
}

export function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export interface EmbedTextResult {
  vector: number[];
  model: string;
  dim: number;
}

export async function embedText(text: string): Promise<EmbedTextResult> {
  const cfg = await resolveOpenAI();
  if (!cfg) {
    throw new Error(
      "OpenAI not configured. Set OPENAI_API_KEY or configure 'ai-claude' (openaiApiKey) in integrationConfigs.",
    );
  }
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({ model: MODEL, input: text }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenAI embeddings ${res.status}: ${body.slice(0, 256)}`);
  }
  const json = (await res.json()) as { data: Array<{ embedding: number[] }> };
  return { vector: json.data[0].embedding, model: MODEL, dim: DIM };
}

/**
 * Build the embedding text for a candidate. Order matters: signal-
 * dense fields first so similarity dominates from headline/skills.
 */
export function buildCandidateText(candidate: any): string {
  const parts: string[] = [];
  if (candidate.headline) parts.push(candidate.headline);
  if (candidate.currentTitle) parts.push(candidate.currentTitle);
  if (candidate.currentCompany) parts.push(`at ${candidate.currentCompany}`);
  if (candidate.summary) parts.push(candidate.summary);
  const parsed = candidate.parsedResumeJson as any;
  if (parsed?.skills?.length) parts.push("Skills: " + parsed.skills.join(", "));
  if (parsed) {
    const json = JSON.stringify(parsed).slice(0, 4000);
    parts.push(json);
  }
  return parts.filter(Boolean).join("\n").slice(0, 8000);
}

export function buildJobText(job: any): string {
  const parts: string[] = [job.title || ""];
  if (job.seniority) parts.push(`Seniority: ${job.seniority}`);
  if (job.roleType) parts.push(`Type: ${job.roleType}`);
  if (job.description) parts.push(job.description);
  if (job.requirements) parts.push("Requirements: " + job.requirements);
  if (job.skills) {
    const skills = Array.isArray(job.skills) ? job.skills : [];
    if (skills.length) parts.push("Skills: " + skills.join(", "));
  }
  return parts.filter(Boolean).join("\n").slice(0, 4000);
}

// ----------------------------------------------------------------
// Internal helpers — direct Drizzle reads. Allowed because the
// matching module owns the embedding pipeline; reading the source
// rows via raw Drizzle avoids forcing every embed call through a
// recruiter-gated service method.
// ----------------------------------------------------------------

async function loadJobRow(jobId: number) {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  const rows = await d.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  return rows[0] ?? null;
}

async function listCandidateIds(scope: TenantScope, limit: number): Promise<number[]> {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  const where =
    scope === null
      ? and(isNull(candidates.tenantId), eq(candidates.isArchived, 0))
      : and(eq(candidates.tenantId, scope), eq(candidates.isArchived, 0));
  const rows = await d.select({ id: candidates.id }).from(candidates).where(where).limit(limit);
  return rows.map((r) => r.id);
}

async function listJobIds(scope: TenantScope, limit: number): Promise<number[]> {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  const where = scope === null ? isNull(jobs.tenantId) : eq(jobs.tenantId, scope);
  const rows = await d.select({ id: jobs.id }).from(jobs).where(where).limit(limit);
  return rows.map((r) => r.id);
}

export interface EmbedResult {
  pointId: string;
  cached: boolean;
  vector: number[];
}

export async function embedCandidate(
  scope: TenantScope,
  candidateId: number,
): Promise<EmbedResult> {
  const candidate = await candidatesQueryService.findById(candidateId);
  if (!candidate) throw new Error(`Candidate ${candidateId} not found`);
  assertTenantScope(candidate.tenantId ?? null, scope, "embedCandidate");

  const text = buildCandidateText(candidate);
  const payloadHash = sha256(text);

  const existing = await embRepo.findForCandidate(candidateId);
  const collection = qdrant.collectionForCandidates(scope);
  const pointId = existing?.qdrantPointId ?? String(candidateId);

  if (existing && existing.payloadHash === payloadHash) {
    // Cached: try to fetch vector back from Qdrant; on miss re-embed.
    try {
      const cachedVector = await qdrant.getPointVector(collection, pointId);
      if (cachedVector) {
        return { pointId, cached: true, vector: cachedVector };
      }
    } catch {
      // Fall through and re-embed.
    }
  }

  await qdrant.ensureCollection(collection, DIM);

  const { vector } = await embedText(text);

  await qdrant.upsertPoint(collection, {
    id: pointId,
    vector,
    payload: {
      candidateId,
      tenantId: scope,
      headline: (candidate as any).headline,
      currentTitle: (candidate as any).currentTitle,
    },
  });

  await embRepo.upsertCandidateMeta({
    tenantId: scope,
    candidateId,
    provider: PROVIDER,
    model: MODEL,
    dim: DIM,
    qdrantPointId: pointId,
    payloadHash,
  });

  return { pointId, cached: false, vector };
}

export async function embedJob(scope: TenantScope, jobId: number): Promise<EmbedResult> {
  const job = await loadJobRow(jobId);
  if (!job) throw new Error(`Job ${jobId} not found`);
  assertTenantScope(job.tenantId ?? null, scope, "embedJob");

  const text = buildJobText(job);
  const payloadHash = sha256(text);

  const existing = await embRepo.findForJob(jobId);
  const collection = qdrant.collectionForJobs(scope);
  const pointId = existing?.qdrantPointId ?? String(jobId);

  if (existing && existing.payloadHash === payloadHash) {
    try {
      const cachedVector = await qdrant.getPointVector(collection, pointId);
      if (cachedVector) {
        return { pointId, cached: true, vector: cachedVector };
      }
    } catch {
      // Fall through and re-embed.
    }
  }

  await qdrant.ensureCollection(collection, DIM);

  const { vector } = await embedText(text);

  await qdrant.upsertPoint(collection, {
    id: pointId,
    vector,
    payload: {
      jobId,
      tenantId: scope,
      title: (job as any).title,
      seniority: (job as any).seniority,
    },
  });

  await embRepo.upsertJobMeta({
    tenantId: scope,
    jobId,
    provider: PROVIDER,
    model: MODEL,
    dim: DIM,
    qdrantPointId: pointId,
    payloadHash,
  });

  return { pointId, cached: false, vector };
}

export async function reindexAll(
  scope: TenantScope,
  type: "candidates" | "jobs" | "all",
): Promise<{ candidates: number; jobs: number; errors: number }> {
  const out = { candidates: 0, jobs: 0, errors: 0 };

  if (type === "candidates" || type === "all") {
    const ids = await listCandidateIds(scope, MAX_REINDEX);
    for (const id of ids) {
      try {
        await embedCandidate(scope, id);
        out.candidates++;
      } catch (err) {
        console.error(`[matching/reindex] candidate ${id} failed:`, err);
        out.errors++;
      }
    }
  }

  if (type === "jobs" || type === "all") {
    const ids = await listJobIds(scope, MAX_REINDEX);
    for (const id of ids) {
      try {
        await embedJob(scope, id);
        out.jobs++;
      } catch (err) {
        console.error(`[matching/reindex] job ${id} failed:`, err);
        out.errors++;
      }
    }
  }

  return out;
}

export const embeddingService = {
  embedText,
  embedCandidate,
  embedJob,
  reindexAll,
  buildCandidateText,
  buildJobText,
  sha256,
};
