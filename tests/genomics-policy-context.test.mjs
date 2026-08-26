import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const source = await readFile(new URL("lib/genomics.ts", root), "utf8");
const isolated = source.replace('import { getDatabase, id, nowIso } from "./database";', 'const getDatabase=()=>{throw new Error("database not available in policy test")}; const id=()=>"test"; const nowIso=()=>new Date(0).toISOString();');
const compiled = ts.transpileModule(isolated, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const genomics = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("research and context-only findings are permanently blocked from direct actions", () => {
  const view = genomics.buildGenomicsPolicyView({ gene: "FTO", evidence_level: "context_only", status: "released", created_at: "2026-08-26T00:00:00.000Z" });
  assert.equal(view.canCreateAction, false);
  assert.equal(view.actionPolicy, "hypothesis_only");
  assert.equal(view.evidenceLabel, "Research/context only");
  assert.match(view.whatThisChanges, /does not change diet or training actions/i);
  assert.ok(view.limitations.some((item) => /cannot directly create an action/i.test(item)));
});

test("unreleased and review-required findings remain review gated", () => {
  const view = genomics.buildGenomicsPolicyView({ gene: "APOE", evidence_level: "review_required", status: "draft" });
  assert.equal(view.canCreateAction, false);
  assert.equal(view.actionPolicy, "review_required");
  assert.match(view.whatThisChanges, /reviewer release is required/i);
  assert.ok(view.wouldClarify.some((item) => /ApoB/i.test(item)));
});

test("related phenotype is expressed, not expressed, or unknown only when a supported signal exists", () => {
  const finding = { gene: "VDR", evidence_level: "context_only", status: "released" };
  const expressed = genomics.buildGenomicsPolicyView(finding, { vitamin_d: { value: 22, unit: "ng/mL", effectiveAt: "2026-08-01" } });
  const notExpressed = genomics.buildGenomicsPolicyView(finding, { vitamin_d: { value: 42, unit: "ng/mL", effectiveAt: "2026-08-01" } });
  const unknown = genomics.buildGenomicsPolicyView(finding, {});
  assert.equal(expressed.phenotype.status, "expressed");
  assert.equal(notExpressed.phenotype.status, "not_expressed");
  assert.equal(unknown.phenotype.status, "unknown");
  assert.match(expressed.phenotype.basis, /not a diagnosis or proof/i);
});

test("every policy view carries evidence, limitations, clarification, and reanalysis metadata", () => {
  const view = genomics.buildGenomicsPolicyView({ gene: "CYP1A2", evidence_level: "context_only", status: "released", created_at: "2026-08-20T10:00:00.000Z" });
  assert.match(view.hypothesis, /caffeine/i);
  assert.ok(view.wouldClarify.length >= 3);
  assert.ok(view.limitations.length >= 2);
  assert.equal(view.reanalysis.policyVersion, genomics.GENOMICS_POLICY_VERSION);
  assert.equal(view.reanalysis.lastAnalysedAt, "2026-08-20T10:00:00.000Z");
});
