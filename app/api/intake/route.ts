import { getDatabase, nowIso, parseJson } from "@/lib/database";
import { getMemberIdentity } from "@/lib/member";
import { ensureMemberSeed } from "@/lib/seed";

export async function GET() {
  const identity = await getMemberIdentity();
  await ensureMemberSeed(identity);
  const db = await getDatabase();
  const rows = await db.prepare("SELECT question_code, module, answer_json, updated_at FROM intake_answers WHERE member_id = ? ORDER BY id").bind(identity.id).all<Record<string, unknown>>();
  return Response.json(rows.results.map((row) => ({ questionCode: row.question_code, module: row.module, answer: parseJson(row.answer_json, null), updatedAt: row.updated_at })));
}

export async function PUT(request: Request) {
  const identity = await getMemberIdentity();
  await ensureMemberSeed(identity);
  const body = await request.json() as { questionCode?: string; module?: string; answer?: unknown };
  if (!body.questionCode || !body.module || body.answer === undefined) return Response.json({ error: "questionCode, module and answer are required" }, { status: 400 });
  const db = await getDatabase();
  const now = nowIso();
  const statements = [db.prepare("INSERT INTO intake_answers (member_id, question_code, module, answer_json, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(member_id, question_code) DO UPDATE SET module = excluded.module, answer_json = excluded.answer_json, updated_at = excluded.updated_at")
    .bind(identity.id, body.questionCode, body.module, JSON.stringify(body.answer), now)];
  if (body.questionCode === "primary_goal") statements.push(db.prepare("UPDATE members SET primary_goal=?,updated_at=? WHERE id=?").bind(typeof body.answer === "string" ? body.answer : JSON.stringify(body.answer), now, identity.id));
  await db.batch(statements);
  return Response.json({ saved: true });
}
