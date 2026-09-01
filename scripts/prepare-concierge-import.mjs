import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
const entities = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", micro: "µ", ge: "≥", le: "≤" };
const text = (html = "") => html.replace(/<span[^>]*class=["']mx["'][^>]*>.*?<\/span>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&([a-z]+);/gi, (_, key) => entities[key.toLowerCase()] ?? `&${key};`).replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code))).replace(/\s+/g, " ").trim();
const slug = (value) => text(value).toLowerCase().replace(/\([^)]*\)/g, " ").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 100);
const requiredEmail = (key) => { const value = String(process.env[key] ?? "").trim().toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error(`${key} is required`); return value; };

const aliases = [
  [/apolipoprotein b/i, "apob"], [/direct ldl|ldl cholesterol/i, "ldl"], [/fasting glucose|glucose, fasting/i, "fasting_glucose"], [/fasting insulin|insulin, fasting/i, "fasting_insulin"], [/homa.?ir/i, "homa_ir"], [/^ast\b|sgot/i, "ast"], [/^alt\b|sgpt/i, "alt"], [/^creatinine$/i, "creatinine"], [/waist/i, "waist"], [/vitamin d/i, "vitamin_d"], [/homocysteine/i, "homocysteine"], [/lipoprotein\(a\)/i, "lpa"], [/hba1c/i, "hba1c"], [/triglycerides/i, "triglycerides"], [/hdl cholesterol/i, "hdl"],
];
const conceptFor = (name) => aliases.find(([pattern]) => pattern.test(name))?.[1] ?? slug(name);
const domainFor = (panel, name) => {
  const value = `${panel} ${name}`.toLowerCase();
  if (/cardio|lipid|cholesterol|apolipoprotein|lipoprotein/.test(value)) return "cardiovascular";
  if (/glucose|insulin|metabol|homa/.test(value)) return "metabolic";
  if (/inflamm|allergy|immun|crp|esr/.test(value)) return "inflammation";
  if (/iron|blood count|hemoglobin|hematocrit|platelet|rbc|wbc/.test(value)) return "hematology";
  if (/liver|ast|alt|ggt|bilirubin/.test(value)) return "kidney_liver";
  if (/kidney|renal|creatinine|urea|egfr|electrolyte/.test(value)) return "kidney_liver";
  if (/thyroid|hormone|testosterone|prolactin|cortisol|psa/.test(value)) return "endocrine";
  if (/vitamin|mineral|folate|b12|magnesium|calcium|phosph/.test(value)) return "nutrition";
  return "general";
};

function markerRows(html, sourceFile, effectiveAt) {
  let panel = "Biomarkers";
  const rows = [];
  for (const line of html.split(/\r?\n/)) {
    const heading = line.match(/<h3[^>]*>(.*?)<\/h3>/i);
    if (heading) panel = text(heading[1]);
    if (!line.includes("marker-row")) continue;
    const nameMatch = line.match(/class=["']marker-name["'][^>]*>(.*?)<\/div>/i);
    const valueMatch = line.match(/class=["']num["'][^>]*>(.*?)<\/span>/i);
    if (!nameMatch || !valueMatch) continue;
    const name = text(nameMatch[1]);
    const displayed = text(valueMatch[1]);
    const unit = text(line.match(/class=["']unit["'][^>]*>(.*?)<\/span>/i)?.[1] ?? "") || null;
    const numeric = /^-?\d+(?:\.\d+)?$/.test(displayed) ? Number(displayed) : null;
    rows.push({ conceptCode: conceptFor(name), domain: domainFor(panel, name), valueNumber: numeric, valueText: numeric === null ? displayed : null, unit, effectiveAt, source: "Tata 1mg · reviewed legacy report", quality: "accepted", provenance: { sourceFile, panel, displayName: name, importedFrom: "reviewed_html_report", rawReportAvailable: true } });
  }
  return rows;
}

const journey = (finalProtocol, dnaStatus) => [
  { stepCode: "account", title: "Account created", detail: "Secure founding-cohort member profile", state: "complete", sortOrder: 1 },
  { stepCode: "intake", title: finalProtocol ? "Health intake complete" : "Complete your health intake", detail: finalProtocol ? "Deep context is integrated into your analysis" : "Your tailored questions are ready; answers are still pending", state: finalProtocol ? "complete" : "current", sortOrder: 2 },
  { stepCode: "tests", title: dnaStatus === "kit_at_home" ? "Bloodwork complete · DNA kit at home" : "Bloodwork complete", detail: dnaStatus === "not_opted" ? "DNA was not selected and is not required" : dnaStatus === "kit_at_home" ? "Complete and return the at-home DNA sample" : "Verified source data imported", state: dnaStatus === "kit_at_home" ? "current" : "complete", sortOrder: 3 },
  { stepCode: "wearables", title: "Connect a wearable", detail: "Optional: add Oura, WHOOP, Apple Health, Garmin, or an export", state: "future", sortOrder: 4 },
  { stepCode: "collection", title: "Blood collection complete", detail: "Laboratory results received and reviewed", state: "complete", sortOrder: 5 },
  { stepCode: "analysis", title: "Biomarker analysis ready", detail: "Verified results are integrated into your Biological Twin", state: "complete", sortOrder: 6 },
  { stepCode: "protocol", title: finalProtocol ? "Personal plan ready" : "Plan awaits your intake", detail: finalProtocol ? "Your reviewed 90-day protocol is available" : "Your preliminary analysis is ready; the plan remains provisional until intake and safety context are complete", state: finalProtocol ? "complete" : "future", sortOrder: 7 },
  { stepCode: "retest", title: "Review response", detail: "Retest and decide what to keep, change, stop, or repeat", state: finalProtocol ? "current" : "future", sortOrder: 8 },
];

const priority = (domain, state, metric, target, confidence = "Reviewed legacy analysis") => ({ domain, state, metric, target, confidence });
const sourceRows = (sourceDate, count, dnaStatus, intakeStatus) => [
  { sourceCode: "legacy_tata1mg", name: "Tata 1mg biomarker panel", category: "laboratory", status: "imported", lastSyncAt: `${sourceDate}T08:00:00.000Z`, coverage: 100, metadata: { reviewed: true, markerRows: count, provenance: "legacy_client_report" } },
  { sourceCode: "health_intake", name: "Health Intake", category: "self_reported", status: intakeStatus, coverage: intakeStatus === "complete" ? 100 : 0, metadata: { answersAvailable: intakeStatus === "complete" } },
  { sourceCode: "genetics_choice", name: "Longevity DNA", category: "genetics", status: dnaStatus, coverage: 0, metadata: { resultAvailable: false, selectionRecordedBy: "founder" } },
];

const ayushHtml = await readFile(resolve(root, "ayush.html"), "utf8");
const uditHtml = await readFile(resolve(root, "client-7.html"), "utf8");
const shubhangiHtml = await readFile(resolve(root, "client-8.html"), "utf8");
const ayushIntake = JSON.parse(await readFile(resolve(root, "examples/ayush-2026-06/intake.json"), "utf8"));
const ayushProtocol = JSON.parse(await readFile(resolve(root, "examples/ayush-2026-06/protocol.json"), "utf8"));
const ayushSafety = JSON.parse(await readFile(resolve(root, "examples/ayush-2026-06/safety.json"), "utf8"));
const ayushRoot = JSON.parse(await readFile(resolve(root, "examples/ayush-2026-06/rootcause.json"), "utf8"));

const ayushObservations = markerRows(ayushHtml, "ayush.html", "2026-06-07T08:00:00.000Z");
ayushObservations.push({ conceptCode: "waist", domain: "body_composition", valueNumber: ayushIntake.body_medical.waist_cm, valueText: null, unit: "cm", effectiveAt: "2026-06-17T16:49:40.000Z", source: "Health intake", quality: "accepted", provenance: { sourceFile: "examples/ayush-2026-06/intake.json", displayName: "Waist circumference", importedFrom: "completed_intake" } });
const uditObservations = markerRows(uditHtml, "client-7.html", "2026-08-02T08:00:00.000Z");
const shubhangiObservations = markerRows(shubhangiHtml, "client-8.html", "2026-08-06T08:00:00.000Z");

const ayushCanonicalIntake = [
  ["primary_goal", "goals", ayushIntake.identity.primary_goal_verbatim], ["desired_outcomes", "goals", ayushIntake.constraints.ninety_day_goal_verbatim], ["birth_sex", "identity", ayushIntake.identity.sex_at_birth],
  ["height", "body", ayushIntake.body_medical.height_cm], ["weight", "body", ayushIntake.body_medical.weight_kg], ["waist", "body", ayushIntake.body_medical.waist_cm],
  ["diagnoses", "medical", ayushIntake.body_medical.known_conditions], ["medications", "medical", ayushIntake.body_medical.current_medications], ["allergies", "medical", ayushIntake.body_medical.allergies_intolerances],
  ["diet_pattern", "nutrition", ayushIntake.diet], ["cuisine_restrictions", "nutrition", ayushIntake.constraints.foods_cannot_wont_eat], ["protein_fibre", "nutrition", { protein: ayushIntake.diet.main_protein_sources, vegetables: ayushIntake.diet.vegetable_servings_per_day, fruit: ayushIntake.diet.fruit_per_day, legumes: ayushIntake.diet.legumes_frequency }], ["meal_timing", "nutrition", { first: ayushIntake.diet.typical_first_meal_time, last: ayushIntake.diet.typical_last_meal_time, fasting: ayushIntake.diet.fasting_pattern }],
  ["training", "activity", ayushIntake.exercise], ["injuries", "activity", ayushIntake.exercise.injuries_limitations], ["sleep_window", "sleep", { weekday: `${ayushIntake.sleep_recovery.weekday_bedtime}-${ayushIntake.sleep_recovery.weekday_wake}`, weekend: `${ayushIntake.sleep_recovery.weekend_bedtime}-${ayushIntake.sleep_recovery.weekend_wake}` }], ["snoring", "sleep", { snoring: ayushIntake.sleep_recovery.snoring, apneaSignals: ayushIntake.sleep_recovery.apnea_signals }],
  ["stress", "mind", ayushIntake.stress_mood_mind?.stress_level_1_to_10 ?? ayushIntake.mental_health?.stress_level_1_to_10], ["cognition", "mind", ayushIntake.energy_mens_health], ["environment", "environment", ayushIntake.environment], ["constraints", "constraints", ayushIntake.constraints], ["readiness", "coaching", { motivation: ayushIntake.identity.motivation_1_to_10, timeMinutes: ayushIntake.identity.time_available_daily_minutes }],
].filter(([, , answer]) => answer !== undefined && answer !== null).map(([questionCode, module, answer]) => ({ questionCode, module, answer }));

const ayushActions = ayushProtocol.ninety_day_habit_stack.map((phase, index) => ({ domain: index === 0 ? "recovery" : index === 1 ? "activity" : index === 2 ? "nutrition" : "mind", dayOfWeek: 0, scheduledTime: "08:00", title: `${phase.weeks} · ${phase.habits[0]}`, detail: phase.habits.join("\n"), reason: phase.coach_check_in_focus, target: `Coach review: ${phase.coach_check_in_days}`, sortOrder: index + 1 }));

const members = [
  {
    email: requiredEmail("AYUSH_LOGIN_EMAIL"), fullName: "Ayush Bhaskar", primaryGoal: ayushIntake.identity.primary_goal_verbatim, intake: ayushCanonicalIntake, observations: ayushObservations,
    sources: sourceRows("2026-06-07", ayushObservations.length, "not_opted", "complete"), journey: journey(true, "not_opted"),
    report: { title: "Complete biomarker and longevity analysis", sourceDate: "2026-06-07", overview: `Biological age ${ayushProtocol.headline.bio_age}, ${Math.abs(ayushProtocol.headline.delta_years)} years younger than calendar age. The reviewed analysis identifies cardiovascular particle burden, iron depletion, atopic context, and under-recovery as the main priorities.`, deepDive: { version: 2, sourceStatus: "finalized_post_intake", phenotype: ayushProtocol.headline, overview: { priorities: [priority("Cardiovascular", "Priority", "ApoB, LDL and inherited Lp(a) context", "Lower ApoB while preserving performance"), priority("Iron status", "Physician review", "Low iron stores and saturation", "Clarify cause before therapeutic iron"), priority("Recovery", "Under-recovered", "Short sleep relative to training load", "7-7.5 hours and one recovery day")], reassuring: ["Biological age trajectory", "Glucose control", "Kidney and liver function"] }, domains: ayushProtocol.root_attack_pillars.map((item, index) => ({ code: `root_${index + 1}`, label: item.name, status: index === 0 ? "priority" : "watch", state: item.root_mechanism, trend: "baseline", confidence: .9, metric: item.expected_to_shift.join(", "), value: "Baseline", unit: "", target: item.anchor_interventions[0], evidence: { anchorInterventions: item.anchor_interventions } })), observations: ayushObservations, sourceIntake: ayushIntake, rootCause: ayushRoot, safety: ayushSafety, method: { engine: "tessera-pipeline", status: "finalized", source: "examples/ayush-2026-06" } } },
    protocol: { title: "Personalized 90-day protocol", strategy: ayushProtocol.goal_alignment.how_protocol_serves_it, startedAt: "2026-06-17", endsAt: "2026-09-15", actions: ayushActions }, geneticsOrder: null,
  },
  {
    email: requiredEmail("UDIT_LOGIN_EMAIL"), fullName: "Udit", primaryGoal: "Complete tailored intake and act on the reviewed cardiovascular, methylation, inflammation, and vitamin D findings.", intake: [], observations: uditObservations,
    sources: sourceRows("2026-08-02", uditObservations.length, "kit_at_home", "pending"), journey: journey(false, "kit_at_home"),
    report: { title: "Complete biomarker analysis · intake pending", sourceDate: "2026-08-02", overview: "The reviewed bloodwork identifies severe vitamin D deficiency, an atherogenic lipid pattern with elevated Lp(a), high homocysteine with low-normal B12 context, and inflammation that should be confirmed when well. The intervention plan remains provisional until the tailored intake and safety context are completed.", deepDive: { version: 2, sourceStatus: "reviewed_pre_intake", overview: { priorities: [priority("Vitamin D", "Act first", "25-OH vitamin D 7.8 ng/mL", "Clinician-guided correction and retest"), priority("Cardiovascular", "High-confidence pattern", "ApoB 122 mg/dL · LDL 168 mg/dL · TG 193 mg/dL", "Discuss risk reduction with a physician"), priority("Methylation", "Review", "Homocysteine 23.3 µmol/L · B12 222 pg/mL", "Clarify and correct contributors"), priority("Inflammation", "Confirm", "hs-CRP 5.44 mg/L", "Repeat when well and without hard training")], reassuring: ["Fasting glucose", "Kidney filtration", "Blood count"] }, domains: [], observations: uditObservations, limitations: ["Tailored intake answers are not yet available.", "The protocol is provisional until medications, symptoms, family history, diet, training, and constraints are reviewed."], method: { engine: "legacy-reviewed-report", status: "pre_intake", source: "client-7.html" } } },
    protocol: null,
    geneticsOrder: { productName: "Longevity Genetics Array", status: "delivered", reference: "AL-UDIT-DNA-2026", vendor: "Genomics partner", amountPaise: 0, paymentStatus: "paid", publicMessage: "Your DNA kit is at home. Complete the sample, register it, and return it using the kit instructions.", metadata: { stage: "kit_at_home", amountUnknown: true, optedIn: true, resultAvailable: false } },
  },
  {
    email: requiredEmail("SHUBHANGI_LOGIN_EMAIL"), fullName: "Shubhangi", primaryGoal: "Complete tailored intake and act on the reviewed insulin-sensitivity, nutrient, hormone, and inflammation findings.", intake: [], observations: shubhangiObservations,
    sources: sourceRows("2026-08-06", shubhangiObservations.length, "not_opted", "pending"), journey: journey(false, "not_opted"),
    report: { title: "Complete biomarker analysis · intake pending", sourceDate: "2026-08-06", overview: "Most measured systems are reassuring. The reviewed analysis identifies early compensated insulin resistance, nutrient and iron gaps, two hormone results that need repeat context, and inflammation/allergy signals worth confirming. The plan remains provisional until the tailored intake and cycle context are completed.", deepDive: { version: 2, sourceStatus: "reviewed_pre_intake", overview: { priorities: [priority("Metabolic", "Act first", "Fasting insulin and HOMA-IR pattern", "Improve insulin sensitivity and confirm trend"), priority("Hormones", "Repeat and review", "Prolactin and thyroid context", "Repeat with menstrual-cycle and medication context"), priority("Nutrients", "Replete carefully", "Folate, vitamin D and iron stores", "Confirm intake and clinician-safe correction"), priority("Inflammation", "Confirm", "Low-grade and allergic inflammation", "Repeat when well")], reassuring: ["Low cardiovascular particle burden", "Liver function", "Kidney function"] }, domains: [], observations: shubhangiObservations, limitations: ["Tailored intake answers and menstrual-cycle context are not yet available.", "The protocol is provisional until medications, symptoms, reproductive context, diet, training, and constraints are reviewed."], method: { engine: "legacy-reviewed-report", status: "pre_intake", source: "client-8.html" } } },
    protocol: null, geneticsOrder: null,
  },
];

process.stdout.write(JSON.stringify({ members }));
