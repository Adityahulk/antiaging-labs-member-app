import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const source = await readFile(new URL("lib/twin-engine.ts", root), "utf8");
const isolated = source
  .replace('import { getDatabase, id, nowIso } from "./database";', 'const getDatabase=()=>{throw new Error("database not available in Twin policy test")}; const id=()=>"test"; const nowIso=()=>new Date(0).toISOString();')
  .replace('import { buildCrossModalFindings } from "./cross-modal";', "const buildCrossModalFindings=async()=>[];")
  .replace('import { buildGenomicsPolicyView, type PhenotypeSignal } from "./genomics";', 'const buildGenomicsPolicyView=()=>({phenotype:{status:"unknown"}});');
const compiled = ts.transpileModule(isolated, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const twin = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

const draft = (overrides = {}) => ({
  code: "sleep", label: "Sleep", sufficientData: false, proposedTrend: "improving", proposedConfidence: .91,
  readiness: .25, freshness: "no data", metric: "Sleep", value: "—", unit: "", target: "Collect baseline",
  score: 92, evidence: [], missing: ["baseline"], unknowns: ["trend unknown"], change: "No comparison",
  nextLearningStep: "Collect baseline", inheritedContext: [], ...overrides,
});

test("insufficient data cannot produce a reassuring number, state, trend, or confidence", () => {
  const domain = twin.finalizeTwinDomain(draft());
  assert.equal(domain.score, null);
  assert.equal(domain.status, "unknown");
  assert.equal(domain.state, "Data needed");
  assert.equal(domain.trend, "unknown");
  assert.ok(domain.confidence < .5);
});

test("a score is exposed only after the domain declares its minimum data sufficient", () => {
  const domain = twin.finalizeTwinDomain(draft({ sufficientData: true, score: 84, proposedTrend: "stable", proposedConfidence: .82, readiness: 1 }));
  assert.equal(domain.score, 84);
  assert.equal(domain.status, "optimizing");
  assert.equal(domain.state, "Strong");
  assert.equal(domain.trend, "stable");
});

test("a Twin with no measured domains describes active learning instead of inventing a priority", () => {
  const domains = [twin.finalizeTwinDomain(draft()), twin.finalizeTwinDomain(draft({ code: "cardiovascular", label: "Cardiovascular" }))];
  const summary = twin.summarizeTwinDomains(domains, 0);
  assert.match(summary, /establishing its evidence foundation/i);
  assert.match(summary, /never creates an action by itself/i);
  assert.doesNotMatch(summary, /leading focus/i);
});

test("Twin UI has no fallback numerical score and labels DNA as hypothesis-only", async () => {
  const ui = await readFile(new URL("components/twin-experience.tsx", root), "utf8");
  assert.doesNotMatch(ui, /score\s*\?\?\s*70/);
  assert.match(ui, /DNA generates hypotheses/i);
  assert.match(ui, /never increases a domain score/i);
  assert.match(ui, /Unknown · data needed/);
});
