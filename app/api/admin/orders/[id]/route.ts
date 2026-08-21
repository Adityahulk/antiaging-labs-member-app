import { getDatabase, nowIso, parseJson } from "@/lib/database";
import { requireRole } from "@/lib/authz";
import { appendOrderEvent, orderMessages } from "@/lib/orders";

const statuses = ["paid_reconciling", "ops_review", "vendor_booked", "appointment_confirmed", "kit_preparing", "dispatched", "in_transit", "delivered", "sample_registered", "return_transit", "collected", "lab_received", "processing", "qc", "files_received", "results_received", "verification", "interpretation_review", "released", "cancelled", "refund_pending", "refunded", "qc_failed", "recollection"];

function text(value: unknown, maximum: number) { return typeof value === "string" ? value.trim().slice(0, maximum) : undefined; }

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await requireRole(["admin", "practitioner"]);
  const orderId = (await context.params).id;
  const body = await request.json() as { status?: string; vendor?: string; trackingUrl?: string; appointmentAt?: string; eta?: string; externalReference?: string; instructions?: string; publicMessage?: string; internalNote?: string };
  if (body.status && !statuses.includes(body.status)) return Response.json({ error: "Invalid status" }, { status: 400 });
  if (body.trackingUrl) { try { const url = new URL(body.trackingUrl); if (!["https:", "http:"].includes(url.protocol)) throw new Error(); } catch { return Response.json({ error: "Invalid tracking URL" }, { status: 400 }); } }
  if (body.appointmentAt && Number.isNaN(Date.parse(body.appointmentAt))) return Response.json({ error: "Invalid appointment date" }, { status: 400 });
  if (body.eta && Number.isNaN(Date.parse(body.eta))) return Response.json({ error: "Invalid ETA" }, { status: 400 });
  const db = await getDatabase();
  const order = await db.prepare("SELECT member_id,status,metadata_json FROM orders WHERE id = ?").bind(orderId).first<{ member_id: string; status: string; metadata_json: string }>();
  if (!order) return Response.json({ error: "Order not found" }, { status: 404 });
  const status = body.status ?? order.status;
  const existingMetadata = parseJson<Record<string, unknown>>(order.metadata_json, {});
  const metadata = { ...existingMetadata, ...(body.eta !== undefined ? { eta: body.eta || null } : {}), ...(body.externalReference !== undefined ? { externalReference: text(body.externalReference, 160) || null } : {}), ...(body.instructions !== undefined ? { instructions: text(body.instructions, 3000) || null } : {}) };
  const publicMessage = text(body.publicMessage, 1000) || (body.status ? orderMessages[status] : "Your booking details have been updated.") || `Order updated: ${status.replaceAll("_", " ")}.`;
  const internalNote = text(body.internalNote, 3000) ?? "";
  const now = nowIso();
  await db.batch([db.prepare("UPDATE orders SET vendor = COALESCE(?, vendor), tracking_url = CASE WHEN ? IS NULL THEN tracking_url ELSE ? END, appointment_at = CASE WHEN ? IS NULL THEN appointment_at ELSE ? END, metadata_json = ?, updated_at = ? WHERE id = ?").bind(text(body.vendor, 200) ?? null, body.trackingUrl === undefined ? null : 1, body.trackingUrl || null, body.appointmentAt === undefined ? null : 1, body.appointmentAt || null, JSON.stringify(metadata), now, orderId), db.prepare("INSERT INTO admin_events (member_id, actor_id, action, entity_type, entity_id, detail_json, created_at) VALUES (?, ?, 'order.concierge_updated', 'order', ?, ?, ?)").bind(order.member_id, actor.id, orderId, JSON.stringify({ ...body, internalNote: internalNote ? "[stored separately]" : "" }), now)]);
  await appendOrderEvent(orderId, order.member_id, status, actor.id, "staff", publicMessage, internalNote);
  return Response.json({ id: orderId, status, vendor: body.vendor, trackingUrl: body.trackingUrl, appointmentAt: body.appointmentAt, metadata });
}
