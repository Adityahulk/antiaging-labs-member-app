import { requireIdentity } from "@/lib/authz";
import { getDatabase, id, nowIso } from "@/lib/database";

export async function GET() {
  const identity = await requireIdentity(); const db = await getDatabase();
  const rows = await db.prepare("SELECT id,request_type,status,note,created_at,updated_at,completed_at FROM data_rights_requests WHERE member_id=? ORDER BY created_at DESC LIMIT 20").bind(identity.id).all();
  return Response.json(rows.results);
}

export async function POST(request: Request) {
  const identity = await requireIdentity(); const body = await request.json().catch(() => ({})) as { requestType?: string; note?: string };
  if (!(["export", "delete"] as string[]).includes(body.requestType ?? "")) return Response.json({ error: "Choose export or deletion." }, { status: 400 });
  const db = await getDatabase(); const active = await db.prepare("SELECT id FROM data_rights_requests WHERE member_id=? AND request_type=? AND status IN ('requested','in_review') LIMIT 1").bind(identity.id, body.requestType).first<{ id: string }>();
  if (active) return Response.json({ id: active.id, existing: true });
  const now = nowIso(); const requestId = id("rights"); const note = (body.note ?? "").trim().slice(0, 1000);
  await db.prepare("INSERT INTO data_rights_requests (id,member_id,request_type,status,note,created_at,updated_at,completed_at) VALUES (?,?,?,'requested',?,?,?,NULL)").bind(requestId, identity.id, body.requestType, note, now, now).run();
  return Response.json({ id: requestId }, { status: 201 });
}
