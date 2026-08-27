import { requireRole } from "@/lib/authz";
import { getDatabase, nowIso } from "@/lib/database";

export async function GET() {
  await requireRole(["admin"]); const db = await getDatabase();
  const [tickets, requests] = await Promise.all([
    db.prepare("SELECT t.*,m.full_name,m.email FROM support_tickets t JOIN members m ON m.id=t.member_id ORDER BY CASE t.urgency WHEN 'urgent' THEN 0 WHEN 'priority' THEN 1 ELSE 2 END, t.created_at DESC LIMIT 100").all(),
    db.prepare("SELECT r.*,m.full_name,m.email FROM data_rights_requests r JOIN members m ON m.id=r.member_id ORDER BY CASE r.status WHEN 'requested' THEN 0 WHEN 'in_review' THEN 1 ELSE 2 END, r.created_at DESC LIMIT 100").all(),
  ]);
  return Response.json({ tickets: tickets.results, requests: requests.results });
}

export async function PATCH(request: Request) {
  const actor = await requireRole(["admin"]); const body = await request.json().catch(() => ({})) as { type?: string; id?: string; status?: string; note?: string };
  if (!body.id || !body.type || !body.status) return Response.json({ error: "id, type, and status are required." }, { status: 400 });
  const db = await getDatabase(); const now = nowIso(); const note = (body.note ?? "").trim().slice(0, 1000);
  if (body.type === "ticket" && ["open", "in_progress", "resolved"].includes(body.status)) {
    await db.prepare("UPDATE support_tickets SET status=?,updated_at=?,resolved_at=? WHERE id=?").bind(body.status, now, body.status === "resolved" ? now : null, body.id).run();
  } else if (body.type === "rights" && ["requested", "in_review", "completed", "rejected"].includes(body.status)) {
    await db.prepare("UPDATE data_rights_requests SET status=?,note=CASE WHEN ?='' THEN note ELSE ? END,updated_at=?,completed_at=? WHERE id=?").bind(body.status, note, note, now, ["completed", "rejected"].includes(body.status) ? now : null, body.id).run();
  } else return Response.json({ error: "Invalid status." }, { status: 400 });
  await db.prepare("INSERT INTO admin_events (member_id,actor_id,action,entity_type,entity_id,detail_json,created_at) VALUES (NULL,?,?,?,?,?,?)").bind(actor.id, "operations.updated", body.type, body.id, JSON.stringify({ status: body.status, note }), now).run();
  return Response.json({ ok: true });
}
