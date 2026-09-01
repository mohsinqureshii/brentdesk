/**
 * Judge0 Client
 * ----------------------------------------------------------------------
 * Lightweight HTTP client over a self-hosted Judge0 instance. Used by
 * `codeRuns.service.ts` to compile + execute candidate code submitted
 * as part of an assessment attempt.
 *
 * CONFIG
 * Resolves credentials from `integrationConfigs.getEffectiveConfig("judge0")`
 * with an env-var fallback (`JUDGE0_BASE_URL`, `JUDGE0_API_KEY`). When
 * no base URL is configured anywhere, every call throws `Judge0Error`
 * so the caller can surface a clean "engine not configured" status to
 * recruiters / candidates.
 *
 * DEPLOYMENT — Per the architecture ADR, Judge0 is run as a separate
 * self-hosted service (docker compose). The platform API does not
 * embed a sandbox. See `docs/architecture/judge0-deployment.md` for
 * the recommended setup.
 */

import { getEffectiveConfig } from "../../../services/integrationConfig.service";
import { Judge0Error } from "../types";

// Judge0 language ids (from the public install). Keep the surface small
// — extra languages can be added when product asks.
export const JUDGE0_LANGUAGE_IDS: Record<string, number> = {
  python: 71,       // Python 3.8.1
  javascript: 63,   // Node.js 12.14.0
  typescript: 74,   // TypeScript 3.7.4
  java: 62,         // Java OpenJDK 13.0.1
  go: 60,           // Go 1.13.5
  cpp: 54,          // C++ (GCC 9.2.0)
  csharp: 51,       // C# (Mono 6.6.0.161)
  sql: 82,          // SQL (SQLite 3.27.2)
};

export interface Judge0Config {
  baseUrl: string;
  apiKey?: string;
}

export interface Judge0SubmitInput {
  language: string;
  sourceCode: string;
  stdin?: string;
  expectedStdout?: string;
}

export interface Judge0SubmitResponse {
  token: string;
}

export interface Judge0Result {
  token: string;
  statusId: number | null;
  statusDescription: string | null;
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  runtimeMs: number | null;
  memoryKb: number | null;
}

/**
 * Resolve effective Judge0 config. DB-stored config (Integration Hub)
 * wins; env-var fallback covers dev + the migration window.
 */
async function resolveConfig(): Promise<Judge0Config> {
  const cfg = await getEffectiveConfig("judge0", {
    publicConfig: { baseUrl: process.env.JUDGE0_BASE_URL },
    secrets: { apiKey: process.env.JUDGE0_API_KEY },
  });
  const baseUrl = (cfg?.publicConfig?.baseUrl as string | undefined) || process.env.JUDGE0_BASE_URL;
  if (!baseUrl) {
    throw new Judge0Error("Judge0 not configured");
  }
  const apiKey =
    (cfg?.secrets?.apiKey as string | undefined) || process.env.JUDGE0_API_KEY || undefined;
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

function languageId(language: string): number {
  const id = JUDGE0_LANGUAGE_IDS[language.toLowerCase()];
  if (!id) throw new Judge0Error(`Unsupported language: ${language}`);
  return id;
}

function authHeaders(cfg: Judge0Config): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cfg.apiKey) {
    // Most Judge0 hosts (RapidAPI / sulu) put the key on these headers;
    // self-hosted often accepts a bare X-Auth-Token. Sending both is
    // harmless and the host ignores what it doesn't recognise.
    headers["X-Auth-Token"] = cfg.apiKey;
    headers["X-RapidAPI-Key"] = cfg.apiKey;
  }
  return headers;
}

/**
 * Submit a single program. Returns the Judge0 submission token. Use
 * `getResult(token)` to poll for completion, or `submitAndWait()` for
 * the synchronous convenience wrapper.
 */
export async function submit(input: Judge0SubmitInput): Promise<Judge0SubmitResponse> {
  const cfg = await resolveConfig();
  const url = `${cfg.baseUrl}/submissions?base64_encoded=false&wait=false`;
  const body = {
    source_code: input.sourceCode,
    language_id: languageId(input.language),
    stdin: input.stdin ?? "",
    expected_output: input.expectedStdout ?? undefined,
  };
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders(cfg),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Judge0Error(`submit failed (${res.status}): ${text}`);
  }
  const json = (await res.json()) as { token?: string };
  if (!json.token) throw new Judge0Error("submit response missing token");
  return { token: json.token };
}

/**
 * Fetch the result for a previously submitted program. The Judge0
 * status id is part of a well-known enum (1=in queue, 2=processing,
 * 3=accepted, 4=wrong answer, 5=time limit exceeded, 6=compilation
 * error, 7-12=runtime errors, 13=internal error, 14=exec format error).
 */
export async function getResult(token: string): Promise<Judge0Result> {
  const cfg = await resolveConfig();
  const url = `${cfg.baseUrl}/submissions/${encodeURIComponent(token)}?base64_encoded=false`;
  const res = await fetch(url, { method: "GET", headers: authHeaders(cfg) });
  if (!res.ok) {
    const text = await res.text();
    throw new Judge0Error(`getResult failed (${res.status}): ${text}`);
  }
  const json: any = await res.json();
  const runtimeMs = json?.time ? Math.round(parseFloat(json.time) * 1000) : null;
  return {
    token,
    statusId: json?.status?.id ?? null,
    statusDescription: json?.status?.description ?? null,
    stdout: json?.stdout ?? null,
    stderr: json?.stderr ?? null,
    compileOutput: json?.compile_output ?? null,
    runtimeMs,
    memoryKb: json?.memory ?? null,
  };
}

/**
 * Submit + poll until completion. Returns once the status leaves
 * "In Queue" / "Processing" (id 1 or 2), or when the timeout elapses.
 */
export async function submitAndWait(
  input: Judge0SubmitInput & { timeoutMs?: number },
): Promise<Judge0Result> {
  const timeoutMs = input.timeoutMs ?? 15000;
  const { token } = await submit(input);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await getResult(token);
    if (result.statusId !== null && result.statusId !== 1 && result.statusId !== 2) {
      return result;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  // Timed out — return whatever the last poll saw so the caller can
  // persist the in-progress state rather than throwing away the run.
  return getResult(token);
}

export const judge0Client = {
  JUDGE0_LANGUAGE_IDS,
  submit,
  getResult,
  submitAndWait,
};
