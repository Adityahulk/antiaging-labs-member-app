import { getDatabase, parseJson } from "@/lib/database";
import { getMemberIdentity } from "@/lib/member";
import { ensureMemberSeed } from "@/lib/seed";

export async function GET() {
  const identity = await getMemberIdentity();
  await ensureMemberSeed(identity);
  const db = await getDatabase();
  const [orders, uploads, events, members] = await Promise.all([
    db.prepare("SELECT o.*, m.full_name, m.email FROM orders o JOIN members m ON m.id = o.member_id ORDER BY o.updated_at DESC LIMIT 100").all<Record<string, unknown>>(),
    db.prepare("SELECT u.*, m.full_name FROM uploads u JOIN members m ON m.id = u.member_id ORDER BY u.created_at DESC LIMIT 50").all(),
    db.prepare("SELECT * FROM admin_events ORDER BY created_at DESC LIMIT 50").all<Record<string, unknown>>(),
    db.prepare("SELECT COUNT(*) AS count FROM members").first<{ count: number }>(),
  ]);
  return Response.json({
    counts: { members: members?.count ?? 0, needsAction: orders.results.filter((row) => ["paid_reconciling", "ops_review"].includes(String(row.status))).length, uploads: uploads.results.length },
    orders: orders.results.map((row) => ({ ...row, metadata_json: parseJson(row.metadata_json, {}) })),
    uploads: uploads.results,
    events: events.results.map((row) => ({ ...row, detail_json: parseJson(row.detail_json, {}) })),
  });
}
