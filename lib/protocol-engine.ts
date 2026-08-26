import { getDatabase, id, nowIso } from "./database";
import { derivePriorityCandidates, rankPriorityCandidates } from "./priority-engine";

type CandidateAction = { domain: string; time: string; title: string; detail: string; reason: string; target: string };

const ACTIONS: Record<string, CandidateAction> = {
  sleep_consistency: { domain: "sleep", time: "13:00", title: "Earlier caffeine cutoff", detail: "On assigned intervention days, have no caffeine after 1 pm. Keep the rest of the routine as stable as practical.", reason: "Tests a sleep-duration hypothesis with daily wearable data.", target: "28-day randomized crossover; sleep minutes" },
  recovery_capacity: { domain: "recovery", time: "07:30", title: "Morning outdoor light", detail: "On assigned intervention days, spend 20 minutes outdoors within one hour of waking.", reason: "Tests a recovery and sleep-timing hypothesis against your own baseline.", target: "28-day baseline-to-intervention comparison" },
  metabolic_response: { domain: "metabolic", time: "19:30", title: "Earlier dinner timing", detail: "On assigned intervention days, finish dinner at least three hours before your usual bedtime.", reason: "Tests a meal-timing hypothesis; interpretation requires the specified metabolic or recovery outcome data.", target: "28-day randomized crossover; one declared outcome" },
  daily_movement: { domain: "activity", time: "18:00", title: "Consistent walking window", detail: "On assigned intervention days, add one 12-minute comfortable walk at the same time of day.", reason: "Tests a low-burden movement hypothesis with daily step data.", target: "28-day comparison; daily steps" },
};

export async function generateProtocol(memberId: string) {
  const db = await getDatabase();
  const snapshot = await db.prepare("SELECT id FROM twin_snapshots WHERE member_id=? ORDER BY version DESC LIMIT 1").bind(memberId).first<{ id: string }>();
  if (!snapshot) throw new Error("Compute the Twin first");
  const member = await db.prepare("SELECT primary_goal FROM members WHERE id=?").bind(memberId).first<{ primary_goal: string }>();
  const derived = await derivePriorityCandidates(memberId, member?.primary_goal || "Find a measurable starting point", 4);
  const ranked = rankPriorityCandidates(derived.candidates);
  const selected = ranked.find((candidate) => candidate.measurementReadiness >= .5 && candidate.riskPenalty < .2);
  if (!selected) throw new Error("More baseline data is required before drafting an intervention");
  const action = ACTIONS[selected.candidateCode];
  if (!action) throw new Error("No governed experiment template is available for the top measurable priority");
  const now = nowIso();
  const versionRow = await db.prepare("SELECT COALESCE(MAX(version),0) version FROM protocol_versions WHERE member_id=?").bind(memberId).first<{ version: number }>();
  const version = Number(versionRow?.version ?? 0) + 1;
  const protocolId = id("protocol");
  const starts = now.slice(0, 10);
  const endDate = new Date(now); endDate.setUTCDate(endDate.getUTCDate() + 28);
  const strategy = `Test one bounded change for ${selected.title.toLowerCase()}. This was selected deterministically from goal fit, measurement readiness, evidence, burden and risk; practitioner review is still required.`;
  await db.batch([
    db.prepare("INSERT INTO protocol_versions (id,member_id,version,status,title,strategy,started_at,ends_at,created_at,updated_at) VALUES (?,?,?,'draft',?,?,?,?,?,?)").bind(protocolId, memberId, version, `Response experiment v${version}`, strategy, starts, endDate.toISOString().slice(0, 10), now, now),
    db.prepare("INSERT INTO approvals (id,member_id,entity_type,entity_id,role,status,reviewer_id,note,created_at,decided_at) VALUES (?,?,'protocol',?,'practitioner','pending',NULL,'',?,NULL)").bind(id("approval"), memberId, protocolId, now),
    db.prepare("INSERT INTO protocol_actions (protocol_id,member_id,domain,day_of_week,scheduled_time,title,detail,reason,target,done,done_at,sort_order) VALUES (?,?,?,?,?,?,?,?,?,0,NULL,1)").bind(protocolId, memberId, action.domain, 0, action.time, action.title, action.detail, `${action.reason} Ranking score ${selected.finalScore.toFixed(2)}.`, action.target),
  ]);
  return { id: protocolId, version, status: "draft", strategy, actions: [action], priority: selected };
}

export async function approveProtocol(memberId: string, protocolId: string, reviewerId: string, note: string) {
  const db = await getDatabase(); const now = nowIso();
  const protocol = await db.prepare("SELECT id FROM protocol_versions WHERE id=? AND member_id=?").bind(protocolId, memberId).first();
  if (!protocol) throw new Error("Protocol not found");
  await db.batch([
    db.prepare("UPDATE protocol_versions SET status='superseded',updated_at=? WHERE member_id=? AND status='current'").bind(now, memberId),
    db.prepare("UPDATE protocol_versions SET status='current',updated_at=? WHERE id=? AND member_id=?").bind(now, protocolId, memberId),
    db.prepare("UPDATE approvals SET status='approved',reviewer_id=?,note=?,decided_at=? WHERE entity_type='protocol' AND entity_id=? AND status='pending'").bind(reviewerId, note, now, protocolId),
    db.prepare("INSERT INTO notifications (id,member_id,channel,template,title,body,status,created_at,sent_at) VALUES (?,?,'in_app','protocol_ready','Experiment reviewed','Your focused response experiment has been reviewed and is ready.','sent',?,?)").bind(id("notification"), memberId, now, now),
  ]);
  return { id: protocolId, status: "current" };
}
