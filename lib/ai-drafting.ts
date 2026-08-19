import { getDatabase, id, nowIso } from "./database";
import { runtimeConfig } from "./integrations";

export const AI_DRAFT_PROMPT_VERSION = "member-os-drafting-v2";
export const AI_DRAFT_POLICY_VERSION = "structured-grounding-v2";

async function sha256(value:string){const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return Array.from(new Uint8Array(digest)).map((byte)=>byte.toString(16).padStart(2,"0")).join("");}

function sanitiseOutput(value:unknown,fallback:Record<string,unknown>,allowedRefs:string[]){if(!value||typeof value!=="object")return fallback;const output=value as Record<string,unknown>;const refs=Array.isArray(output.groundingRefs)?output.groundingRefs.filter((ref):ref is string=>typeof ref==="string"&&allowedRefs.includes(ref)):[];return{...fallback,...output,groundingRefs:refs.slice(0,30)};}

export async function runAiDraft(input:{memberId:string;task:"genetics_report"|"cross_modal_report"|"protocol";entityType:string;entityId:string;structuredInput:Record<string,unknown>;inputRefs:string[];fallback:Record<string,unknown>}){
  const db=await getDatabase();const config=runtimeConfig();const createdAt=nowIso();const runId=id("aidraft");const inputHash=await sha256(JSON.stringify(input.structuredInput));let output=input.fallback;let model="deterministic-structured-v2";let status="completed";let error:string|null=null;
  if(config.AI_GATEWAY_URL){try{const response=await fetch(config.AI_GATEWAY_URL,{method:"POST",headers:{"Content-Type":"application/json",...(config.AI_GATEWAY_TOKEN?{Authorization:`Bearer ${config.AI_GATEWAY_TOKEN}`}:{})},body:JSON.stringify({task:input.task,input:input.structuredInput,allowedGroundingRefs:input.inputRefs,outputContract:{summary:"string",priorities:[{title:"string",explanation:"string",groundingRefs:["allowed id"]}],limitations:["string"],groundingRefs:["allowed id"]},instructions:"Write a concise draft from supplied structured facts only. Preserve uncertainty. Do not invent measurements, variants, evidence grades, or references. Every factual priority must cite an allowed grounding reference."})});if(!response.ok)throw new Error(`AI gateway ${response.status}`);const value=await response.json();output=sanitiseOutput(value,input.fallback,input.inputRefs);model="configured-ai-gateway";}catch(caught){error=caught instanceof Error?caught.message:"AI gateway failed";status="fallback_completed";}}
  await db.prepare("INSERT INTO ai_draft_runs (id,member_id,task,entity_type,entity_id,input_hash,input_refs_json,model,prompt_version,policy_version,output_json,status,error,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(runId,input.memberId,input.task,input.entityType,input.entityId,inputHash,JSON.stringify(input.inputRefs),model,AI_DRAFT_PROMPT_VERSION,AI_DRAFT_POLICY_VERSION,JSON.stringify(output),status,error,createdAt).run();return{id:runId,model,status,error,output,inputHash};
}

