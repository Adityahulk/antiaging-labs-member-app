import { getDatabase, nowIso } from "@/lib/database";
import { getMemberIdentity } from "@/lib/member";

const statuses = ["paid_reconciling", "ops_review", "vendor_booked", "appointment_confirmed", "in_transit", "collected", "lab_received", "processing", "results_received", "verification", "released", "cancelled", "refund_pending", "refunded", "qc_failed", "recollection"];

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await getMemberIdentity();
  const orderId = (await context.params).id;
  const body = await request.json() as { status?: string; vendor?: string; trackingUrl?: string; appointmentAt?: string };
  if (!body.status || !statuses.includes(body.status)) return Response.json({ error: "Invalid status" }, { status: 400 });
  if (body.trackingUrl) { try { new URL(body.trackingUrl); } catch { return Response.json({ error: "Invalid tracking URL" }, { status: 400 }); } }
  const db = await getDatabase();
  const order = await db.prepare("SELECT member_id FROM orders WHERE id = ?").bind(orderId).first<{ member_id: string }>();
  if (!order) return Response.json({ error: "Order not found" }, { status: 404 });
  const now = nowIso();
  await db.batch([
    db.prepare("UPDATE orders SET status = ?, vendor = COALESCE(?, vendor), tracking_url = COALESCE(?, tracking_url), appointment_at = COALESCE(?, appointment_at), updated_at = ? WHERE id = ?")
      .bind(body.status, body.vendor ?? null, body.trackingUrl ?? null, body.appointmentAt ?? null, now, orderId),
    db.prepare("INSERT INTO admin_events (member_id, actor_id, action, entity_type, entity_id, detail_json, created_at) VALUES (?, ?, 'order.status_changed', 'order', ?, ?, ?)")
      .bind(order.member_id, actor.id, orderId, JSON.stringify(body), now),
  ]);
  return Response.json({ id: orderId, status: body.status });
}
