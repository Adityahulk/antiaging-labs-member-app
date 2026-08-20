export type JsonSchema = Record<string, unknown>;

export type AIModelClass = "fast" | "reasoning" | "vision";

export type AIEndpoint = {
  url: string;
  providerToken?: string;
  gatewayToken?: string;
  model: string;
  label: "primary" | "fallback";
};

export type ResponsesRequestInput = {
  task: string;
  instructions: string;
  userText: string;
  schema?: JsonSchema;
  schemaName?: string;
  file?: { filename: string; mimeType: string; dataBase64: string };
  metadata?: Record<string, string>;
  maxOutputTokens?: number;
  reasoningEffort?: string;
};

export function buildResponsesBody(endpoint: AIEndpoint, input: ResponsesRequestInput) {
  const content: Array<Record<string, unknown>> = [{ type: "input_text", text: input.userText }];
  if (input.file) content.push({ type: "input_file", filename: input.file.filename, file_data: input.file.dataBase64 });

  return {
    model: endpoint.model,
    store: false,
    instructions: input.instructions,
    input: [{ role: "user", content }],
    ...(input.schema ? { text: { format: { type: "json_schema", name: input.schemaName ?? "structured_response", schema: input.schema, strict: true } } } : {}),
    ...(input.maxOutputTokens ? { max_output_tokens: input.maxOutputTokens } : {}),
    ...(input.reasoningEffort ? { reasoning: { effort: input.reasoningEffort } } : {}),
    metadata: { task: input.task, ...(input.metadata ?? {}) },
  };
}

export function extractResponseText(payload: unknown): string {
  if (!payload || typeof payload !== "object") throw new Error("AI provider returned an invalid response");
  const value = payload as Record<string, unknown>;
  if (typeof value.output_text === "string" && value.output_text.trim()) return value.output_text.trim();

  if (Array.isArray(value.output)) {
    const text = value.output.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const content = (item as Record<string, unknown>).content;
      if (!Array.isArray(content)) return [];
      return content.flatMap((part) => {
        if (!part || typeof part !== "object") return [];
        const block = part as Record<string, unknown>;
        return typeof block.text === "string" ? [block.text] : [];
      });
    }).join("\n").trim();
    if (text) return text;
  }

  const choices = value.choices;
  if (Array.isArray(choices)) {
    const first = choices[0] as Record<string, unknown> | undefined;
    const message = first?.message as Record<string, unknown> | undefined;
    if (typeof message?.content === "string" && message.content.trim()) return message.content.trim();
  }

  throw new Error("AI provider returned no output text");
}

export function parseStructuredResponse(payload: unknown): Record<string, unknown> {
  const text = extractResponseText(payload);
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    return parsed as Record<string, unknown>;
  } catch {
    throw new Error("AI provider returned invalid structured output");
  }
}

export function isRetryableStatus(status: number) {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

export function boundedTimeout(value?: string) {
  const parsed = Number(value ?? 30_000);
  if (!Number.isFinite(parsed)) return 30_000;
  return Math.min(90_000, Math.max(5_000, Math.round(parsed)));
}
