import { getDatabase, id, nowIso, parseJson } from "@/lib/database";
import { getMemberIdentity } from "@/lib/member";
import { ensureMemberSeed } from "@/lib/seed";

const catalog = {
  biomarker: { name: "Men's Longevity Biomarker Panel", amountPaise: 499900, vendor: "Concierge lab network" },
  genetics: { name: "Longevity Genetics Array", amountPaise: 1499900, vendor: "Genomics partner" },
};

export async function GET() {
  const identity = await getMemberIdentity();
  await ensureMemberSeed(identity);
  const db = await getDatabase();
  const rows = await db.prepare("SELECT * FROM orders WHERE member_id = ? ORDER BY updated_at DESC").bind(identity.id).all<Record<string, unknown>>();
  return Response.json(rows.results.map((row) => ({ ...row, metadata_json: parseJson(row.metadata_json, {}) })));
}

export async function POST(request: Request) {
  const identity = await getMemberIdentity();
  await ensureMemberSeed(identity);
  const body = await request.json() as { type?: keyof typeof catalog; city?: string; preferredDate?: string };
  if (!body.type || !catalog[body.type]) return Response.json({ error: "Select a valid test" }, { status: 400 });
  const product = catalog[body.type];
  const db = await getDatabase();
  const orderId = id("order");
  const now = nowIso();
  const reference = `AL-${Math.floor(1000 + Math.random() * 9000)}`;
  await db.prepare("INSERT INTO orders (id, member_id, type, product_name, status, reference, vendor, amount_paise, payment_status, tracking_url, appointment_at, metadata_json, created_at, updated_at) VALUES (?, ?, ?, ?, 'paid_reconciling', ?, ?, ?, 'paid', NULL, ?, ?, ?, ?)")
    .bind(orderId, identity.id, body.type, product.name, reference, product.vendor, product.amountPaise, body.preferredDate ?? null, JSON.stringify({ city: body.city ?? "Hyderabad", checkout: "sandbox", paymentProvider: "razorpay-adapter" }), now, now).run();
  await db.prepare("INSERT INTO admin_events (member_id, actor_id, action, entity_type, entity_id, detail_json, created_at) VALUES (?, ?, 'order.created', 'order', ?, ?, ?)")
    .bind(identity.id, identity.id, orderId, JSON.stringify({ source: "member", sandboxPayment: true }), now).run();
  return Response.json({ id: orderId, reference, status: "paid_reconciling", paymentStatus: "paid", amountPaise: product.amountPaise }, { status: 201 });
}
