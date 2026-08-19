import { getDatabase, id, nowIso } from "./database";

export async function appendOrderEvent(orderId: string, memberId: string, status: string, actorId: string, source: string, publicMessage: string, internalNote = "") {
  const db = await getDatabase(); const now = nowIso();
  await db.batch([
    db.prepare("UPDATE orders SET status = ?, updated_at = ? WHERE id = ? AND member_id = ?").bind(status, now, orderId, memberId),
    db.prepare("INSERT INTO order_events (id, order_id, member_id, status, actor_id, source, public_message, internal_note, occurred_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id("event"), orderId, memberId, status, actorId, source, publicMessage, internalNote, now),
    db.prepare("INSERT INTO notifications (id, member_id, channel, template, title, body, status, created_at, sent_at) VALUES (?, ?, 'in_app', 'order_update', 'Test order updated', ?, 'sent', ?, ?)").bind(id("notification"), memberId, publicMessage, now, now),
  ]);
}

export const orderMessages: Record<string, string> = {
  payment_pending: "Checkout created. Complete payment to confirm your request.", paid_reconciling: "Payment received. We are reconciling your order.", ops_review: "Payment confirmed. Our concierge team is arranging the next step.", vendor_booked: "Your test has been booked with the selected provider.", appointment_confirmed: "Your collection appointment is confirmed.", in_transit: "Your kit is in transit.", collected: "Your sample collection is complete.", lab_received: "The laboratory has received your sample.", processing: "Your sample is being processed.", results_received: "Results received and queued for verification.", verification: "Your results are being verified.", released: "Your analysis is ready.", qc_failed: "The sample did not pass quality control; the team is arranging the next step.", recollection: "A recollection has been arranged.", refunded: "Your refund has been completed.",
};
