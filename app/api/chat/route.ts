import { env } from "cloudflare:workers";
import { getDatabase, id, nowIso, parseJson } from "@/lib/database";
import { getMemberIdentity } from "@/lib/member";
import { ensureMemberSeed } from "@/lib/seed";

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
  const [protocol, apob, hrv] = await Promise.all([
    db.prepare("SELECT strategy FROM protocol_versions WHERE member_id = ? AND status = 'current' ORDER BY version DESC LIMIT 1").bind(identity.id).first<{ strategy: string }>(),
    db.prepare("SELECT value_number, unit FROM observations WHERE member_id = ? AND concept_code = 'apob' ORDER BY effective_at DESC LIMIT 1").bind(identity.id).first<{ value_number: number; unit: string }>(),
    db.prepare("SELECT value_number, unit FROM observations WHERE member_id = ? AND concept_code = 'hrv_rmssd_28d' ORDER BY effective_at DESC LIMIT 1").bind(identity.id).first<{ value_number: number; unit: string }>(),
  ]);
  const context = { strategy: protocol?.strategy ?? "build consistency", apob: `${apob?.value_number ?? "—"} ${apob?.unit ?? ""}`.trim(), hrv: `${hrv?.value_number ?? "—"} ${hrv?.unit ?? ""}`.trim() };
  const bindings = env as unknown as { AI_GATEWAY_URL?: string; AI_GATEWAY_TOKEN?: string };
  let answer = fallbackAnswer(message, context);
  if (bindings.AI_GATEWAY_URL) {
    try {
      const response = await fetch(bindings.AI_GATEWAY_URL, { method: "POST", headers: { "Content-Type": "application/json", ...(bindings.AI_GATEWAY_TOKEN ? { Authorization: `Bearer ${bindings.AI_GATEWAY_TOKEN}` } : {}) }, body: JSON.stringify({ message, member: { id: identity.id, goal: context.strategy }, context }) });
      if (response.ok) answer = ((await response.json()) as { answer?: string }).answer || answer;
    } catch { /* Built-in grounded response keeps chat available if the configured provider is down. */ }
  }
  const now = nowIso();
  const sources = [`ApoB: ${context.apob}`, `HRV: ${context.hrv}`, "Current protocol"];
  await db.batch([
    db.prepare("INSERT INTO chat_messages (id, member_id, conversation_id, role, content, sources_json, created_at) VALUES (?, ?, 'default', 'user', ?, '[]', ?)").bind(id("msg"), identity.id, message, now),
    db.prepare("INSERT INTO chat_messages (id, member_id, conversation_id, role, content, sources_json, created_at) VALUES (?, ?, 'default', 'assistant', ?, ?, ?)").bind(id("msg"), identity.id, answer, JSON.stringify(sources), new Date(Date.now() + 1).toISOString()),
  ]);
  return Response.json({ role: "assistant", text: answer, data: sources });
}
