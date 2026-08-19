import { getDatabase, parseJson } from "./database";
import { ensureMemberSeed } from "./seed";
import type { MemberIdentity } from "./member";

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
  const [member, journey, orders, sources, snapshot, reports, protocol, observations, intake] = await Promise.all([
    db.prepare("SELECT * FROM members WHERE id = ?").bind(identity.id).first<Row>(),
    db.prepare("SELECT * FROM journey_steps WHERE member_id = ? ORDER BY sort_order").bind(identity.id).all<Row>(),
    db.prepare("SELECT * FROM orders WHERE member_id = ? ORDER BY updated_at DESC").bind(identity.id).all<Row>(),
    db.prepare("SELECT * FROM data_sources WHERE member_id = ? ORDER BY category, name").bind(identity.id).all<Row>(),
    db.prepare("SELECT * FROM twin_snapshots WHERE member_id = ? ORDER BY version DESC LIMIT 1").bind(identity.id).first<Row>(),
    db.prepare("SELECT * FROM reports WHERE member_id = ? ORDER BY updated_at DESC").bind(identity.id).all<Row>(),
    db.prepare("SELECT * FROM protocol_versions WHERE member_id = ? AND status = 'current' ORDER BY version DESC LIMIT 1").bind(identity.id).first<Row>(),
    db.prepare("SELECT * FROM observations WHERE member_id = ? ORDER BY effective_at DESC LIMIT 100").bind(identity.id).all<Row>(),
    db.prepare("SELECT COUNT(*) AS answered FROM intake_answers WHERE member_id = ?").bind(identity.id).first<{ answered: number }>(),
  ]);

  const domains = snapshot
    ? await db.prepare("SELECT * FROM twin_domains WHERE member_id = ? AND snapshot_id = ? ORDER BY id").bind(identity.id, snapshot.id).all<Row>()
    : { results: [] as Row[] };
  const actions = protocol
    ? await db.prepare("SELECT * FROM protocol_actions WHERE member_id = ? AND protocol_id = ? ORDER BY sort_order").bind(identity.id, protocol.id).all<Row>()
    : { results: [] as Row[] };

  const journeyRows = journey.results.map((row) => decode(row));
  const complete = journeyRows.filter((row) => row.state === "complete").length;
  return {
    member: member ? decode(member) : null,
    journey: journeyRows,
    journeyProgress: journeyRows.length ? Math.round((complete / journeyRows.length) * 100) : 0,
    orders: orders.results.map((row) => decode(row, ["metadataJson"])),
    sources: sources.results.map((row) => decode(row, ["metadataJson"])),
    twin: snapshot ? { ...decode(snapshot), domains: domains.results.map((row) => decode(row, ["evidenceJson"])) } : null,
    reports: reports.results.map((row) => decode(row, ["deepDiveJson"])),
    protocol: protocol ? { ...decode(protocol), actions: actions.results.map((row) => ({ ...decode(row), done: Boolean(row.done) })) } : null,
    observations: observations.results.map((row) => decode(row, ["metadataJson"])),
    intake: { answered: intake?.answered ?? 0, total: 12 },
  };
}
