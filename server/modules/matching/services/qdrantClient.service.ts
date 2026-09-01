/**
 * Qdrant HTTP Client (no npm dep)
 * ----------------------------------------------------------------------
 * Lightweight wrapper around the Qdrant REST API. Per-tenant
 * collections keep one customer's candidate/job vectors from
 * appearing in another tenant's similarity searches.
 *
 * Configuration:
 *   - integrationConfigs (integrationId='qdrant'): { baseUrl, apiKey }
 *   - env fallback: QDRANT_URL, QDRANT_API_KEY
 *
 * Collection naming:
 *   - candidates_<tenantId> or candidates_global (tenantId=null)
 *   - jobs_<tenantId>       or jobs_global
 */

import { getEffectiveConfig } from "../../../services/integrationConfig.service";
import { QdrantUnavailableError } from "../types";

interface QdrantConfig {
  baseUrl: string;
  apiKey: string | null;
}

let cachedConfig: QdrantConfig | null = null;

async function getConfig(): Promise<QdrantConfig | null> {
  if (cachedConfig) return cachedConfig;
  const cfg = await getEffectiveConfig("qdrant");
  const baseUrl =
    (cfg?.publicConfig as any)?.baseUrl ||
    (cfg?.secrets as any)?.baseUrl ||
    process.env.QDRANT_URL ||
    null;
  const apiKey = (cfg?.secrets as any)?.apiKey || process.env.QDRANT_API_KEY || null;
  if (!baseUrl) return null;
  cachedConfig = { baseUrl: baseUrl.replace(/\/$/, ""), apiKey };
  return cachedConfig;
}

export async function isConfigured(): Promise<boolean> {
  return !!(await getConfig());
}

async function qFetch<T>(path: string, init: RequestInit, allowed?: number[]): Promise<T> {
  const cfg = await getConfig();
  if (!cfg) throw new QdrantUnavailableError("Qdrant not configured");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (cfg.apiKey) headers["api-key"] = cfg.apiKey;
  const res = await fetch(`${cfg.baseUrl}${path}`, { ...init, headers });
  if (!res.ok && !(allowed || []).includes(res.status)) {
    const body = await res.text().catch(() => "");
    throw new Error(`Qdrant ${res.status}: ${body.slice(0, 256)}`);
  }
  if (res.status === 204) return undefined as any;
  return (await res.json()) as T;
}

// ----------------------------------------------------------------
// Collection helpers
// ----------------------------------------------------------------

export function collectionForCandidates(tenantId: number | null): string {
  return tenantId === null ? "candidates_global" : `candidates_${tenantId}`;
}

export function collectionForJobs(tenantId: number | null): string {
  return tenantId === null ? "jobs_global" : `jobs_${tenantId}`;
}

/**
 * Idempotent: 200/201 means newly created, 409 means already exists.
 * Both are fine.
 */
export async function ensureCollection(name: string, dim: number): Promise<void> {
  await qFetch<void>(
    `/collections/${name}`,
    {
      method: "PUT",
      body: JSON.stringify({
        vectors: { size: dim, distance: "Cosine" },
      }),
    },
    [409, 400],
  );
}

// ----------------------------------------------------------------
// Point operations
// ----------------------------------------------------------------

export interface QdrantPoint {
  id: string;
  vector: number[];
  payload?: Record<string, unknown>;
}

export async function upsertPoint(
  collection: string,
  point: QdrantPoint,
): Promise<void> {
  await qFetch<unknown>(`/collections/${collection}/points?wait=true`, {
    method: "PUT",
    body: JSON.stringify({ points: [point] }),
  });
}

export async function upsertPoints(
  collection: string,
  points: QdrantPoint[],
): Promise<void> {
  if (points.length === 0) return;
  await qFetch<unknown>(`/collections/${collection}/points?wait=true`, {
    method: "PUT",
    body: JSON.stringify({ points }),
  });
}

export async function deletePoint(collection: string, pointId: string): Promise<void> {
  await qFetch<unknown>(
    `/collections/${collection}/points/delete?wait=true`,
    {
      method: "POST",
      body: JSON.stringify({ points: [pointId] }),
    },
    [404],
  );
}

export interface QdrantSearchHit {
  id: string;
  score: number;
  payload?: Record<string, unknown>;
}

export async function searchSimilar(
  collection: string,
  vector: number[],
  limit: number,
  filter?: Record<string, unknown>,
): Promise<QdrantSearchHit[]> {
  const body: Record<string, unknown> = { vector, limit, with_payload: true };
  if (filter) body.filter = filter;
  const res = await qFetch<{ result: QdrantSearchHit[] }>(
    `/collections/${collection}/points/search`,
    { method: "POST", body: JSON.stringify(body) },
  );
  return res.result || [];
}

/**
 * Fetch a single point's vector from a collection. Returns null if the
 * point isn't there (404). Used by embedCandidate/embedJob to skip a
 * redundant OpenAI call when the payload hash hasn't changed.
 */
export async function getPointVector(
  collection: string,
  pointId: string,
): Promise<number[] | null> {
  const res = await qFetch<{ result: { points?: Array<{ vector?: number[] }> } | null }>(
    `/collections/${collection}/points`,
    {
      method: "POST",
      body: JSON.stringify({ ids: [pointId], with_vector: true, with_payload: false }),
    },
    [404],
  );
  // Qdrant returns either { result: [...] } or { result: { points: [...] } }.
  const result: any = (res as any)?.result;
  if (!result) return null;
  const points = Array.isArray(result) ? result : result.points || [];
  const point = points[0];
  if (!point) return null;
  if (Array.isArray(point.vector)) return point.vector;
  // Named-vector form: { default: [...] }
  if (point.vector && typeof point.vector === "object") {
    const first = Object.values(point.vector)[0];
    if (Array.isArray(first)) return first as number[];
  }
  return null;
}
