import { getDatabase, id, nowIso } from "./database";
import type { MemberIdentity } from "./member";

const journey = [
  ["account", "Account created", "Profile and goals", "complete", 1, "2026-08-12T09:00:00.000Z"],
  ["intake", "Health intake", "Core and deep context", "complete", 2, "2026-08-14T09:00:00.000Z"],
  ["wearables", "Wearables connected", "Oura and Apple Health", "complete", 3, "2026-08-15T09:00:00.000Z"],
  ["collection", "Blood collection", "At-home appointment", "current", 4, "2026-08-20T02:00:00.000Z"],
  ["processing", "Laboratory processing", "Expected 2–3 days", "future", 5, "2026-08-22T09:00:00.000Z"],
  ["analysis", "Analysis", "Data joined into your Twin", "future", 6, "2026-08-23T09:00:00.000Z"],
  ["protocol", "Protocol ready", "Complete 12-week plan", "future", 7, "2026-08-24T09:00:00.000Z"],
  ["retest", "Retest", "Measure your response", "future", 8, "2026-11-10T09:00:00.000Z"],
] as const;

const sources = [
  ["oura", "Oura Ring", "wearable", "connected", 92, { metrics: ["sleep", "hrv_rmssd", "resting_hr", "activity"] }],
  ["apple_health", "Apple Health", "health_data", "connected", 88, { metrics: ["steps", "workouts", "heart_rate"] }],
  ["tata1mg", "Tata 1mg", "laboratory", "imported", 72, { markers: 74 }],
  ["genetics_array", "Genetics Array", "genetics", "processing", 40, { expected: "2026-08-24" }],
  ["intake", "Health Intake", "self_reported", "complete", 100, { modules: 14 }],
] as const;

const domains = [
  ["metabolic", "Metabolic", "optimizing", "Improving", "improving", 0.89, "current", "HOMA-IR", "1.7", "", "<1.5", ["Fasting insulin 7.1", "Post-meal walking 81% adherence"]],
  ["cardiovascular", "Cardiovascular", "priority", "Current priority", "stable", 0.93, "current", "ApoB", "108", "mg/dL", "<80", ["ApoB 108 mg/dL", "Family history"]],
  ["sleep", "Sleep & circadian", "stable", "Stable", "improving", 0.86, "current", "Sleep duration", "7h 42m", "", "7h 30m–8h", ["28 valid nights", "Timing regularity improved 23 min"]],
  ["recovery", "Autonomic recovery", "watch", "Watch today", "declining", 0.78, "current", "HRV RMSSD", "39", "ms", "Personal baseline 44", ["Three nights below baseline", "Sleep 6h 51m last night"]],
  ["activity", "Activity & fitness", "optimizing", "On target", "improving", 0.84, "current", "Daily steps", "8,420", "steps", "8,000–10,000", ["4 of 5 workouts", "Weekly load on target"]],
  ["nutrition", "Nutrition", "optimizing", "Building consistency", "improving", 0.72, "current", "Protein", "112", "g/day", "130 g/day", ["Meal logs 5 of 7 days"]],
  ["body_composition", "Body composition", "stable", "Stable", "stable", 0.68, "current", "Waist", "89", "cm", "<86 cm", ["Waist measurement 89 cm"]],
  ["mind", "Mind & wellbeing", "stable", "Stable", "stable", 0.65, "current", "Stress check-in", "5", "/10", "3–4", ["Two check-ins this week"]],
] as const;

const observations = [
  ["apob", "cardiovascular", 108, null, "mg/dL", "Tata 1mg"],
  ["fasting_insulin", "metabolic", 7.1, null, "µIU/mL", "Tata 1mg"],
  ["homa_ir", "metabolic", 1.7, null, null, "Calculated"],
  ["hrv_rmssd_28d", "recovery", 39, null, "ms", "Oura"],
  ["sleep_duration_28d", "sleep", 7.7, null, "hours", "Oura"],
  ["daily_steps_28d", "activity", 8420, null, "steps", "Apple Health"],
  ["waist", "body_composition", 89, null, "cm", "Intake"],
] as const;

const actions = [
  ["recovery", 3, "07:15", "Morning light", "12 minutes outdoors", "Circadian rhythm", "Complete before 8:00 AM", 1, 1],
  ["nutrition", 3, "08:30", "Protein-first breakfast", "35 g protein · 10 g fibre", "Metabolic · Muscle", "35 g protein", 1, 2],
  ["nutrition", 3, "12:40", "Post-lunch walk", "12 minutes · easy pace", "Glucose response", "12 minutes", 0, 3],
  ["training", 3, "17:30", "Zone 2 training", "35 minutes · HR 132–146", "Cardio · Metabolic", "35 minutes", 0, 4],
  ["supplements", 3, "20:00", "Magnesium glycinate", "200 mg with dinner", "Recovery · Sleep", "200 mg", 0, 5],
  ["recovery", 3, "22:20", "Wind-down sequence", "Dim light · reading · 10 min breathwork", "Sleep regularity", "10 minutes", 0, 6],
] as const;

export async function ensureMemberSeed(identity: MemberIdentity): Promise<void> {
  const database = await getDatabase();
  const now = nowIso();
  const existing = await database.prepare("SELECT id FROM members WHERE id = ?").bind(identity.id).first();
  if (existing) {
    await database.prepare("UPDATE members SET email = ?, full_name = ?, updated_at = ? WHERE id = ?").bind(identity.email, identity.fullName, now, identity.id).run();
    await ensurePhaseOneSeed(database, identity, now);
    await ensurePhaseThreeSeed(database, identity, now);
    return;
  }

  const protocolId = id("protocol");
  const snapshotId = id("twin");
  const statements: D1PreparedStatement[] = [
    database.prepare("INSERT INTO members (id, email, full_name, primary_goal, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").bind(identity.id, identity.email, identity.fullName, "Improve insulin sensitivity, reduce ApoB, and build aerobic capacity", now, now),
    database.prepare("INSERT INTO protocol_versions (id, member_id, version, status, title, strategy, started_at, ends_at, created_at, updated_at) VALUES (?, ?, 2, 'current', ?, ?, ?, ?, ?, ?)").bind(protocolId, identity.id, "12-week longevity protocol", "Improve insulin sensitivity, lower ApoB exposure, and rebuild recovery consistency.", "2026-08-02", "2026-10-25", now, now),
    database.prepare("INSERT INTO twin_snapshots (id, member_id, version, as_of, coverage, summary, created_at) VALUES (?, ?, 1, ?, 87, ?, ?)").bind(snapshotId, identity.id, now, "Metabolic health and sleep timing are improving; recovery is temporarily below baseline; ApoB remains the main cardiovascular priority.", now),
  ];

  for (const [stepCode, title, detail, state, sortOrder, dueAt] of journey) statements.push(database.prepare("INSERT INTO journey_steps (member_id, step_code, title, detail, state, sort_order, due_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(identity.id, stepCode, title, detail, state, sortOrder, dueAt, now));
  for (const [code, name, category, status, coverage, metadata] of sources) statements.push(database.prepare("INSERT INTO data_sources (id, member_id, source_code, name, category, status, last_sync_at, coverage, metadata_json, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id("source"), identity.id, code, name, category, status, now, coverage, JSON.stringify(metadata), now));
  for (const [concept, domain, valueNumber, valueText, unit, source] of observations) statements.push(database.prepare("INSERT INTO observations (id, member_id, concept_code, domain, value_number, value_text, unit, effective_at, source, quality, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'accepted', '{}', ?)").bind(id("obs"), identity.id, concept, domain, valueNumber, valueText, unit, "2026-08-18T08:00:00.000Z", source, now));
  for (const [domainCode, label, status, stateLabel, trend, confidence, freshness, keyMetric, keyValue, keyUnit, target, evidence] of domains) statements.push(database.prepare("INSERT INTO twin_domains (snapshot_id, member_id, domain_code, label, status, state_label, trend, confidence, freshness, key_metric, key_value, key_unit, target, evidence_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(snapshotId, identity.id, domainCode, label, status, stateLabel, trend, confidence, freshness, keyMetric, keyValue, keyUnit, target, JSON.stringify(evidence)));
  for (const [domain, day, time, title, detail, reason, target, done, sortOrder] of actions) statements.push(database.prepare("INSERT INTO protocol_actions (protocol_id, member_id, domain, day_of_week, scheduled_time, title, detail, reason, target, done, done_at, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(protocolId, identity.id, domain, day, time, title, detail, reason, target, done, done ? now : null, sortOrder));

  statements.push(database.prepare("INSERT INTO orders (id, member_id, type, product_name, status, reference, vendor, amount_paise, payment_status, tracking_url, appointment_at, metadata_json, created_at, updated_at) VALUES (?, ?, 'biomarker', 'Advanced Longevity Panel', 'appointment_confirmed', 'AL-2048', 'Tata 1mg', 1899900, 'paid', NULL, '2026-08-20T02:00:00.000Z', ?, ?, ?)").bind(id("order"), identity.id, JSON.stringify({ markers: 74, collection: "at_home" }), now, now));
  statements.push(database.prepare("INSERT INTO orders (id, member_id, type, product_name, status, reference, vendor, amount_paise, payment_status, tracking_url, appointment_at, metadata_json, created_at, updated_at) VALUES (?, ?, 'genetics', 'Longevity Genetics Array', 'in_transit', 'AL-2051', 'Genomics Partner', 2999900, 'paid', 'https://www.bluedart.com/tracking', NULL, ?, ?, ?)").bind(id("order"), identity.id, JSON.stringify({ expected: "2026-08-21" }), now, now));
  statements.push(database.prepare("INSERT INTO reports (id, member_id, type, title, status, source_date, overview, deep_dive_json, created_at, updated_at) VALUES (?, ?, 'biomarkers', 'Complete biomarker analysis', 'ready', '2026-06-28', ?, ?, ?, ?)").bind(id("report"), identity.id, "Six priority findings led by ApoB and insulin sensitivity, with strong kidney and liver markers.", JSON.stringify({ priorities: ["ApoB", "Insulin sensitivity", "Vitamin D"], reassuring: ["Kidney", "Liver", "CBC"] }), now, now));
  statements.push(database.prepare("INSERT INTO reports (id, member_id, type, title, status, source_date, overview, deep_dive_json, created_at, updated_at) VALUES (?, ?, 'wearables', '28-day wearable analysis', 'ready', '2026-08-18', ?, ?, ?, ?)").bind(id("report"), identity.id, "Recovery is temporarily lower while sleep regularity and activity consistency improve.", JSON.stringify({ priorities: ["Recovery"], improving: ["Sleep regularity", "Activity consistency"] }), now, now));
  statements.push(database.prepare("INSERT INTO reports (id, member_id, type, title, status, source_date, overview, deep_dive_json, created_at, updated_at) VALUES (?, ?, 'genetics', 'Longevity genetics', 'processing', NULL, ?, '{}', ?, ?)").bind(id("report"), identity.id, "Kit received; analysis is underway.", now, now));
  statements.push(database.prepare("INSERT INTO chat_messages (id, member_id, conversation_id, role, content, sources_json, created_at) VALUES (?, ?, 'default', 'assistant', ?, '[]', ?)").bind(id("msg"), identity.id, "Good morning. I can help with today’s protocol, results, meals, training, or anything in your health data.", now));

  await database.batch(statements);
  await ensurePhaseOneSeed(database, identity, now);
  await ensurePhaseThreeSeed(database, identity, now);
  await database.prepare("PRAGMA optimize").run();
}

async function ensurePhaseThreeSeed(database:D1Database,identity:MemberIdentity,now:string){
  const statements:D1PreparedStatement[]=[database.prepare("INSERT OR IGNORE INTO member_jurisdictions (member_id,country_code,region_code,policy_version,features_json,updated_at) VALUES (?,'IN','TG','IN-v1',?,?)").bind(identity.id,JSON.stringify({research:true,experiments:true,abdm:"optional",nativeHealth:true}),now)];
  const targets=[["sleep_minutes","Sleep duration"],["resting_hr","Resting heart rate"],["apob","ApoB"]] as const;
  for(const[target,label]of targets) statements.push(database.prepare("INSERT OR IGNORE INTO response_model_versions (id,target_code,version,status,feature_codes_json,coefficients_json,training_window_json,metrics_json,calibration_json,subgroup_json,abstention_json,data_snapshot_hash,created_at,published_at) VALUES (?,?,1,'collecting',?,'{}','{}',?,'{}','{}',?,'contract-only',?,NULL)").bind(`model_contract_${target}`,target,JSON.stringify(["baseline","protocol_adherence","data_quality"]),JSON.stringify({n:0,trainN:0,testN:0,mae:0,rmse:0,r2:0,label}),JSON.stringify({gateReasons:["Prospective validation outcomes are still being collected"],outOfRange:true,missingInputs:true}),now));
  await database.batch(statements);
}

async function ensurePhaseOneSeed(database: D1Database, identity: MemberIdentity, now: string) {
  const catalog = [
    ["catalog_biomarker_v1", "advanced_longevity_panel", "biomarker", "Advanced Longevity Panel", "74-marker at-home panel with verification, analysis, Twin refresh, and protocol update.", 1899900, 341982, 3, ["10–12 hour fast", "Plain water allowed", "Avoid hard training for 24 hours"]],
    ["catalog_genetics_v1", "longevity_genetics_array", "genetics", "Longevity Genetics Array", "At-home genetics kit with QC, interpretation, inherited context, and raw-data access.", 2999900, 539982, 21, ["Read the kit instructions", "Do not eat or drink for 30 minutes", "Register the sample before return"]],
  ] as const;
  const memberCount = await database.prepare("SELECT COUNT(*) AS count FROM members").first<{ count: number }>();
  const statements: D1PreparedStatement[] = [
    database.prepare("INSERT OR IGNORE INTO member_roles (member_id, role, created_at) VALUES (?, 'member', ?)").bind(identity.id, now),
    database.prepare("INSERT OR IGNORE INTO consent_records (id, member_id, purpose, notice_version, granted, evidence_json, granted_at, revoked_at, created_at) VALUES (?, ?, 'core_program', '2026-08-v1', 1, ?, ?, NULL, ?)").bind(`consent_core_${identity.id}`, identity.id, JSON.stringify({ seededDemo: true, channel: "authenticated_app" }), now, now),
  ];
  if (identity.id === "demo-member-arjun" || (memberCount?.count ?? 0) <= 1) statements.push(database.prepare("INSERT OR IGNORE INTO member_roles (member_id, role, created_at) VALUES (?, 'admin', ?)").bind(identity.id, now));
  for (const [catalogId, code, type, name, description, amount, tax, turnaround, preparation] of catalog) statements.push(database.prepare("INSERT OR IGNORE INTO catalog_versions (id, code, version, type, name, description, amount_paise, tax_paise, city, turnaround_days, preparation_json, cancellation_policy, active, created_at) VALUES (?, ?, 1, ?, ?, ?, ?, ?, 'Hyderabad', ?, ?, 'Free cancellation before vendor booking; provider costs may apply afterward.', 1, ?)").bind(catalogId, code, type, name, description, amount, tax, turnaround, JSON.stringify(preparation), now));
  await database.batch(statements);

  const dailyCount = await database.prepare("SELECT COUNT(*) AS count FROM wearable_daily WHERE member_id = ?").bind(identity.id).first<{ count: number }>();
  if (!dailyCount?.count) {
    const days: D1PreparedStatement[] = [];
    for (let offset = 34; offset >= 0; offset--) {
      const date = new Date(Date.UTC(2026, 7, 19 - offset));
      const day = date.toISOString().slice(0, 10);
      const wave = Math.sin(offset / 3.2);
      days.push(database.prepare("INSERT OR IGNORE INTO wearable_daily (id, member_id, provider, day, timezone, sleep_minutes, sleep_score, hrv_rmssd, resting_hr, steps, active_calories, workout_minutes, quality, raw_hash, created_at) VALUES (?, ?, 'oura', ?, 'Asia/Kolkata', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(`daily_${identity.id}_${day}`, identity.id, day, Math.round(444 + wave * 24 - (offset < 3 ? 24 : 0)), Math.round(79 + wave * 5), Number((44 + wave * 3 - (offset < 3 ? 5 : 0)).toFixed(1)), Number((57 - wave * 1.5 + (offset < 3 ? 2 : 0)).toFixed(1)), Math.round(8200 + wave * 1300), Math.round(420 + wave * 80), offset % 3 === 0 ? 38 : 18, .94, `seed-${day}`, now));
    }
    await database.batch(days);
  }
  const existingOrders = await database.prepare("SELECT id, status FROM orders WHERE member_id = ?").bind(identity.id).all<{ id: string; status: string }>();
  const events: D1PreparedStatement[] = [];
  for (const order of existingOrders.results) {
    events.push(database.prepare("INSERT OR IGNORE INTO order_events (id, order_id, member_id, status, actor_id, source, public_message, internal_note, occurred_at) VALUES (?, ?, ?, ?, 'system', 'migration', ?, '', ?)")
      .bind(`event_initial_${order.id}`, order.id, identity.id, order.status, `Current status: ${order.status.replaceAll("_", " ")}.`, now));
  }
  if (events.length) await database.batch(events);
}
