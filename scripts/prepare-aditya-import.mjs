import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
const email = String(process.env.ADITYA_LOGIN_EMAIL ?? "").trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("ADITYA_LOGIN_EMAIL is required");
const read = (name) => readFile(resolve(root, `examples/aditya-2026-05/${name}.json`), "utf8").then(JSON.parse);
const [intake, biomarkers, protocol, rootCause, safety, manifest] = await Promise.all(["intake", "biomarkers", "protocol", "rootcause", "safety", "run-manifest"].map(read));

const domainFor = (category = "", code = "") => {
  const value = `${category} ${code}`.toLowerCase();
  if (/lipid|cardio|apob|cholesterol|lpa/.test(value)) return "cardiovascular";
  if (/glucose|insulin|homa|metabolic/.test(value)) return "metabolic";
  if (/liver|kidney|renal|creatinine|ast|alt|ggt/.test(value)) return "kidney_liver";
  if (/vitamin|mineral|nutrient|iron/.test(value)) return "nutrition";
  if (/thyroid|hormone|testosterone|cortisol/.test(value)) return "endocrine";
  if (/immune|inflamm|allergy|crp|eosinophil/.test(value)) return "inflammation";
  if (/blood|cbc|hemat|rbc|wbc|platelet/.test(value)) return "hematology";
  return "general";
};
const sourceDate = manifest.blood_draw_date;
const effectiveAt = `${sourceDate}T08:00:00.000Z`;
const canonicalCode = (code) => ({ glucose_fasting: "fasting_glucose", insulin_fasting: "fasting_insulin", apo_b: "apob" }[code] ?? code);
const observations = biomarkers.markers.map((marker) => ({
  conceptCode: canonicalCode(marker.code),
  domain: domainFor(marker.category, canonicalCode(marker.code)),
  valueNumber: typeof marker.value === "number" ? marker.value : null,
  valueText: typeof marker.value === "number" ? null : String(marker.value ?? marker.raw_value ?? ""),
  unit: marker.unit ?? marker.raw_unit ?? null,
  effectiveAt,
  source: "Tata 1mg · reviewed pipeline report",
  quality: "accepted",
  provenance: { sourceFile: "examples/aditya-2026-05/biomarkers.json", displayName: marker.display_name, category: marker.category, tier: marker.tier, parserVersion: biomarkers.parser_version, rawReportAvailable: true },
})).filter((marker) => marker.valueNumber !== null || marker.valueText);
const intakeAnswers = [
  ["primary_goal", "goals", intake.identity.primary_goal],
  ["birth_sex", "identity", intake.identity.sex_at_birth],
  ["age", "identity", intake.identity.age],
  ["city", "identity", intake.identity.city],
  ["body_medical", "medical", intake.body_medical],
  ["diet_pattern", "nutrition", intake.diet],
  ["training", "activity", intake.exercise],
  ["sleep_stress", "sleep", intake.sleep_stress],
  ["hpi", "medical", intake.hpi],
  ["family_history", "medical", intake.family],
  ["constraints", "constraints", intake.constraints],
  ["environment", "environment", intake.environment],
  ["mental_health", "mind", intake.mental_health],
  ["readiness", "coaching", { motivation: intake.identity.motivation_1_to_10, timeMinutes: intake.identity.time_available_daily_minutes }],
].filter(([, , answer]) => answer !== undefined && answer !== null).map(([questionCode, module, answer]) => ({ questionCode, module, answer }));
const actions = protocol.ninety_day_habit_stack.map((phase, index) => ({
  domain: index === 0 || index === 1 ? "recovery" : index === 2 ? "activity" : "coaching",
  dayOfWeek: 0,
  scheduledTime: "08:00",
  title: `${phase.weeks} · ${phase.habits[0]}`,
  detail: phase.habits.join("\n"),
  reason: "Reviewed personalized 90-day habit stack.",
  target: `Complete phase ${phase.weeks}`,
  sortOrder: index + 1,
}));
const priorities = rootCause.root_nodes.map((item, index) => ({
  domain: item.name,
  state: index === 0 ? "Priority" : "Review",
  metric: item.root_driver,
  target: item.intervention_class,
  confidence: item.confidence,
}));
const journey = [
  ["account", "Account created", "Secure founding-cohort member profile", "complete", 1],
  ["intake", "Health intake complete", "Deep context is integrated into your analysis", "complete", 2],
  ["tests", "Bloodwork complete", "Laboratory results received and reviewed", "complete", 3],
  ["wearables", "Connect a wearable", "Optional: add Oura, WHOOP, Apple Health, Garmin, or an export", "future", 4],
  ["collection", "Blood collection complete", "Laboratory results received and reviewed", "complete", 5],
  ["analysis", "Biomarker analysis ready", "Verified results are integrated into your Biological Twin", "complete", 6],
  ["protocol", "Personal plan ready", "Your reviewed 90-day protocol is available", "complete", 7],
  ["retest", "Review response", "Retest and decide what to keep, change, stop, or repeat", "current", 8],
].map(([stepCode, title, detail, state, sortOrder]) => ({ stepCode, title, detail, state, sortOrder }));

const primaryGoal = intake.identity.primary_goal.map((goal) => goal.replaceAll("_", " ")).join(", ");
const bundle = {
  email,
  fullName: "Aditya Raj",
  primaryGoal,
  resetPassword: String(process.env.ADITYA_TEMP_PASSWORD ?? ""),
  intake: intakeAnswers,
  observations,
  sources: [
    { sourceCode: "legacy_tata1mg", name: "Tata 1mg biomarker panel", category: "laboratory", status: "imported", lastSyncAt: effectiveAt, coverage: 100, metadata: { reviewed: true, markerRows: observations.length, provenance: "tessera_pipeline", rawReportChecksum: biomarkers.source_pdf_sha256 } },
    { sourceCode: "health_intake", name: "Health Intake", category: "self_reported", status: "complete", lastSyncAt: intake.collected_at_utc, coverage: 100, metadata: { answersAvailable: true, intakeVersion: intake.intake_version } },
  ],
  journey,
  report: {
    title: "Complete biomarker and longevity analysis",
    sourceDate,
    overview: `Biological age ${protocol.headline.bio_age}, ${Math.abs(protocol.headline.delta_years)} years younger than calendar age. The reviewed analysis identifies vitamin D status, circadian alignment, and atopic context as the main priorities.`,
    deepDive: { version: 2, sourceStatus: "finalized_post_intake", phenotype: protocol.headline, overview: { priorities, reassuring: ["Metabolic profile", "Kidney and liver markers", "Thyroid context"] }, domains: protocol.root_attack_pillars.map((item, index) => ({ code: `root_${index + 1}`, label: item.name, status: index === 0 ? "priority" : "watch", state: item.root_mechanism, trend: "baseline", confidence: .9, metric: item.expected_to_shift.join(", "), value: "Baseline", unit: "", target: item.anchor_interventions[0], evidence: { anchorInterventions: item.anchor_interventions } })), observations, sourceIntake: intake, rootCause, safety, method: { engine: "tessera-pipeline", status: "finalized", source: "examples/aditya-2026-05" } },
  },
  protocol: { title: "Personalized 90-day protocol", strategy: protocol.headline.voice, startedAt: intake.collected_at_utc.slice(0, 10), endsAt: "2026-08-12", actions },
};
process.stdout.write(JSON.stringify({ members: [bundle] }));
