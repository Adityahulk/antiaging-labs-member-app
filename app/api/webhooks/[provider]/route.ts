import { getDatabase, nowIso } from "@/lib/database";

const providers = new Set(["razorpay", "oura", "whoop"]);

export async function POST(request: Request, context: { params: Promise<{ provider: string }> }) {
  const provider = (await context.params).provider.toLowerCase();
  if (!providers.has(provider)) return Response.json({ error: "Unknown provider" }, { status: 404 });
  const raw = await request.text();
  let payload: Record<string, unknown>;
  try { payload = JSON.parse(raw) as Record<string, unknown>; } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  const eventId = String(request.headers.get("x-razorpay-event-id") ?? request.headers.get("x-webhook-id") ?? payload.id ?? `${provider}:${await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw)).then((hash) => Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join(""))}`);
  const eventType = String(payload.event ?? payload.type ?? "unknown");
  const db = await getDatabase();
  try {
    await db.prepare("INSERT INTO webhook_events (id, provider, event_type, payload_json, status, received_at, processed_at) VALUES (?, ?, ?, ?, 'received', ?, NULL)")
      .bind(eventId, provider, eventType, raw, nowIso()).run();
  } catch { return Response.json({ duplicate: true }, { status: 200 }); }
  return Response.json({ accepted: true }, { status: 202 });
}
