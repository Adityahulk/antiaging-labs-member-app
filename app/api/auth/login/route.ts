import { createSession, normalizeEmail, setSessionCookie, validEmail, validPassword, verifyPassword } from "@/lib/app-auth";
import { getDatabase } from "@/lib/database";
import { ensureMemberSeed } from "@/lib/seed";
import type { MemberIdentity } from "@/lib/member";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { email?: unknown; password?: unknown };
  const email = normalizeEmail(body.email);
  if (!validEmail(email) || !validPassword(body.password)) return Response.json({ error: "Enter your email and password." }, { status: 400 });
  const database = await getDatabase();
  const row = await database.prepare("SELECT m.id, m.email, m.full_name, c.password_hash, c.password_salt FROM members m JOIN auth_credentials c ON c.member_id=m.id WHERE lower(m.email)=lower(?)").bind(email).first<{ id: string; email: string; full_name: string; password_hash: string; password_salt: string }>();
  if (!row || !(await verifyPassword(body.password, row.password_salt, row.password_hash))) return Response.json({ error: "Email or password is incorrect." }, { status: 401 });
  const identity: MemberIdentity = { id: row.id, email: row.email, fullName: row.full_name };
  await ensureMemberSeed(identity);
  const session = await createSession(row.id);
  const headers = new Headers({ "Cache-Control": "no-store" });
  setSessionCookie(headers, session);
  return Response.json({ member: { email: row.email, fullName: row.full_name } }, { headers });
}
