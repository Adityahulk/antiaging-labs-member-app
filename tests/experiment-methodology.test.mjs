import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const source = await readFile(new URL("lib/phase3.ts", root), "utf8");
const isolated = source.replace(
  'import { getDatabase, id, nowIso, parseJson } from "./database";',
  'const getDatabase=()=>{throw new Error("database not available in methodology test")}; const id=()=>"test"; const nowIso=()=>new Date(0).toISOString(); const parseJson=(value,fallback)=>{if(typeof value!=="string")return fallback;try{return JSON.parse(value)}catch{return fallback}};',
);
const compiled = ts.transpileModule(isolated, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const experimentModule = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

const period = (arm, value, offset = 0) => ({
  arm,
  completed: 1,
  adherence: 1,
  outcome_value: value + offset,
  context_json: "{}",
});

test("templates carry design, eligibility, data, direction, minimum-day, and confounder metadata", () => {
  for (const template of experimentModule.experimentTemplates) {
    assert.ok(template.methodology.designType);
    assert.ok(template.methodology.eligibility.exclusions.length);
    assert.ok(template.methodology.dataRequirements.description);
    assert.ok(template.methodology.minimumUsableDays.perArm >= 7);
    assert.ok(template.methodology.confounders.length);
    assert.equal(template.methodology.interpretation.causalClaimAllowed, false);
  }
});

test("higher-is-better outcomes interpret a sufficiently supported positive B-minus-A effect in favor of B", () => {
  const periods = [
    ...Array.from({ length: 7 }, (_, index) => period("A", 390, index % 2)),
    ...Array.from({ length: 7 }, (_, index) => period("B", 430, index % 2)),
  ];
  const result = experimentModule.analyseExperimentPeriods("caffeine_cutoff", periods);
  assert.equal(result.outcomeDirection, "higher_is_better");
  assert.equal(result.sufficientData, true);
  assert.equal(result.favoredArm, "B");
  assert.equal(result.interpretationStatus, "possible_signal");
  assert.match(result.conclusion, /possible favorable signal/i);
  assert.match(result.conclusion, /does not establish/i);
});

test("lower-is-better outcomes interpret a negative B-minus-A effect in favor of B", () => {
  const periods = [
    ...Array.from({ length: 7 }, (_, index) => period("A", 145, index % 2)),
    ...Array.from({ length: 7 }, (_, index) => period("B", 120, index % 2)),
  ];
  const result = experimentModule.analyseExperimentPeriods("recovery_walk", periods);
  assert.equal(result.outcomeDirection, "lower_is_better");
  assert.ok(result.effect < 0);
  assert.equal(result.favoredArm, "B");
  assert.equal(result.interpretationStatus, "possible_signal");
});

test("three usable days per arm remain insufficient and produce no interval or verdict", () => {
  const periods = [
    ...Array.from({ length: 3 }, (_, index) => period("A", 390, index)),
    ...Array.from({ length: 3 }, (_, index) => period("B", 430, index)),
  ];
  const result = experimentModule.analyseExperimentPeriods("caffeine_cutoff", periods);
  assert.equal(result.sufficientData, false);
  assert.equal(result.interpretationStatus, "insufficient_data");
  assert.equal(result.interval, null);
  assert.equal(result.favoredArm, null);
  assert.match(result.conclusion, /at least 7 usable days in each routine/i);
  assert.doesNotMatch(result.conclusion, /routine b was better/i);
});

test("post-meal walk requires meal-linked glucose rather than resting heart rate", () => {
  const template = experimentModule.experimentTemplates.find((item) => item.code === "recovery_walk");
  assert.equal(template.availability, "requires_specialized_data");
  assert.equal(template.outcome, "postprandial_glucose_auc");
  assert.equal(template.methodology.dataRequirements.source, "observations");
  assert.equal(template.methodology.outcome.direction, "lower_is_better");
  assert.notEqual(template.outcome, "resting_hr");
});
