import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../lib/ai-gateway-core.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const compiledModule = { exports: {} };
new Function("exports", "module", compiled)(compiledModule.exports, compiledModule);
const { boundedTimeout, buildResponsesBody, extractResponseText, isRetryableStatus, parseStructuredResponse } = compiledModule.exports;

test("builds a Responses API request with strict structured output and no provider storage", () => {
  const body = buildResponsesBody(
    { url: "https://example.test/responses", model: "model-a", label: "primary" },
    { task: "draft", instructions: "facts only", userText: "hello", schemaName: "draft", schema: { type: "object" }, file: { filename: "lab.pdf", mimeType: "application/pdf", dataBase64: "YWJj" } },
  );
  assert.equal(body.model, "model-a");
  assert.equal(body.store, false);
  assert.equal(body.text.format.strict, true);
  assert.equal(body.input[0].content[1].type, "input_file");
  assert.equal(body.input[0].content[1].file_data, "YWJj");
});

test("parses both Responses API output and JSON schemas", () => {
  const payload = { output: [{ content: [{ type: "output_text", text: '{"answer":"grounded"}' }] }] };
  assert.equal(extractResponseText(payload), '{"answer":"grounded"}');
  assert.deepEqual(parseStructuredResponse(payload), { answer: "grounded" });
  assert.throws(() => parseStructuredResponse({ output_text: "not-json" }), /invalid structured output/);
});

test("retries only transient statuses and bounds timeouts", () => {
  assert.equal(isRetryableStatus(429), true);
  assert.equal(isRetryableStatus(503), true);
  assert.equal(isRetryableStatus(400), false);
  assert.equal(boundedTimeout("100"), 5000);
  assert.equal(boundedTimeout("120000"), 90000);
});

test("all AI product paths use the central gateway", async () => {
  const root = new URL("../", import.meta.url);
  const files = await Promise.all(["lib/ai-drafting.ts", "lib/upload-processing.ts", "app/api/chat/route.ts"].map((path) => readFile(new URL(path, root), "utf8")));
  for (const contents of files) {
    assert.match(contents, /runAI/);
    assert.doesNotMatch(contents, /fetch\(.*AI_GATEWAY_URL/);
  }
});
