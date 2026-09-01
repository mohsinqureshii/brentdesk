/**
 * LLM Provider Abstraction Layer
 * Supports multiple LLM providers: Built-in (Manus), OpenAI, Anthropic, Google, DeepSeek, Mistral
 * Provides unified interface with automatic failover, cost tracking, and usage logging
 */
import { invokeLLM, type Message } from "../../_core/llm";
import { getDb } from "../../db";
import { settings, aiLlmUsageLogs } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";

// ============================================================
// TYPES
// ============================================================

export type LLMProvider = "builtin" | "openai" | "anthropic" | "google" | "deepseek" | "mistral";

export interface LLMModel {
  id: string;
  name: string;
  provider: LLMProvider;
  contextWindow: number;
  maxOutput: number;
  costPer1kInput: number; // USD per 1k input tokens
  costPer1kOutput: number; // USD per 1k output tokens
  supportsJson: boolean;
  supportsVision: boolean;
  tier: "premium" | "standard" | "economy";
}

export interface LLMProviderConfig {
  provider: LLMProvider;
  apiKey: string;
  baseUrl?: string;
  isActive: boolean;
  priority: number; // Lower = higher priority for failover
}

export interface LLMRequest {
  messages: Message[];
  provider?: LLMProvider;
  model?: string;
  responseFormat?: any;
  temperature?: number;
  maxTokens?: number;
  sessionId?: number;
  operation?: string;
}

export interface LLMResponse {
  content: string;
  provider: LLMProvider;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  latencyMs: number;
  estimatedCostUsd: string;
  raw?: any;
}

// ============================================================
// MODEL REGISTRY
// ============================================================

export const MODEL_REGISTRY: LLMModel[] = [
  // Built-in (Manus default)
  { id: "builtin-default", name: "Built-in Default", provider: "builtin", contextWindow: 128000, maxOutput: 16384, costPer1kInput: 0, costPer1kOutput: 0, supportsJson: true, supportsVision: true, tier: "standard" },
  // OpenAI
  { id: "gpt-4o", name: "GPT-4o", provider: "openai", contextWindow: 128000, maxOutput: 16384, costPer1kInput: 0.0025, costPer1kOutput: 0.01, supportsJson: true, supportsVision: true, tier: "premium" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai", contextWindow: 128000, maxOutput: 16384, costPer1kInput: 0.00015, costPer1kOutput: 0.0006, supportsJson: true, supportsVision: true, tier: "economy" },
  { id: "gpt-4.5-preview", name: "GPT-4.5 Preview", provider: "openai", contextWindow: 128000, maxOutput: 16384, costPer1kInput: 0.075, costPer1kOutput: 0.15, supportsJson: true, supportsVision: true, tier: "premium" },
  // Anthropic (updated Feb 2026)
  { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", provider: "anthropic", contextWindow: 200000, maxOutput: 16384, costPer1kInput: 0.003, costPer1kOutput: 0.015, supportsJson: true, supportsVision: true, tier: "premium" },
  { id: "claude-3-7-sonnet-20250219", name: "Claude 3.7 Sonnet", provider: "anthropic", contextWindow: 200000, maxOutput: 16384, costPer1kInput: 0.003, costPer1kOutput: 0.015, supportsJson: true, supportsVision: true, tier: "premium" },
  { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", provider: "anthropic", contextWindow: 200000, maxOutput: 8192, costPer1kInput: 0.0008, costPer1kOutput: 0.004, supportsJson: true, supportsVision: false, tier: "standard" },
  { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku", provider: "anthropic", contextWindow: 200000, maxOutput: 4096, costPer1kInput: 0.00025, costPer1kOutput: 0.00125, supportsJson: true, supportsVision: true, tier: "economy" },
  // Google
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "google", contextWindow: 1000000, maxOutput: 8192, costPer1kInput: 0.0001, costPer1kOutput: 0.0004, supportsJson: true, supportsVision: true, tier: "economy" },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", provider: "google", contextWindow: 2000000, maxOutput: 8192, costPer1kInput: 0.00125, costPer1kOutput: 0.005, supportsJson: true, supportsVision: true, tier: "standard" },
  // DeepSeek
  { id: "deepseek-chat", name: "DeepSeek V3", provider: "deepseek", contextWindow: 64000, maxOutput: 8192, costPer1kInput: 0.00014, costPer1kOutput: 0.00028, supportsJson: true, supportsVision: false, tier: "economy" },
  { id: "deepseek-reasoner", name: "DeepSeek R1", provider: "deepseek", contextWindow: 64000, maxOutput: 8192, costPer1kInput: 0.00055, costPer1kOutput: 0.00219, supportsJson: true, supportsVision: false, tier: "standard" },
  // Mistral
  { id: "mistral-large-latest", name: "Mistral Large", provider: "mistral", contextWindow: 128000, maxOutput: 8192, costPer1kInput: 0.002, costPer1kOutput: 0.006, supportsJson: true, supportsVision: false, tier: "standard" },
  { id: "mistral-small-latest", name: "Mistral Small", provider: "mistral", contextWindow: 128000, maxOutput: 8192, costPer1kInput: 0.0001, costPer1kOutput: 0.0003, supportsJson: true, supportsVision: false, tier: "economy" },
];

// ============================================================
// PROVIDER API ENDPOINTS
// ============================================================

const PROVIDER_ENDPOINTS: Record<string, string> = {
  openai: "https://api.openai.com/v1/chat/completions",
  anthropic: "https://api.anthropic.com/v1/messages",
  google: "https://generativelanguage.googleapis.com/v1beta",
  deepseek: "https://api.deepseek.com/v1/chat/completions",
  mistral: "https://api.mistral.ai/v1/chat/completions",
};

// ============================================================
// SETTINGS MANAGEMENT
// ============================================================

const SETTINGS_KEY = "ai_llm_providers";

export async function getLLMProviderConfigs(): Promise<LLMProviderConfig[]> {
  try {
    const database = await getDb();
    if (!database) return [{ provider: "builtin", apiKey: "", isActive: true, priority: 0 }];
    
    const [row] = await database.select().from(settings).where(eq(settings.key, SETTINGS_KEY));
    if (!row || !row.value) return [{ provider: "builtin", apiKey: "", isActive: true, priority: 0 }];
    
    const configs = row.value as LLMProviderConfig[];
    // Always ensure builtin is available
    if (!configs.find(c => c.provider === "builtin")) {
      configs.unshift({ provider: "builtin", apiKey: "", isActive: true, priority: 0 });
    }
    return configs;
  } catch {
    return [{ provider: "builtin", apiKey: "", isActive: true, priority: 0 }];
  }
}

export async function saveLLMProviderConfigs(configs: LLMProviderConfig[]): Promise<void> {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  const [existing] = await database.select().from(settings).where(eq(settings.key, SETTINGS_KEY));
  if (existing) {
    await database.update(settings).set({ value: configs as any } as any).where(eq(settings.key, SETTINGS_KEY));
  } else {
    await database.insert(settings).values({
      key: SETTINGS_KEY,
      value: configs as any,
      type: "json",
      group: "ai",
      label: "LLM Provider Configurations",
      description: "API keys and settings for AI content generation providers",
      isPublic: 0,
    } as any);
  }
}

export function getAvailableModels(configs: LLMProviderConfig[]): LLMModel[] {
  const activeProviders = new Set(configs.filter(c => c.isActive).map(c => c.provider));
  return MODEL_REGISTRY.filter(m => activeProviders.has(m.provider));
}

// ============================================================
// CORE INVOCATION
// ============================================================

async function callBuiltinLLM(request: LLMRequest): Promise<LLMResponse> {
  const start = Date.now();
  const result = await invokeLLM({
    messages: request.messages,
    response_format: request.responseFormat,
  });
  const latency = Date.now() - start;
  
  const content = result?.choices?.[0]?.message?.content || "";
  const usage = result?.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  
  return {
    content: typeof content === "string" ? content : JSON.stringify(content),
    provider: "builtin",
    model: "builtin-default",
    inputTokens: usage.prompt_tokens || 0,
    outputTokens: usage.completion_tokens || 0,
    totalTokens: usage.total_tokens || 0,
    latencyMs: latency,
    estimatedCostUsd: "0.00",
    raw: result,
  };
}

async function callOpenAICompatible(
  request: LLMRequest,
  endpoint: string,
  apiKey: string,
  provider: LLMProvider,
  model: string
): Promise<LLMResponse> {
  const start = Date.now();
  
  const body: any = {
    model,
    messages: request.messages.map(m => ({ role: m.role, content: m.content })),
  };
  if (request.temperature !== undefined) body.temperature = request.temperature;
  if (request.maxTokens) body.max_tokens = request.maxTokens;
  if (request.responseFormat) body.response_format = request.responseFormat;
  
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`${provider} API error (${response.status}): ${err}`);
  }
  
  const result = await response.json();
  const latency = Date.now() - start;
  const content = result.choices?.[0]?.message?.content || "";
  const usage = result.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  
  const modelInfo = MODEL_REGISTRY.find(m => m.id === model);
  const cost = modelInfo
    ? ((usage.prompt_tokens / 1000) * modelInfo.costPer1kInput + (usage.completion_tokens / 1000) * modelInfo.costPer1kOutput).toFixed(6)
    : "0.00";
  
  return {
    content,
    provider,
    model,
    inputTokens: usage.prompt_tokens || 0,
    outputTokens: usage.completion_tokens || 0,
    totalTokens: usage.total_tokens || 0,
    latencyMs: latency,
    estimatedCostUsd: cost,
    raw: result,
  };
}

async function callAnthropic(
  request: LLMRequest,
  apiKey: string,
  model: string
): Promise<LLMResponse> {
  const start = Date.now();
  
  // Extract system message
  const systemMsg = request.messages.find(m => m.role === "system");
  const otherMsgs = request.messages.filter(m => m.role !== "system");
  
  const body: any = {
    model,
    max_tokens: request.maxTokens || 8192,
    messages: otherMsgs.map(m => ({ role: m.role, content: m.content })),
  };
  if (systemMsg) body.system = typeof systemMsg.content === "string" ? systemMsg.content : JSON.stringify(systemMsg.content);
  if (request.temperature !== undefined) body.temperature = request.temperature;
  
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${err}`);
  }
  
  const result = await response.json();
  const latency = Date.now() - start;
  const content = result.content?.[0]?.text || "";
  const usage = result.usage || { input_tokens: 0, output_tokens: 0 };
  
  const modelInfo = MODEL_REGISTRY.find(m => m.id === model);
  const cost = modelInfo
    ? ((usage.input_tokens / 1000) * modelInfo.costPer1kInput + (usage.output_tokens / 1000) * modelInfo.costPer1kOutput).toFixed(6)
    : "0.00";
  
  return {
    content,
    provider: "anthropic",
    model,
    inputTokens: usage.input_tokens || 0,
    outputTokens: usage.output_tokens || 0,
    totalTokens: (usage.input_tokens || 0) + (usage.output_tokens || 0),
    latencyMs: latency,
    estimatedCostUsd: cost,
    raw: result,
  };
}

async function callGoogle(
  request: LLMRequest,
  apiKey: string,
  model: string
): Promise<LLMResponse> {
  const start = Date.now();
  
  const systemMsg = request.messages.find(m => m.role === "system");
  const otherMsgs = request.messages.filter(m => m.role !== "system");
  
  const contents = otherMsgs.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: typeof m.content === "string" ? m.content : JSON.stringify(m.content) }],
  }));
  
  const body: any = { contents };
  if (systemMsg) {
    body.systemInstruction = { parts: [{ text: typeof systemMsg.content === "string" ? systemMsg.content : JSON.stringify(systemMsg.content) }] };
  }
  if (request.responseFormat) {
    body.generationConfig = { responseMimeType: "application/json" };
  }
  if (request.temperature !== undefined) {
    body.generationConfig = { ...body.generationConfig, temperature: request.temperature };
  }
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Google API error (${response.status}): ${err}`);
  }
  
  const result = await response.json();
  const latency = Date.now() - start;
  const content = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const usage = result.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 };
  
  const modelInfo = MODEL_REGISTRY.find(m => m.id === model);
  const cost = modelInfo
    ? ((usage.promptTokenCount / 1000) * modelInfo.costPer1kInput + (usage.candidatesTokenCount / 1000) * modelInfo.costPer1kOutput).toFixed(6)
    : "0.00";
  
  return {
    content,
    provider: "google",
    model,
    inputTokens: usage.promptTokenCount || 0,
    outputTokens: usage.candidatesTokenCount || 0,
    totalTokens: usage.totalTokenCount || 0,
    latencyMs: latency,
    estimatedCostUsd: cost,
    raw: result,
  };
}

// ============================================================
// MAIN INVOCATION WITH FAILOVER
// ============================================================

export async function invokeLLMProvider(request: LLMRequest): Promise<LLMResponse> {
  const configs = await getLLMProviderConfigs();
  const provider = request.provider || "builtin";
  const model = request.model || (provider === "builtin" ? "builtin-default" : MODEL_REGISTRY.find(m => m.provider === provider)?.id || "");
  
  const errors: string[] = [];
  
  // Try requested provider first
  try {
    const response = await callProvider(provider, model, request, configs);
    await logUsage(request, response, true);
    return response;
  } catch (err: any) {
    errors.push(`${provider}/${model}: ${err.message}`);
    console.error(`[LLM] Primary provider ${provider}/${model} failed:`, err.message);
    // Log the failed attempt
    await logUsage(request, { content: "", provider: provider as LLMProvider, model, inputTokens: 0, outputTokens: 0, totalTokens: 0, latencyMs: 0, estimatedCostUsd: "0.00" }, false, err.message).catch(() => {});
  }
  
  // Failover to other active providers
  const fallbacks = configs
    .filter(c => c.isActive && c.provider !== provider)
    .sort((a, b) => a.priority - b.priority);
  
  for (const fallback of fallbacks) {
    const fallbackModel = MODEL_REGISTRY.find(m => m.provider === fallback.provider)?.id;
    if (!fallbackModel) continue;
    
    try {
      console.log(`[LLM] Failing over to ${fallback.provider}/${fallbackModel}`);
      const response = await callProvider(fallback.provider, fallbackModel, request, configs);
      await logUsage(request, response, true);
      return response;
    } catch (err: any) {
      errors.push(`${fallback.provider}/${fallbackModel}: ${err.message}`);
      console.error(`[LLM] Fallback ${fallback.provider} failed:`, err.message);
    }
  }
  
  // All providers failed
  const errorMsg = `All LLM providers failed: ${errors.join("; ")}`;
  await logUsage(request, null, false, errorMsg);
  throw new Error(errorMsg);
}

async function callProvider(
  provider: LLMProvider,
  model: string,
  request: LLMRequest,
  configs: LLMProviderConfig[]
): Promise<LLMResponse> {
  if (provider === "builtin") {
    return callBuiltinLLM(request);
  }
  
  const config = configs.find(c => c.provider === provider);
  if (!config || !config.apiKey) {
    throw new Error(`No API key configured for ${provider}`);
  }
  
  if (provider === "anthropic") {
    return callAnthropic(request, config.apiKey, model);
  }
  
  if (provider === "google") {
    return callGoogle(request, config.apiKey, model);
  }
  
  // OpenAI-compatible: openai, deepseek, mistral
  const endpoint = config.baseUrl || PROVIDER_ENDPOINTS[provider];
  if (!endpoint) throw new Error(`No endpoint for provider ${provider}`);
  
  return callOpenAICompatible(request, endpoint, config.apiKey, provider, model);
}

// ============================================================
// USAGE LOGGING
// ============================================================

async function logUsage(
  request: LLMRequest,
  response: LLMResponse | null,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  try {
    const database = await getDb();
    if (!database) return;
    
    await database.insert(aiLlmUsageLogs).values({
      sessionId: request.sessionId || null,
      provider: response?.provider || request.provider || "builtin",
      model: response?.model || request.model || "unknown",
      operation: request.operation || "general",
      inputTokens: response?.inputTokens || 0,
      outputTokens: response?.outputTokens || 0,
      totalTokens: response?.totalTokens || 0,
      latencyMs: response?.latencyMs || 0,
      estimatedCostUsd: response?.estimatedCostUsd || "0.00",
      success: success ? 1 : 0,
      errorMessage: errorMessage || null,
    } as any);
  } catch (err) {
    console.error("[LLM] Failed to log usage:", err);
  }
}

// ============================================================
// HELPERS
// ============================================================

export function getModelInfo(modelId: string): LLMModel | undefined {
  return MODEL_REGISTRY.find(m => m.id === modelId);
}

export function getModelsForProvider(provider: LLMProvider): LLMModel[] {
  return MODEL_REGISTRY.filter(m => m.provider === provider);
}

export function estimateCost(modelId: string, inputTokens: number, outputTokens: number): string {
  const model = getModelInfo(modelId);
  if (!model) return "0.00";
  return ((inputTokens / 1000) * model.costPer1kInput + (outputTokens / 1000) * model.costPer1kOutput).toFixed(6);
}
