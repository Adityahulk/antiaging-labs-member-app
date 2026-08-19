import { getDatabase, parseJson } from "@/lib/database";
import { requireIdentity } from "@/lib/authz";
export async function GET() { await requireIdentity(); const db = await getDatabase(); const rows = await db.prepare("SELECT * FROM catalog_versions WHERE active = 1 ORDER BY type").all<Record<string, unknown>>(); return Response.json(rows.results.map((row) => ({ ...row, preparation_json: parseJson(row.preparation_json, []) }))); }
