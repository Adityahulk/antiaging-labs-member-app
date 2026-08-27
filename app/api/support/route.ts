import { requireIdentity } from "@/lib/authz";
import { getDatabase } from "@/lib/database";
import { createSupportTicket, supportCategories, type SupportCategory, type SupportUrgency } from "@/lib/support";

export async function GET() {
  const identity = await requireIdentity(); const db = await getDatabase();
  const rows = await db.prepare("SELECT id,category,urgency,subject,status,source,created_at,updated_at FROM support_tickets WHERE member_id=? ORDER BY created_at DESC LIMIT 30").bind(identity.id).all();
  return Response.json(rows.results);
}

export async function POST(request: Request) {
  const identity = await requireIdentity(); const body = await request.json().catch(() => ({})) as { category?: string; urgency?: string; subject?: string; message?: string };
  const category = body.category as SupportCategory; const urgency = body.urgency as SupportUrgency;
  const subject = body.subject?.trim() ?? ""; const message = body.message?.trim() ?? "";
  if (!supportCategories.includes(category) || !["normal", "priority"].includes(urgency) || subject.length < 3 || subject.length > 160 || message.length < 10 || message.length > 4000) return Response.json({ error: "Choose a category and add a clear subject and message." }, { status: 400 });
  const ticket = await createSupportTicket({ memberId: identity.id, category, urgency: category === "safety" ? "priority" : urgency, subject, message, source: "member_support" });
  return Response.json(ticket, { status: 201 });
}
