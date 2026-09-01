import { getDatabase, parseJson } from "@/lib/database";
import { getMemberIdentity } from "@/lib/member";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await getMemberIdentity();
  const reportId = (await context.params).id;
  const report = await (await getDatabase()).prepare("SELECT id,member_id,type,title,status,source_date,overview,deep_dive_json,created_at,updated_at FROM reports WHERE id=? AND member_id=?").bind(reportId, identity.id).first<Record<string, unknown>>();
  if (!report) return Response.json({ error: "Report not found" }, { status: 404 });
  return Response.json({ ...report, deep_dive_json: parseJson(report.deep_dive_json, {}) }, { headers: { "Cache-Control": "private, no-store" } });
}
