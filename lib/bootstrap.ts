import { getDatabase, parseJson } from "./database";
import { ensureMemberSeed } from "./seed";
import type { MemberIdentity } from "./member";
import { integrationHealth } from "./integrations";
import { intakeQuestions } from "./intake-catalog";
import { getGenomicsState } from "./genomics";
import { getCrossModalFindings } from "./cross-modal";
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
  await ensureMemberSeed(identity);
  const db = await getDatabase();
  const [member, journey, orders, sources, snapshot, reports, protocol, observations, intake, catalog, notifications, adjustment, roles, connections] = await Promise.all([
    db.prepare("SELECT * FROM members WHERE id = ?").bind(identity.id).first<Row>(),
    db.prepare("SELECT * FROM journey_steps WHERE member_id = ? ORDER BY sort_order").bind(identity.id).all<Row>(),
    db.prepare("SELECT * FROM orders WHERE member_id = ? ORDER BY updated_at DESC").bind(identity.id).all<Row>(),
    db.prepare("SELECT * FROM data_sources WHERE member_id = ? ORDER BY category, name").bind(identity.id).all<Row>(),
    db.prepare("SELECT * FROM twin_snapshots WHERE member_id = ? ORDER BY version DESC LIMIT 1").bind(identity.id).first<Row>(),
    db.prepare("SELECT * FROM reports WHERE member_id = ? ORDER BY updated_at DESC").bind(identity.id).all<Row>(),
    db.prepare("SELECT * FROM protocol_versions WHERE member_id = ? AND status = 'current' ORDER BY version DESC LIMIT 1").bind(identity.id).first<Row>(),
    db.prepare("SELECT * FROM observations WHERE member_id = ? ORDER BY effective_at DESC LIMIT 100").bind(identity.id).all<Row>(),
    db.prepare("SELECT COUNT(*) AS answered FROM intake_answers WHERE member_id = ?").bind(identity.id).first<{ answered: number }>(),
    db.prepare("SELECT * FROM catalog_versions WHERE active = 1 ORDER BY type").all<Row>(),
    db.prepare("SELECT * FROM notifications WHERE member_id = ? ORDER BY created_at DESC LIMIT 20").bind(identity.id).all<Row>(),
    db.prepare("SELECT * FROM daily_adjustments WHERE member_id = ? ORDER BY day DESC LIMIT 1").bind(identity.id).first<Row>(),
    db.prepare("SELECT role FROM member_roles WHERE member_id = ?").bind(identity.id).all<{ role: string }>(),
    db.prepare("SELECT id, provider, status, external_user_id, last_sync_at, error, updated_at FROM wearable_connections WHERE member_id = ? ORDER BY provider").bind(identity.id).all<Row>(),
  ]);

  const domains = snapshot
    ? await db.prepare("SELECT * FROM twin_domains WHERE member_id = ? AND snapshot_id = ? ORDER BY id").bind(identity.id, snapshot.id).all<Row>()
    : { results: [] as Row[] };
  const actions = protocol
    ? await db.prepare("SELECT * FROM protocol_actions WHERE member_id = ? AND protocol_id = ? ORDER BY sort_order").bind(identity.id, protocol.id).all<Row>()
    : { results: [] as Row[] };
  const [genomics, crossModal, phase3, responseState] = await Promise.all([
    getGenomicsState(identity.id),
    snapshot ? getCrossModalFindings(identity.id, String(snapshot.id)) : Promise.resolve([]),
    getMemberOutcomes(identity.id),
    getResponseState(identity.id),
  ]);

  const journeyRows = journey.results.map((row) => decode(row));
  const complete = journeyRows.filter((row) => row.state === "complete").length;
  const orderRows = orders.results.map((row) => decode(row, ["metadataJson"]));
  for (const order of orderRows) {
    const events = await db.prepare("SELECT id, status, source, public_message, occurred_at FROM order_events WHERE order_id = ? AND member_id = ? ORDER BY occurred_at").bind(order.id, identity.id).all<Row>();
    order.events = events.results.map((row) => decode(row));
  }
  return {
    member: member ? decode(member) : null,
    journey: journeyRows,
    journeyProgress: journeyRows.length ? Math.round((complete / journeyRows.length) * 100) : 0,
    roles: roles.results.map((row) => row.role),
    catalog: catalog.results.map((row) => decode(row, ["preparationJson"])),
    orders: orderRows,
    sources: sources.results.map((row) => decode(row, ["metadataJson"])),
    twin: snapshot ? { ...decode(snapshot), domains: domains.results.map((row) => decode(row, ["evidenceJson"])), crossModal: crossModal.map((row) => decode(row as Row, ["layersJson", "evidenceRefsJson", "missingJson"])) } : null,
    genomics: {
      artifacts: genomics.artifacts.map((row) => decode(row as Row, ["qcJson"])),
      interpretations: genomics.interpretations.map((row) => decode(row as Row, ["evidenceReleaseIdsJson", "limitationsJson"])),
      runs: genomics.runs.map((row) => decode(row as Row, ["evidenceSetJson", "summaryJson"])),
    },
    reports: reports.results.map((row) => decode(row, ["deepDiveJson"])),
    protocol: protocol ? { ...decode(protocol), actions: actions.results.map((row) => ({ ...decode(row), done: Boolean(row.done) })) } : null,
    observations: observations.results.map((row) => decode(row, ["metadataJson"])),
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
