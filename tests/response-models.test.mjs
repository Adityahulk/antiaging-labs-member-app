import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const root=new URL("../",import.meta.url);const source=await readFile(new URL("lib/response-models.ts",root),"utf8");const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;const modelModule=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("target response model uses temporal holdout, calibrated intervals, and subgroup reporting",()=>{const noise=[-5,-4,-3,-2,-1,0,1,2,3,4];const rows=Array.from({length:80},(_,index)=>{const baseline=70+(index%12);const adherence=.55+(index%8)*.05;const quality=.8+(index%4)*.04;return{features:[baseline,adherence,quality],target:-.18*baseline+9*adherence+noise[index%noise.length],subgroup:index%2?"TG":"KA",observedAt:new Date(Date.UTC(2025,0,index+1)).toISOString()}});const model=modelModule.trainAndValidateResponseModel(rows);assert.equal(model.metrics.n,80);assert.equal(model.metrics.testN,20);assert.ok(model.metrics.mae<6);assert.ok(model.calibration.coverage>=.65&&model.calibration.coverage<=.95);assert.equal(model.subgroups.TG.n,10);assert.equal(model.subgroups.KA.n,10);assert.equal(model.eligible,true);});

test("member prediction abstains for unvalidated, missing, and out-of-range inputs",()=>{const model={status:"collecting",coefficients:[0,1],featureRanges:[{min:0,max:10}],calibration:{residualRadius:2,coverage:.8}};assert.equal(modelModule.applyResponseModel(model,[5]).status,"abstained");model.status="validated";assert.match(modelModule.applyResponseModel(model,[null]).reason,/missing/);assert.match(modelModule.applyResponseModel(model,[20]).reason,/outside/);assert.deepEqual(modelModule.applyResponseModel(model,[5]),{status:"estimated",estimate:5,lower:3,upper:7,confidence:.8});});

test("prospective publication gate rejects underpowered, miscalibrated, or disparate evaluations",()=>{assert.equal(modelModule.prospectiveValidationGate({n:45,mae:2.2,coverage:.8,maxSubgroupMaeRatio:1.2},2).passed,true);const failed=modelModule.prospectiveValidationGate({n:18,mae:4,coverage:.99,maxSubgroupMaeRatio:2.1},2);assert.equal(failed.passed,false);assert.equal(failed.reasons.length,4);});
