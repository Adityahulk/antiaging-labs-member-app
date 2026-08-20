import { runtimeConfig } from "./integrations";
import { boundedTimeout, buildResponsesBody, extractResponseText, isRetryableStatus, parseStructuredResponse, type AIEndpoint, type AIModelClass, type JsonSchema } from "./ai-gateway-core";

export type AIRequest = {
  task: string;
  instructions: string;
  input: string | Record<string, unknown>;
  schema?: JsonSchema;
  schemaName?: string;
  modelClass?: AIModelClass;
  file?: { filename: string; mimeType: string; dataBase64: string };
  metadata?: Record<string, string>;
  maxOutputTokens?: number;
};

export type AIResult<T = Record<string, unknown>> = {
  data: T;
  text: string;
  provider: "primary" | "fallback";
  model: string;
  requestId: string;
  attempts: number;
  latencyMs: number;
};

export function aiGatewayStatus() {
  const config = runtimeConfig();
  const direct = !config.AI_GATEWAY_URL && Boolean(config.OPENAI_API_KEY);
  const configured = Boolean(config.AI_GATEWAY_URL || config.OPENAI_API_KEY);
  const authenticated = direct || Boolean(config.OPENAI_API_KEY || config.AI_GATEWAY_TOKEN);
  return {
    ready: configured && authenticated,
    mode: configured && authenticated ? (config.AI_GATEWAY_URL ? "gateway" : "direct-openai") : "deterministic-fallback",
    primaryModel: config.AI_PRIMARY_MODEL ?? "gpt-5.6",
    fastModel: config.AI_FAST_MODEL ?? config.AI_PRIMARY_MODEL ?? "gpt-5.6",
    visionModel: config.AI_VISION_MODEL ?? config.AI_PRIMARY_MODEL ?? "gpt-5.6",
    fallbackConfigured: Boolean(config.AI_FALLBACK_URL && config.AI_FALLBACK_TOKEN),
  } as const;
}

function endpoints(modelClass: AIModelClass): AIEndpoint[] {
  const config = runtimeConfig();
  const model = modelClass === "fast" ? config.AI_FAST_MODEL : modelClass === "vision" ? config.AI_VISION_MODEL : config.AI_PRIMARY_MODEL;
  const primaryUrl = config.AI_GATEWAY_URL || (config.OPENAI_API_KEY ? "https://api.openai.com/v1/responses" : undefined);
  const values: AIEndpoint[] = [];
  if (primaryUrl && (config.OPENAI_API_KEY || config.AI_GATEWAY_TOKEN)) values.push({
    url: primaryUrl,
    providerToken: config.OPENAI_API_KEY,
    gatewayToken: config.AI_GATEWAY_TOKEN,
    model: model ?? config.AI_PRIMARY_MODEL ?? "gpt-5.6",
    label: "primary",
  });
  if (config.AI_FALLBACK_URL && config.AI_FALLBACK_TOKEN) values.push({
    url: config.AI_FALLBACK_URL,
    providerToken: config.AI_FALLBACK_TOKEN,
    model: config.AI_FALLBACK_MODEL ?? model ?? config.AI_PRIMARY_MODEL ?? "gpt-5.6",
    label: "fallback",
  });
  return values;
}

function safeErrorMessage(caught: unknown) {
  if (caught instanceof Error && caught.name === "AbortError") return "AI request timed out";
  return caught instanceof Error ? caught.message.slice(0, 240) : "AI request failed";
}

async function pause(milliseconds: number) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function runAI<T = Record<string, unknown>>(request: AIRequest): Promise<AIResult<T>> {
  const config = runtimeConfig();
  const available = endpoints(request.modelClass ?? "reasoning");
  if (!available.length) throw new Error("AI gateway is not configured");
  const startedAt = Date.now();
  const clientRequestId = crypto.randomUUID();
  let attempts = 0;
  let lastError = "AI request failed";

  for (const endpoint of available) {
    for (let attempt = 0; attempt < 3; attempt++) {
      attempts += 1;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), boundedTimeout(config.AI_TIMEOUT_MS));
      try {
        const response = await fetch(endpoint.url, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            "X-Client-Request-Id": clientRequestId,
            ...(endpoint.providerToken ? { "Authorization": `Bearer ${endpoint.providerToken}` } : {}),
            ...(endpoint.gatewayToken ? { "cf-aig-authorization": `Bearer ${endpoint.gatewayToken}` } : {}),
          },
          body: JSON.stringify(buildResponsesBody(endpoint, {
            task: request.task,
            instructions: request.instructions,
            userText: typeof request.input === "string" ? request.input : JSON.stringify(request.input),
            schema: request.schema,
            schemaName: request.schemaName,
            file: request.file,
            metadata: { request_id: clientRequestId, ...(request.metadata ?? {}) },
            maxOutputTokens: request.maxOutputTokens,
            reasoningEffort: request.modelClass === "reasoning" ? config.AI_REASONING_EFFORT : undefined,
          })),
        });
        if (!response.ok) {
          lastError = `AI provider returned ${response.status}`;
          if (isRetryableStatus(response.status) && attempt < 2) { await pause(250 * 2 ** attempt); continue; }
          break;
        }
        const payload = await response.json();
        const text = extractResponseText(payload);
        const data = (request.schema ? parseStructuredResponse(payload) : { text }) as T;
        return { data, text, provider: endpoint.label, model: endpoint.model, requestId: response.headers.get("x-request-id") ?? clientRequestId, attempts, latencyMs: Date.now() - startedAt };
      } catch (caught) {
        lastError = safeErrorMessage(caught);
        if (attempt < 2) { await pause(250 * 2 ** attempt); continue; }
      } finally {
        clearTimeout(timeout);
      }
    }
  }
  throw new Error(lastError);
}
