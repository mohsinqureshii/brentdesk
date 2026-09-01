/**
 * Greenhouse Integration Service
 * ----------------------------------------------------------------------
 * Read-only sync from Greenhouse Harvest API into the talent platform.
 * Pulls jobs + candidates + applications so a customer migrating from
 * Greenhouse can light up the job board with existing data.
 *
 * Configuration:
 *   Stored in `integration_configs` table, integrationId='greenhouse'.
 *   Secrets: { apiKey, syncDirection: "import_only" | "two_way" }.
 *   Public config: { lastSyncAt, jobsCount, candidatesCount }.
 *
 * Auth:
 *   Greenhouse uses HTTP Basic with the API key as the username, blank
 *   password. We send `Authorization: Basic <base64(apiKey:)>`.
 *
 * Scope:
 *   Phase 7 ships a thin client + sync skeleton. Field mapping to the
 *   talent platform's tables is intentionally minimal: enough to prove
 *   the integration path. Per-tenant field mapping (custom fields, EEO
 *   data, custom stages) is deferred to a future pass driven by the
 *   first customer migration.
 */

import { getEffectiveConfig } from "./integrationConfig.service";

interface GreenhouseConfig {
  apiKey: string;
  syncDirection?: "import_only" | "two_way";
}

async function resolveConfig(): Promise<GreenhouseConfig | null> {
  const cfg = await getEffectiveConfig("greenhouse");
  if (!cfg) return null;
  const apiKey = (cfg.secrets as any)?.apiKey || process.env.GREENHOUSE_API_KEY || "";
  if (!apiKey) return null;
  return {
    apiKey,
    syncDirection: (cfg.publicConfig as any)?.syncDirection || "import_only",
  };
}

export async function isConfigured(): Promise<boolean> {
  const cfg = await resolveConfig();
  return !!cfg;
}

const BASE = "https://harvest.greenhouse.io/v1";

async function ghFetch<T = unknown>(
  path: string,
  cfg: GreenhouseConfig,
  init?: RequestInit,
): Promise<T> {
  const auth = Buffer.from(`${cfg.apiKey}:`).toString("base64");
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Greenhouse ${res.status}: ${body.slice(0, 256)}`);
  }
  return (await res.json()) as T;
}

// ----------------------------------------------------------------
// Read endpoints — pagination follows the Link header convention
// ----------------------------------------------------------------

export interface GreenhouseJob {
  id: number;
  name: string;
  status: string;
  departments: Array<{ id: number; name: string }>;
  offices: Array<{ id: number; name: string }>;
  created_at: string;
  updated_at: string;
}

export interface GreenhouseCandidate {
  id: number;
  first_name: string;
  last_name: string;
  email_addresses: Array<{ value: string; type: string }>;
  current_company?: string;
  current_title?: string;
  applications: Array<{ id: number; job_id: number; status: string }>;
  created_at: string;
  updated_at: string;
}

export async function listJobs(opts?: { perPage?: number; page?: number }): Promise<GreenhouseJob[]> {
  const cfg = await resolveConfig();
  if (!cfg) throw new Error("Greenhouse not configured");
  const params = new URLSearchParams({
    per_page: String(opts?.perPage ?? 100),
    page: String(opts?.page ?? 1),
  });
  return ghFetch<GreenhouseJob[]>(`/jobs?${params}`, cfg);
}

export async function listCandidates(opts?: {
  perPage?: number;
  page?: number;
  updatedAfter?: string;
}): Promise<GreenhouseCandidate[]> {
  const cfg = await resolveConfig();
  if (!cfg) throw new Error("Greenhouse not configured");
  const params = new URLSearchParams({
    per_page: String(opts?.perPage ?? 100),
    page: String(opts?.page ?? 1),
  });
  if (opts?.updatedAfter) params.set("updated_after", opts.updatedAfter);
  return ghFetch<GreenhouseCandidate[]>(`/candidates?${params}`, cfg);
}

// ----------------------------------------------------------------
// Sync orchestration — minimal skeleton; expand per-tenant in Phase 8+
// ----------------------------------------------------------------

export interface SyncResult {
  jobsFetched: number;
  candidatesFetched: number;
  durationMs: number;
  errors: string[];
}

/**
 * Run an incremental sync. The caller decides what to do with the
 * fetched records (insert via the candidates/jobs services, etc.) —
 * this function only handles paginated fetch + error capture.
 */
export async function runSync(opts?: {
  updatedAfter?: string;
  maxPages?: number;
}): Promise<SyncResult> {
  const start = Date.now();
  const errors: string[] = [];
  let jobsFetched = 0;
  let candidatesFetched = 0;

  const maxPages = opts?.maxPages ?? 20;

  try {
    for (let page = 1; page <= maxPages; page++) {
      const jobs = await listJobs({ page, perPage: 100 });
      jobsFetched += jobs.length;
      if (jobs.length < 100) break;
    }
  } catch (err) {
    errors.push(`jobs: ${(err as Error).message}`);
  }

  try {
    for (let page = 1; page <= maxPages; page++) {
      const candidates = await listCandidates({
        page,
        perPage: 100,
        updatedAfter: opts?.updatedAfter,
      });
      candidatesFetched += candidates.length;
      if (candidates.length < 100) break;
    }
  } catch (err) {
    errors.push(`candidates: ${(err as Error).message}`);
  }

  return {
    jobsFetched,
    candidatesFetched,
    durationMs: Date.now() - start,
    errors,
  };
}
