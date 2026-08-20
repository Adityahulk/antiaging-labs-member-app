import { getDatabase, id, nowIso, parseJson } from "@/lib/database";
import { getMemberIdentity } from "@/lib/member";
import { ensureMemberSeed } from "@/lib/seed";
import { hmacHex } from "@/lib/integrations";
import { aiGatewayStatus, runAI } from "@/lib/ai-gateway";

const chatSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    answer: { type: "string" },
    groundingRefs: { type: "array", items: { type: "string" }, maxItems: 12 },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    escalate: { type: "boolean" },
  },
  required: ["answer", "groundingRefs", "confidence", "escalate"],
} as const;

function fallbackAnswer(question: string, context: { strategy: string; apob: string; hrv: string }) {
  const q = question.toLowerCase();
  if (q.includes("workout") || q.includes("training") || q.includes("zone")) return `Choose the lighter Zone 2 session today: 30–35 minutes near the lower end of your prescribed range. Your HRV is ${context.hrv}, so the aim is to keep momentum without adding a hard load.`;
  if (q.includes("eat") || q.includes("meal") || q.includes("lunch")) return "Use a protein-led plate: 150–180 g lean protein, two vegetable portions, one measured whole-grain or dal serving, and curd or raita. This supports the current metabolic priority without changing your approved protocol.";
  if (q.includes("apob") || q.includes("cholesterol")) return `Your latest ApoB is ${context.apob}. The active protocol connects it to soluble fibre, selected fat substitutions, aerobic training, and the planned retest so we can measure response.`;
  if (q.includes("sleep") || q.includes("recovery")) return `Recovery is temporarily below your baseline (HRV ${context.hrv}). Keep the normal sleep window, caffeine cutoff, and wind-down sequence tonight; use the lighter training option today.`;
  return `Using your current Twin and protocol, the main strategy is to ${context.strategy.toLowerCase()} Tell me whether you want a specific action for today, an explanation of a result, or a weekly-plan option.`;
}

export async function GET() {
  const identity = await getMemberIdentity();
  await ensureMemberSeed(identity);
  const db = await getDatabase();
  const rows = await db.prepare("SELECT id, role, content, sources_json, created_at FROM chat_messages WHERE member_id = ? AND conversation_id = 'default' ORDER BY created_at").bind(identity.id).all<Record<string, unknown>>();
  return Response.json(rows.results.map((row) => ({ id: row.id, role: row.role, text: row.content, data: parseJson(row.sources_json, []), createdAt: row.created_at })));
}

export async function POST(request: Request) {
  const identity = await getMemberIdentity();
  await ensureMemberSeed(identity);
  const body = await request.json() as { message?: string };
  const message = body.message?.trim();
  if (!message || message.length > 2000) return Response.json({ error: "Enter a message up to 2,000 characters" }, { status: 400 });
  const db = await getDatabase();
  const [protocol, apob, hrv, snapshot, domains, actions, intake, findings, genetics] = await Promise.all([
    db.prepare("SELECT strategy FROM protocol_versions WHERE member_id = ? AND status = 'current' ORDER BY version DESC LIMIT 1").bind(identity.id).first<{ strategy: string }>(),
    db.prepare("SELECT value_number, unit FROM observations WHERE member_id = ? AND concept_code = 'apob' ORDER BY effective_at DESC LIMIT 1").bind(identity.id).first<{ value_number: number; unit: string }>(),
    db.prepare("SELECT value_number, unit FROM observations WHERE member_id = ? AND concept_code = 'hrv_rmssd_28d' ORDER BY effective_at DESC LIMIT 1").bind(identity.id).first<{ value_number: number; unit: string }>(),
    db.prepare("SELECT id, version, summary, as_of FROM twin_snapshots WHERE member_id=? ORDER BY version DESC LIMIT 1").bind(identity.id).first<Record<string,unknown>>(),
    db.prepare("SELECT label,state_label,trend,confidence,key_metric,key_value,key_unit,target FROM twin_domains WHERE member_id=? AND snapshot_id=(SELECT id FROM twin_snapshots WHERE member_id=? ORDER BY version DESC LIMIT 1) ORDER BY id").bind(identity.id,identity.id).all(),
    db.prepare("SELECT domain,scheduled_time,title,detail,reason,target,done FROM protocol_actions WHERE member_id=? AND protocol_id=(SELECT id FROM protocol_versions WHERE member_id=? AND status='current' ORDER BY version DESC LIMIT 1) ORDER BY sort_order").bind(identity.id,identity.id).all(),
    db.prepare("SELECT question_code,answer_json FROM intake_answers WHERE member_id=?").bind(identity.id).all(),
    db.prepare("SELECT id,domain_code,title,statement,confidence,layers_json,method_version FROM cross_modal_findings WHERE member_id=? AND snapshot_id=(SELECT id FROM twin_snapshots WHERE member_id=? ORDER BY version DESC LIMIT 1) ORDER BY confidence DESC").bind(identity.id,identity.id).all(),
    db.prepare("SELECT id,gene,rsid,title,summary,evidence_level FROM genomic_interpretations WHERE member_id=? AND status='released' ORDER BY gene").bind(identity.id).all(),
  ]);
  const context = { strategy: protocol?.strategy ?? "build consistency", apob: `${apob?.value_number ?? "—"} ${apob?.unit ?? ""}`.trim(), hrv: `${hrv?.value_number ?? "—"} ${hrv?.unit ?? ""}`.trim() };
  const safety = classifyQuestion(message); const toolCalls=[{tool:"get_current_twin",fields:["snapshot","domains","crossModal"]},{tool:"get_active_protocol",fields:["strategy","actions"]},{tool:"get_member_context",fields:["intake"]},{tool:"get_released_genetics",fields:["gene","rsid","summary","evidenceLevel"]}];const grounding = { snapshot, domains: domains.results, crossModal:findings.results.map((row)=>({...row,layers_json:parseJson((row as Record<string,unknown>).layers_json,[])})), actions: actions.results, intake: intake.results.map((row)=>({question:(row as Record<string,unknown>).question_code,answer:parseJson((row as Record<string,unknown>).answer_json,null)})), releasedGenetics:genetics.results, keyMetrics: context, toolCalls };
  let answer = safety.escalate ? safety.answer : fallbackAnswer(message, context);
  let answerModel = "grounded-rules-v2";
  let modelEscalated = false;
  if (aiGatewayStatus().ready && !safety.escalate) {
    try {
      const result = await runAI<{answer?:unknown;groundingRefs?:unknown;confidence?:unknown;escalate?:unknown}>({ task:"personal_health_guidance", modelClass:"fast", schema:chatSchema, schemaName:"grounded_member_answer", maxOutputTokens:1800, input:{question:message,goal:context.strategy,grounding}, instructions:"Answer only from the supplied structured grounding. Never invent measurements, variants, citations, or protocol actions. Distinguish measured values, estimates, and plans. Stay within the active protocol. If grounding is missing, stale, contradictory, or the request requires diagnosis or a treatment change, set escalate to true and explain what human review is needed. Return only the requested structured object." });
      const candidate=typeof result.data.answer==="string"?result.data.answer.trim():"";
      if(candidate&&candidate.length<=5000){answer=candidate;answerModel=`${result.provider}:${result.model}`;modelEscalated=result.data.escalate===true;}
    } catch { /* Built-in grounded response keeps chat available if the configured provider is down. */ }
  }
  const now = nowIso();
  const escalated=safety.escalate||modelEscalated;const safetyClass=modelEscalated&&!safety.escalate?"model_review":safety.classification;
  const sources = escalated ? [`Safety policy: ${safetyClass}`,"Human follow-up requested"] : [`ApoB: ${context.apob}`, `HRV: ${context.hrv}`, `Twin snapshot v${String(snapshot?.version??"—")}`, `Protocol: ${protocol?.strategy??"not published"}`,...findings.results.slice(0,2).map((row)=>`Finding: ${String((row as Record<string,unknown>).title)}`),...genetics.results.slice(0,2).map((row)=>`Reviewed genetics: ${String((row as Record<string,unknown>).gene)} ${String((row as Record<string,unknown>).rsid)}`)];
  const userMessageId=id("msg"), assistantMessageId=id("msg"); const snapshotHash=await hmacHex(identity.id,JSON.stringify(grounding));
  await db.batch([
    db.prepare("INSERT INTO chat_messages (id, member_id, conversation_id, role, content, sources_json, created_at) VALUES (?, ?, 'default', 'user', ?, '[]', ?)").bind(userMessageId, identity.id, message, now),
    db.prepare("INSERT INTO chat_messages (id, member_id, conversation_id, role, content, sources_json, created_at) VALUES (?, ?, 'default', 'assistant', ?, ?, ?)").bind(assistantMessageId, identity.id, answer, JSON.stringify(sources), new Date(Date.now() + 1).toISOString()),
    db.prepare("INSERT INTO chat_audits (id,member_id,message_id,snapshot_hash,fields_json,grounding_json,model,policy_version,safety_class,outcome,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").bind(id("chataudit"),identity.id,assistantMessageId,snapshotHash,JSON.stringify(toolCalls),JSON.stringify({sources,refs:{snapshotId:snapshot?.id??null,findingIds:findings.results.map((row)=>(row as Record<string,unknown>).id),geneticInterpretationIds:genetics.results.map((row)=>(row as Record<string,unknown>).id)}}),answerModel,"member-guide-v2",safetyClass,escalated?"escalated":"answered",now),
  ]);
  return Response.json({ role: "assistant", text: answer, data: sources });
}

export function classifyQuestion(message:string){const q=message.toLowerCase();const high=["chest pain","can't breathe","cannot breathe","fainting","suicide","self harm","kill myself","overdose","severe bleeding","stroke symptoms","anaphylaxis"];if(high.some(term=>q.includes(term)))return{classification:"urgent",escalate:true,answer:"This could need immediate help. Contact local emergency services now or go to the nearest emergency department. I’ve kept this message in your history so the support team can follow up."};const review=["stop my medicine","change my medication","increase dose","decrease dose","pregnant","breastfeeding","new supplement dose","start a supplement","diagnose me","treat my","kidney failure","liver failure","pathogenic variant","critical result"];if(review.some(term=>q.includes(term)))return{classification:"human_review",escalate:true,answer:"I can explain your existing data and plan, but this needs a qualified human review before changing anything. I’ve flagged the question for follow-up; keep your current plan unchanged until then."};return{classification:"wellness",escalate:false,answer:""};}
