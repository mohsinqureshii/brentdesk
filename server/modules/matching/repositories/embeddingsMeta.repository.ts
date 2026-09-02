/**
 * Embeddings Metadata Repository
 * Tracks which Qdrant point id corresponds to which candidate/job.
 * The actual vector lives in Qdrant; this table is the join key.
 */

import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { candidateEmbeddingsMeta, jobEmbeddingsMeta } from "../../../../drizzle/schema";
import { toDbDate } from "../../../_core/dbValues";

async function db() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

export async function findForCandidate(candidateId: number) {
  const d = await db();
  const rows = await d
    .select()
    .from(candidateEmbeddingsMeta)
    .where(eq(candidateEmbeddingsMeta.candidateId, candidateId))
    .limit(1);
  return rows[0] ?? null;
}

export async function findForJob(jobId: number) {
  const d = await db();
  const rows = await d
    .select()
    .from(jobEmbeddingsMeta)
    .where(eq(jobEmbeddingsMeta.jobId, jobId))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertCandidateMeta(values: {
  tenantId: number | null;
  candidateId: number;
  provider: string;
  model: string;
  dim: number;
  qdrantPointId: string;
  payloadHash: string;
}): Promise<void> {
  const d = await db();
  const existing = await findForCandidate(values.candidateId);
  if (existing) {
    await d
      .update(candidateEmbeddingsMeta)
      .set({
        provider: values.provider,
        model: values.model,
        dim: values.dim,
        qdrantPointId: values.qdrantPointId,
        payloadHash: values.payloadHash,
        indexedAt: toDbDate(new Date()),
      } as any)
      .where(eq(candidateEmbeddingsMeta.id, existing.id));
  } else {
    await d.insert(candidateEmbeddingsMeta).values({
      tenantId: values.tenantId,
      candidateId: values.candidateId,
      provider: values.provider,
      model: values.model,
      dim: values.dim,
      qdrantPointId: values.qdrantPointId,
      payloadHash: values.payloadHash,
      indexedAt: toDbDate(new Date()),
    } as any);
  }
}

export async function upsertJobMeta(values: {
  tenantId: number | null;
  jobId: number;
  provider: string;
  model: string;
  dim: number;
  qdrantPointId: string;
  payloadHash: string;
}): Promise<void> {
  const d = await db();
  const existing = await findForJob(values.jobId);
  if (existing) {
    await d
      .update(jobEmbeddingsMeta)
      .set({
        provider: values.provider,
        model: values.model,
        dim: values.dim,
        qdrantPointId: values.qdrantPointId,
        payloadHash: values.payloadHash,
        indexedAt: toDbDate(new Date()),
      } as any)
      .where(eq(jobEmbeddingsMeta.id, existing.id));
  } else {
    await d.insert(jobEmbeddingsMeta).values({
      tenantId: values.tenantId,
      jobId: values.jobId,
      provider: values.provider,
      model: values.model,
      dim: values.dim,
      qdrantPointId: values.qdrantPointId,
      payloadHash: values.payloadHash,
      indexedAt: toDbDate(new Date()),
    } as any);
  }
}

export async function deleteForCandidate(candidateId: number): Promise<void> {
  const d = await db();
  await d
    .delete(candidateEmbeddingsMeta)
    .where(eq(candidateEmbeddingsMeta.candidateId, candidateId));
}

export async function deleteForJob(jobId: number): Promise<void> {
  const d = await db();
  await d.delete(jobEmbeddingsMeta).where(eq(jobEmbeddingsMeta.jobId, jobId));
}

export async function listByPointIds(pointIds: string[]) {
  if (pointIds.length === 0) return [];
  const d = await db();
  const out: any[] = [];
  // Drizzle MySQL doesn't ship a clean `IN (...)` helper for string
  // arrays without `inArray`; using OR keeps the helper local.
  for (const id of pointIds) {
    const rows = await d
      .select()
      .from(candidateEmbeddingsMeta)
      .where(eq(candidateEmbeddingsMeta.qdrantPointId, id));
    out.push(...rows);
  }
  return out;
}
