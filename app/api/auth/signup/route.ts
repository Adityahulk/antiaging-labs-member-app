import { createSession, hashPassword, newMemberId, normalizeEmail, setSessionCookie, validEmail, validName, validPassword } from "@/lib/app-auth";
import { getDatabase, nowIso } from "@/lib/database";
import { ensureMemberSeed } from "@/lib/seed";
import type { MemberIdentity } from "@/lib/member";
import { runtimeConfig } from "@/lib/integrations";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { email?: unknown; password?: unknown; fullName?: unknown; inviteCode?: unknown };
  const email = normalizeEmail(body.email);
  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  if (!validEmail(email)) return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  if (!validName(fullName)) return Response.json({ error: "Enter your full name." }, { status: 400 });
  if (!validPassword(body.password)) return Response.json({ error: "Use a password with at least 10 characters." }, { status: 400 });
  const inviteCode = typeof body.inviteCode === "string" ? body.inviteCode.trim() : "";
  const configuredCodes = new Set((runtimeConfig().BETA_INVITE_CODES ?? "").split(",").map((value) => value.trim()).filter(Boolean));
  if (inviteCode && !configuredCodes.has(inviteCode)) return Response.json({ error: "That founding cohort code is not valid." }, { status: 400 });

  const database = await getDatabase();
  let member = await database.prepare("SELECT id, email, full_name FROM members WHERE lower(email)=lower(?)").bind(email).first<{ id: string; email: string; full_name: string }>();
  if (member) {
    const existing = await database.prepare("SELECT member_id FROM auth_credentials WHERE member_id=?").bind(member.id).first();
    if (existing) return Response.json({ error: "An account already exists for this email. Sign in instead." }, { status: 409 });
    await database.prepare("UPDATE members SET full_name=?, updated_at=? WHERE id=?").bind(fullName, nowIso(), member.id).run();
  } else {
    const memberId = newMemberId();
    await database.prepare("INSERT INTO members (id, email, full_name, primary_goal, created_at, updated_at) VALUES (?, ?, ?, '', ?, ?)").bind(memberId, email, fullName, nowIso(), nowIso()).run();
    member = { id: memberId, email, full_name: fullName };
  }

  const password = await hashPassword(body.password);
  const now = nowIso();
  await database.prepare("INSERT INTO auth_credentials (member_id, password_hash, password_salt, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").bind(member.id, password.hash, password.salt, now, now).run();
  const identity: MemberIdentity = { id: member.id, email, fullName };
  await ensureMemberSeed(identity);
  if (inviteCode) {
    await database.prepare("INSERT INTO beta_access (member_id,status,requested_at,approved_at,note,updated_at) VALUES (?,'approved',?,?,?,?) ON CONFLICT(member_id) DO UPDATE SET status='approved',approved_at=excluded.approved_at,note=excluded.note,updated_at=excluded.updated_at")
      .bind(member.id, now, now, "Approved with founding cohort invitation", now).run();
  }
  const session = await createSession(member.id);
  const headers = new Headers({ "Cache-Control": "no-store" });
  setSessionCookie(headers, session);
  return Response.json({ member: { email, fullName } }, { headers, status: 201 });
}
