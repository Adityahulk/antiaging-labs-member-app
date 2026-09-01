import { getDatabase, parseJson } from "./database";
import { ensureMemberSeed } from "./seed";
import type { MemberIdentity } from "./member";
import { integrationHealth } from "./integrations";
import { intakeQuestions } from "./intake-catalog";
import { getGenomicsState } from "./genomics";
import { getMemberOutcomes } from "./phase3";
import { interoperabilityStatus } from "./interoperability";
import { getResponseState } from "./response-state";

type Row = Record<string, unknown>;

function camel(row: Row) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()), value]));
}

function decode(row: Row, jsonFields: string[] = []) {
  const result = camel(row) as Record<string, unknown>;
  for (const field of jsonFields) result[field] = parseJson(result[field], {});
  return result;
}

export async function getMemberAppData(identity: MemberIdentity) {
  if (identity.id === "demo-member-arjun") await ensureMemberSeed(identity);
  const db = await getDatabase();
  const [member, journey, orders, orderEvents, sources, snapshot, domains, reports, protocol, actions, observations, intake, catalog, notifications, adjustment, roles, connections, crossModalRows] = await Promise.all([
    db.prepare("SELECT * FROM members WHERE id = ?").bind(identity.id).first<Row>(),
    db.prepare("SELECT * FROM journey_steps WHERE member_id = ? ORDER BY sort_order").bind(identity.id).all<Row>(),
    db.prepare("SELECT * FROM orders WHERE member_id = ? ORDER BY updated_at DESC").bind(identity.id).all<Row>(),
    db.prepare("SELECT id, order_id, status, source, public_message, occurred_at FROM order_events WHERE member_id = ? ORDER BY occurred_at").bind(identity.id).all<Row>(),
    db.prepare("SELECT * FROM data_sources WHERE member_id = ? ORDER BY category, name").bind(identity.id).all<Row>(),
    db.prepare("SELECT * FROM twin_snapshots WHERE member_id = ? ORDER BY version DESC LIMIT 1").bind(identity.id).first<Row>(),
    db.prepare("SELECT d.* FROM twin_domains d JOIN twin_snapshots s ON s.id=d.snapshot_id WHERE d.member_id=? AND s.version=(SELECT MAX(version) FROM twin_snapshots WHERE member_id=?) ORDER BY d.id").bind(identity.id, identity.id).all<Row>(),
    db.prepare("SELECT id,member_id,type,title,status,source_date,overview,created_at,updated_at FROM reports WHERE member_id = ? ORDER BY updated_at DESC").bind(identity.id).all<Row>(),
    db.prepare("SELECT * FROM protocol_versions WHERE member_id = ? AND status = 'current' ORDER BY version DESC LIMIT 1").bind(identity.id).first<Row>(),
    db.prepare("SELECT a.* FROM protocol_actions a JOIN protocol_versions p ON p.id=a.protocol_id WHERE a.member_id=? AND p.status='current' ORDER BY a.sort_order").bind(identity.id).all<Row>(),
    db.prepare("SELECT id,member_id,concept_code,domain,value_number,value_text,unit,effective_at,source,quality,created_at FROM observations WHERE member_id = ? ORDER BY effective_at DESC LIMIT 100").bind(identity.id).all<Row>(),
    db.prepare("SELECT COUNT(*) AS answered FROM intake_answers WHERE member_id = ?").bind(identity.id).first<{ answered: number }>(),
    db.prepare("SELECT * FROM catalog_versions WHERE active = 1 ORDER BY type").all<Row>(),
    db.prepare("SELECT * FROM notifications WHERE member_id = ? ORDER BY created_at DESC LIMIT 20").bind(identity.id).all<Row>(),
    db.prepare("SELECT * FROM daily_adjustments WHERE member_id = ? ORDER BY day DESC LIMIT 1").bind(identity.id).first<Row>(),
    db.prepare("SELECT role FROM member_roles WHERE member_id = ?").bind(identity.id).all<{ role: string }>(),
    db.prepare("SELECT id, provider, status, external_user_id, last_sync_at, error, updated_at FROM wearable_connections WHERE member_id = ? ORDER BY provider").bind(identity.id).all<Row>(),
    db.prepare("SELECT * FROM cross_modal_findings WHERE member_id=? AND snapshot_id=(SELECT id FROM twin_snapshots WHERE member_id=? ORDER BY version DESC LIMIT 1) ORDER BY id").bind(identity.id, identity.id).all<Row>(),
  ]);
  const [genomics, phase3, responseState] = await Promise.all([
    getGenomicsState(identity.id),
    getMemberOutcomes(identity.id),
    getResponseState(identity.id),
  ]);

  const journeyRows = journey.results.map((row) => decode(row));
  const complete = journeyRows.filter((row) => row.state === "complete").length;
  const orderRows = orders.results.map((row) => decode(row, ["metadataJson"]));
  const eventsByOrder = new Map<string, Row[]>();
  for (const row of orderEvents.results) { const key = String(row.order_id); eventsByOrder.set(key, [...(eventsByOrder.get(key) ?? []), decode(row)]); }
  for (const order of orderRows) {
    order.events = eventsByOrder.get(String(order.id)) ?? [];
  }
  return {
    member: member ? decode(member) : null,
    journey: journeyRows,
    journeyProgress: journeyRows.length ? Math.round((complete / journeyRows.length) * 100) : 0,
    roles: roles.results.map((row) => row.role),
    catalog: catalog.results.map((row) => decode(row, ["preparationJson"])),
    orders: orderRows,
    sources: sources.results.map((row) => decode(row, ["metadataJson"])),
    twin: snapshot ? { ...decode(snapshot), domains: domains.results.map((row) => decode(row, ["evidenceJson"])), crossModal: crossModalRows.results.map((row) => decode(row, ["layersJson", "evidenceRefsJson", "missingJson"])) } : null,
    genomics: {
      artifacts: genomics.artifacts.map((row) => decode(row as Row, ["qcJson"])),
      interpretations: genomics.interpretations.map((row) => decode(row as Row, ["evidenceReleaseIdsJson", "limitationsJson"])),
      runs: genomics.runs.map((row) => decode(row as Row, ["evidenceSetJson", "summaryJson"])),
    },
    reports: reports.results.map((row) => decode(row)),
    protocol: protocol ? { ...decode(protocol), actions: actions.results.map((row) => ({ ...decode(row), done: Boolean(row.done) })) } : null,
    observations: observations.results.map((row) => decode(row)),
    intake: { answered: intake?.answered ?? 0, total: intakeQuestions.length },
    notifications: notifications.results.map((row) => decode(row)),
    dailyAdjustment: adjustment ? decode(adjustment) : null,
    wearableConnections: connections.results.map((row) => decode(row)),
    integrations: integrationHealth(),
    phase3: { ...phase3, interventions: responseState.interventions, responseAssessments: responseState.responseAssessments },
    responseState,
    interoperability: interoperabilityStatus(),
  };
}
