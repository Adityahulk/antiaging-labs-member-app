import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const root=new URL("../",import.meta.url);
const source=await readFile(new URL("lib/genomics.ts",root),"utf8");
const isolated=source.replace('import { getDatabase, id, nowIso } from "./database";','const getDatabase=()=>{throw new Error("database not available in parser test")}; const id=()=>"test"; const nowIso=()=>new Date(0).toISOString();');
const compiled=ts.transpileModule(isolated,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const genomicsModule=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("parses a GRCh37 raw array and extracts the supported panel",async()=>{const text=await readFile(new URL("tests/fixtures/genetics-array-grch37.txt",root),"utf8");const parsed=genomicsModule.parseGenomicsText(text,"genetics.txt");assert.equal(parsed.format,"raw_array");assert.equal(parsed.genomeBuild,"GRCh37");assert.equal(parsed.totalRecords,15);assert.equal(parsed.calledRecords,15);assert.equal(parsed.targetCalls.length,15);assert.equal(parsed.warnings.length,0);});

test("parses VCF genotype alleles and preserves filtered and no-call states",async()=>{const text=await readFile(new URL("tests/fixtures/genetics-small-grch38.vcf",root),"utf8");const parsed=genomicsModule.parseGenomicsText(text,"synthetic.vcf");assert.equal(parsed.format,"vcf");assert.equal(parsed.genomeBuild,"GRCh38");assert.equal(parsed.sampleId,"SYNTHETIC");assert.equal(parsed.totalRecords,6);assert.equal(parsed.calledRecords,4);assert.equal(parsed.filteredRecords,1);assert.equal(parsed.noCalls,1);assert.equal(parsed.targetCalls.find((item)=>item.rsid==="rs429358").genotype,"T/C");assert.equal(parsed.targetCalls.find((item)=>item.rsid==="rs762551").callState,"filtered");assert.equal(parsed.targetCalls.find((item)=>item.rsid==="rs1815739").callState,"no_call");assert.ok(parsed.warnings.some((item)=>item.includes("call rate")));});

test("does not collapse phase-ambiguous APOE component calls",()=>{assert.deepEqual(genomicsModule.possibleApoeDiplotypes("CT","CC"),["ε3/ε4"]);assert.deepEqual(new Set(genomicsModule.possibleApoeDiplotypes("CT","CT")),new Set(["ε1/ε3","ε2/ε4"]));});
