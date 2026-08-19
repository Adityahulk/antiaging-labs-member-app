import { getDatabase, nowIso } from "@/lib/database";
import { hmacHex, runtimeConfig, timingSafeEqual } from "@/lib/integrations";
import { appendOrderEvent } from "@/lib/orders";
import { syncWearable } from "@/lib/wearables";

const providers = new Set(["razorpay", "oura", "whoop", "open_wearables"]);

export async function POST(request: Request, context: { params: Promise<{ provider: string }> }) {
  const provider = (await context.params).provider.toLowerCase();
  if (!providers.has(provider)) return Response.json({ error: "Unknown provider" }, { status: 404 });
  const raw = await request.text();
  let payload: Record<string, unknown>;
  try { payload = JSON.parse(raw) as Record<string, unknown>; } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  const eventId = String(request.headers.get("x-razorpay-event-id") ?? request.headers.get("x-webhook-id") ?? payload.id ?? `${provider}:${await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw)).then((hash) => Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join(""))}`);
  const eventType = String(payload.event ?? payload.type ?? "unknown");
  if (provider === "razorpay") {
    const secret = runtimeConfig().RAZORPAY_WEBHOOK_SECRET;
    if (secret) { const supplied = request.headers.get("x-razorpay-signature") ?? ""; const expected = await hmacHex(secret, raw); if (!timingSafeEqual(expected, supplied)) return Response.json({ error: "Invalid signature" }, { status: 401 }); }
  }
  if(provider==="open_wearables"){const secret=runtimeConfig().OPEN_WEARABLES_WEBHOOK_SECRET;if(secret){const supplied=request.headers.get("x-open-wearables-signature")??"";const expected=await hmacHex(secret,raw);if(!timingSafeEqual(expected,supplied))return Response.json({error:"Invalid signature"},{status:401});}}
  const db = await getDatabase();
  try {
    await db.prepare("INSERT INTO webhook_events (id, provider, event_type, payload_json, status, received_at, processed_at) VALUES (?, ?, ?, ?, 'received', ?, NULL)")
      .bind(eventId, provider, eventType, raw, nowIso()).run();
  } catch { return Response.json({ duplicate: true }, { status: 200 }); }
  if (provider === "razorpay" && ["payment.captured", "order.paid"].includes(eventType)) {
    const paymentEntity = ((payload.payload as Record<string, unknown> | undefined)?.payment as Record<string, unknown> | undefined)?.entity as Record<string, unknown> | undefined;
    const providerOrderId = String(paymentEntity?.order_id ?? ""); const paymentId = String(paymentEntity?.id ?? "");
    if (providerOrderId) { const attempt = await db.prepare("SELECT order_id, member_id FROM payment_attempts WHERE provider_order_id = ?").bind(providerOrderId).first<{ order_id: string; member_id: string }>(); if (attempt) { await db.batch([db.prepare("UPDATE payment_attempts SET status = 'captured', provider_payment_id = ?, updated_at = ? WHERE provider_order_id = ?").bind(paymentId, nowIso(), providerOrderId), db.prepare("UPDATE orders SET payment_status = 'captured' WHERE id = ?").bind(attempt.order_id)]); await appendOrderEvent(attempt.order_id, attempt.member_id, "ops_review", "razorpay", "webhook", "Payment confirmed. Our concierge team is arranging the next step."); } }
  }
  if(provider==="open_wearables"){const externalUserId=String(payload.user_id??payload.external_user_id??"");const wearableProvider=String(payload.provider??"");if(externalUserId&&wearableProvider){const connection=await db.prepare("SELECT member_id FROM wearable_connections WHERE provider='open_wearables_profile' AND external_user_id=?").bind(externalUserId).first<{member_id:string}>();if(connection)try{await syncWearable(connection.member_id,wearableProvider);}catch{/* reconciliation job retries provider failures */}}}
  await db.prepare("UPDATE webhook_events SET status = 'processed', processed_at = ? WHERE id = ?").bind(nowIso(), eventId).run();
  return Response.json({ accepted: true }, { status: 202 });
}
