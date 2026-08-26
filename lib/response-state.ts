import { getDatabase, parseJson } from "./database";

type Row = Record<string, unknown>;

function camel(row: Row) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()), value]));
}

function decode(row: Row, jsonFields: string[] = []) {
  const value = camel(row) as Row;
  for (const field of jsonFields) value[field] = parseJson(value[field], []);
  return value;
}

export async function getResponseState(memberId: string) {
  const db = await getDatabase();
  const [goal, assessment, interventions, responses, safetyDecisions] = await Promise.all([
    db.prepare("SELECT * FROM member_goals WHERE member_id=? AND status='active' ORDER BY updated_at DESC LIMIT 1").bind(memberId).first<Row>(),
    db.prepare("SELECT * FROM priority_assessments WHERE member_id=? ORDER BY created_at DESC LIMIT 1").bind(memberId).first<Row>(),
    db.prepare("SELECT * FROM intervention_episodes WHERE member_id=? ORDER BY created_at DESC").bind(memberId).all<Row>(),
    db.prepare("SELECT * FROM response_assessments WHERE member_id=? ORDER BY computed_at DESC").bind(memberId).all<Row>(),
    db.prepare("SELECT * FROM safety_decisions WHERE member_id=? ORDER BY decided_at DESC LIMIT 20").bind(memberId).all<Row>(),
  ]);

  const candidates = assessment
    ? await db.prepare("SELECT * FROM priority_candidates WHERE member_id=? AND assessment_id=? ORDER BY rank").bind(memberId, assessment.id).all<Row>()
    : { results: [] as Row[] };
  const interventionRows: Row[] = [];
  for (const item of interventions.results) {
    const [exposures, contextEvents, geneticLinks] = await Promise.all([
      db.prepare("SELECT * FROM intervention_exposures WHERE member_id=? AND intervention_episode_id=? ORDER BY scheduled_at").bind(memberId, item.id).all<Row>(),
      db.prepare("SELECT * FROM context_events WHERE member_id=? AND intervention_episode_id=? ORDER BY occurred_at").bind(memberId, item.id).all<Row>(),
      db.prepare("SELECT l.*,g.gene,g.rsid,g.title interpretation_title,g.status interpretation_status FROM genetic_hypothesis_links l JOIN genomic_interpretations g ON g.id=l.genomic_interpretation_id WHERE l.member_id=? AND l.intervention_episode_id=? ORDER BY l.created_at").bind(memberId, item.id).all<Row>(),
    ]);
    const safety = safetyDecisions.results.find((decision) => decision.id === item.safety_decision_id);
    interventionRows.push({
      ...decode(item),
      safetyStatus: safety?.status ?? null,
      safetyReasonCodes: safety ? parseJson(safety.reason_codes_json, []) : [],
      exposures: exposures.results.map((row) => ({ ...decode(row), completed: Boolean(row.completed), adverseEffect: Boolean(row.adverse_effect) })),
      contextEvents: contextEvents.results.map((row) => decode(row, ["detailJson"])),
      geneticLinks: geneticLinks.results.map((row) => decode(row)),
    });
  }

  return {
    goal: goal ? decode(goal) : null,
    priorityAssessment: assessment ? decode(assessment, ["inputSnapshotJson"]) : null,
    priorityCandidates: candidates.results.map((row) => decode(row, ["rationaleJson", "evidenceRefsJson", "missingJson", "experimentTemplatesJson"])),
    safetyDecisions: safetyDecisions.results.map((row) => decode(row, ["reasonCodesJson", "evidenceRefsJson"])),
    interventions: interventionRows,
    responseAssessments: responses.results.map((row) => decode(row, ["confoundersJson", "insufficiencyReasonsJson", "sourceRefsJson"])),
  };
}
