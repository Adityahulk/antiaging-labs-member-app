import { getDatabase, id, nowIso } from "./database";
import { aiGatewayStatus, runAI } from "./ai-gateway";

export const AI_DRAFT_PROMPT_VERSION = "member-os-drafting-v2";
export const AI_DRAFT_POLICY_VERSION = "structured-grounding-v2";

const draftSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    priorities: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          explanation: { type: "string" },
          groundingRefs: { type: "array", items: { type: "string" } },
        },
        required: ["title", "explanation", "groundingRefs"],
      },
    },
    limitations: { type: "array", items: { type: "string" } },
    groundingRefs: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "priorities", "limitations", "groundingRefs"],
} as const;

async function sha256(value:string){const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return Array.from(new Uint8Array(digest)).map((byte)=>byte.toString(16).padStart(2,"0")).join("");}

function sanitiseOutput(value:unknown,fallback:Record<string,unknown>,allowedRefs:string[]){if(!value||typeof value!=="object")return fallback;const output=value as Record<string,unknown>;const refs=(candidate:unknown)=>Array.isArray(candidate)?candidate.filter((ref):ref is string=>typeof ref==="string"&&allowedRefs.includes(ref)).slice(0,30):[];const priorities=Array.isArray(output.priorities)?output.priorities.flatMap((candidate)=>{if(!candidate||typeof candidate!=="object")return[];const item=candidate as Record<string,unknown>;if(typeof item.title!=="string"||typeof item.explanation!=="string")return[];return[{title:item.title.slice(0,240),explanation:item.explanation.slice(0,3000),groundingRefs:refs(item.groundingRefs)}];}).slice(0,8):fallback.priorities;const limitations=Array.isArray(output.limitations)?output.limitations.filter((item):item is string=>typeof item==="string").map((item)=>item.slice(0,1200)).slice(0,20):fallback.limitations;return{...fallback,...(typeof output.summary==="string"?{summary:output.summary.slice(0,5000)}:{}),priorities,limitations,groundingRefs:refs(output.groundingRefs)};}

export async function runAiDraft(input:{memberId:string;task:"genetics_report"|"cross_modal_report"|"protocol";entityType:string;entityId:string;structuredInput:Record<string,unknown>;inputRefs:string[];fallback:Record<string,unknown>}){
  const db=await getDatabase();const createdAt=nowIso();const runId=id("aidraft");const inputHash=await sha256(JSON.stringify(input.structuredInput));let output=input.fallback;let model="deterministic-structured-v2";let status="completed";let error:string|null=null;
  if(aiGatewayStatus().ready){try{const result=await runAI({task:input.task,modelClass:"reasoning",schema:draftSchema,schemaName:"member_os_draft",maxOutputTokens:3000,input:{structuredInput:input.structuredInput,allowedGroundingRefs:input.inputRefs},instructions:"Write a concise draft from supplied structured facts only. Preserve uncertainty. Do not invent measurements, variants, evidence grades, or references. Every factual priority must cite an allowed grounding reference. Return only the requested structured object."});output=sanitiseOutput(result.data,input.fallback,input.inputRefs);model=`${result.provider}:${result.model}`;}catch(caught){error=caught instanceof Error?caught.message:"AI gateway failed";status="fallback_completed";}}
  await db.prepare("INSERT INTO ai_draft_runs (id,member_id,task,entity_type,entity_id,input_hash,input_refs_json,model,prompt_version,policy_version,output_json,status,error,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(runId,input.memberId,input.task,input.entityType,input.entityId,inputHash,JSON.stringify(input.inputRefs),model,AI_DRAFT_PROMPT_VERSION,AI_DRAFT_POLICY_VERSION,JSON.stringify(output),status,error,createdAt).run();return{id:runId,model,status,error,output,inputHash};
}
