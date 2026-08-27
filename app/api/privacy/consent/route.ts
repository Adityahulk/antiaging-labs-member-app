import { requireIdentity } from "@/lib/authz";
import { getDatabase, id, nowIso } from "@/lib/database";

const purpose = "core_program"; const noticeVersion = "2026-08-member-v1";

export async function GET() {
  const identity = await requireIdentity(); const db = await getDatabase();
  const record = await db.prepare("SELECT granted,notice_version,granted_at,revoked_at FROM consent_records WHERE member_id=? AND purpose=? ORDER BY created_at DESC LIMIT 1").bind(identity.id, purpose).first<Record<string, unknown>>();
  return Response.json(record ?? { granted: false, noticeVersion });
}

export async function PUT(request: Request) {
  const identity = await requireIdentity(); const body = await request.json().catch(() => ({})) as { granted?: boolean };
  if (typeof body.granted !== "boolean") return Response.json({ error: "A consent choice is required." }, { status: 400 });
  const db = await getDatabase(); const now = nowIso();
  const existing = await db.prepare("SELECT id FROM consent_records WHERE member_id=? AND purpose=? ORDER BY created_at DESC LIMIT 1").bind(identity.id, purpose).first<{ id: string }>();
  if (existing) await db.prepare("UPDATE consent_records SET notice_version=?,granted=?,granted_at=?,revoked_at=?,evidence_json=? WHERE id=?").bind(noticeVersion, body.granted ? 1 : 0, body.granted ? now : null, body.granted ? null : now, JSON.stringify({ channel: "member_privacy_page", timestamp: now }), existing.id).run();
  else await db.prepare("INSERT INTO consent_records (id,member_id,purpose,notice_version,granted,evidence_json,granted_at,revoked_at,created_at) VALUES (?,?,?,?,?,?,?,?,?)").bind(id("consent"), identity.id, purpose, noticeVersion, body.granted ? 1 : 0, JSON.stringify({ channel: "member_privacy_page", timestamp: now }), body.granted ? now : null, body.granted ? null : now, now).run();
  return Response.json({ granted: body.granted, noticeVersion });
}
