import { getDatabase, parseJson } from "@/lib/database";
import { ensureMemberSeed } from "@/lib/seed";
import { requireRole } from "@/lib/authz";
import { integrationHealth } from "@/lib/integrations";

export async function GET() {
  const identity = await requireRole(["admin", "practitioner"]);
  await ensureMemberSeed(identity);
  const db = await getDatabase();
  const [orders, uploads, events, members, memberRows, approvals, observations, jobs, genomicArtifacts, aiDrafts, chatAudits] = await Promise.all([
    db.prepare("SELECT o.*, m.full_name, m.email FROM orders o JOIN members m ON m.id = o.member_id ORDER BY o.updated_at DESC LIMIT 100").all<Record<string, unknown>>(),
    db.prepare("SELECT u.*, m.full_name FROM uploads u JOIN members m ON m.id = u.member_id ORDER BY u.created_at DESC LIMIT 50").all(),
    db.prepare("SELECT * FROM admin_events ORDER BY created_at DESC LIMIT 50").all<Record<string, unknown>>(),
    db.prepare("SELECT COUNT(*) AS count FROM members").first<{ count: number }>(),
    db.prepare("SELECT id, full_name, email, primary_goal, updated_at FROM members ORDER BY updated_at DESC LIMIT 100").all(),
    db.prepare("SELECT a.*, COALESCE(r.title, p.title) entity_title FROM approvals a LEFT JOIN reports r ON a.entity_type='report' AND r.id=a.entity_id LEFT JOIN protocol_versions p ON a.entity_type='protocol' AND p.id=a.entity_id WHERE a.status='pending' ORDER BY a.created_at").all(),
    db.prepare("SELECT o.*, m.full_name FROM observations o JOIN members m ON m.id=o.member_id WHERE o.quality='needs_review' ORDER BY o.created_at LIMIT 100").all(),
    db.prepare("SELECT j.*, m.full_name, u.file_name FROM processing_jobs j JOIN members m ON m.id=j.member_id JOIN uploads u ON u.id=j.upload_id ORDER BY j.created_at DESC LIMIT 50").all(),
    db.prepare("SELECT g.*,m.full_name FROM genomic_artifacts g JOIN members m ON m.id=g.member_id WHERE g.status IN ('registered','needs_review') ORDER BY g.created_at LIMIT 50").all<Record<string,unknown>>(),
    db.prepare("SELECT d.*,m.full_name FROM ai_draft_runs d JOIN members m ON m.id=d.member_id ORDER BY d.created_at DESC LIMIT 50").all<Record<string,unknown>>(),
    db.prepare("SELECT a.*,m.full_name,cm.content answer,cr.verdict,cr.correction FROM chat_audits a JOIN members m ON m.id=a.member_id JOIN chat_messages cm ON cm.id=a.message_id LEFT JOIN chat_reviews cr ON cr.audit_id=a.id ORDER BY a.created_at DESC LIMIT 100").all<Record<string,unknown>>(),
  ]);
  return Response.json({
    counts: { members: members?.count ?? 0, needsAction: orders.results.filter((row) => ["paid_reconciling", "ops_review"].includes(String(row.status))).length, uploads: uploads.results.length, approvals: approvals.results.length, observations: observations.results.length, genomicReviews: genomicArtifacts.results.length, chatReviews: chatAudits.results.filter((row)=>!row.verdict).length },
    members: memberRows.results,
    orders: orders.results.map((row) => ({ ...row, metadata_json: parseJson(row.metadata_json, {}) })),
    uploads: uploads.results,
    events: events.results.map((row) => ({ ...row, detail_json: parseJson(row.detail_json, {}) })),
    approvals: approvals.results,
    observations: observations.results,
    jobs: jobs.results.map((row) => ({ ...row, result_json: parseJson((row as Record<string, unknown>).result_json, {}) })),
    genomicArtifacts: genomicArtifacts.results.map((row)=>({...row,qc_json:parseJson(row.qc_json,{})})),
    aiDrafts: aiDrafts.results.map((row)=>({...row,input_refs_json:parseJson(row.input_refs_json,[]),output_json:parseJson(row.output_json,{})})),
    chatAudits: chatAudits.results.map((row)=>({...row,fields_json:parseJson(row.fields_json,[]),grounding_json:parseJson(row.grounding_json,{})})),
    integrations: integrationHealth(),
  });
}
