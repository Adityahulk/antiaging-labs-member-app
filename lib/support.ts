import { getDatabase, id, nowIso } from "./database";

export const supportCategories = ["account", "data", "billing", "technical", "safety", "general"] as const;
export type SupportCategory = typeof supportCategories[number];
export type SupportUrgency = "normal" | "priority" | "urgent";

export async function createSupportTicket(input: {
  memberId: string; category: SupportCategory; urgency: SupportUrgency; subject: string; message: string; source: "member_support" | "chat_safety";
}) {
  const db = await getDatabase();
  const now = nowIso();
  if (input.source === "chat_safety") {
    const existing = await db.prepare("SELECT id FROM support_tickets WHERE member_id=? AND source='chat_safety' AND status IN ('open','in_progress') AND created_at >= datetime('now','-1 day') LIMIT 1").bind(input.memberId).first<{ id: string }>();
    if (existing) return { id: existing.id, duplicate: true };
  }
  const ticketId = id("support");
  await db.prepare("INSERT INTO support_tickets (id,member_id,category,urgency,subject,message,status,source,created_at,updated_at,resolved_at) VALUES (?,?,?,?,?,?, 'open',?,?,?,NULL)").bind(ticketId, input.memberId, input.category, input.urgency, input.subject, input.message, input.source, now, now).run();
  return { id: ticketId, duplicate: false };
}
