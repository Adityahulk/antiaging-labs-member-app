export type ImportedObservation = { conceptCode: string; domain: string; valueNumber: number | null; valueText?: string | null; unit?: string | null; effectiveAt: string; source: string; quality: "accepted" | "needs_review"; metadata?: Record<string, unknown> };
export type ImportedWearableDay = { day: string; provider: string; timezone: string; sleepMinutes?: number; sleepScore?: number; hrvRmssd?: number; restingHr?: number; steps?: number; activeCalories?: number; workoutMinutes?: number; quality: number; rawHash: string };

const labAliases: Record<string, { code: string; domain: string; unit: string }> = {
  "apob": { code: "apob", domain: "cardiovascular", unit: "mg/dL" }, "apolipoprotein b": { code: "apob", domain: "cardiovascular", unit: "mg/dL" },
  "fasting insulin": { code: "fasting_insulin", domain: "metabolic", unit: "µIU/mL" }, "insulin fasting": { code: "fasting_insulin", domain: "metabolic", unit: "µIU/mL" },
  "fasting glucose": { code: "fasting_glucose", domain: "metabolic", unit: "mg/dL" }, "glucose fasting": { code: "fasting_glucose", domain: "metabolic", unit: "mg/dL" },
  "hba1c": { code: "hba1c", domain: "metabolic", unit: "%" }, "hemoglobin a1c": { code: "hba1c", domain: "metabolic", unit: "%" },
  "triglycerides": { code: "triglycerides", domain: "cardiovascular", unit: "mg/dL" }, "hdl": { code: "hdl", domain: "cardiovascular", unit: "mg/dL" },
  "ldl": { code: "ldl", domain: "cardiovascular", unit: "mg/dL" }, "creatinine": { code: "creatinine", domain: "safety", unit: "mg/dL" },
  "alt": { code: "alt", domain: "safety", unit: "U/L" }, "ast": { code: "ast", domain: "safety", unit: "U/L" }, "vitamin d": { code: "vitamin_d", domain: "nutrition", unit: "ng/mL" },
};

function dayFrom(value: unknown) { const parsed = new Date(String(value)); return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString(); }
function number(value: unknown) { const parsed = Number(String(value).replace(/,/g, "").match(/-?\d+(\.\d+)?/)?.[0]); return Number.isFinite(parsed) ? parsed : undefined; }
function splitCsvLine(line: string) { const cells: string[] = []; let value = "", quoted = false; for (let i = 0; i < line.length; i++) { const char = line[i]; if (char === '"') quoted = !quoted; else if (char === "," && !quoted) { cells.push(value.trim()); value = ""; } else value += char; } cells.push(value.trim()); return cells; }

export async function hashText(text: string) { const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)); return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join(""); }

export async function parseHealthFile(text: string, type: string, fileName: string) {
  if (type === "apple_health" || /apple.*health|export\.xml/i.test(fileName)) return parseAppleHealth(text);
  if (type === "garmin" || /garmin|\.tcx$/i.test(fileName)) return parseGarmin(text);
  if (type === "lab_report" || /lab|report|biomarker/i.test(fileName)) return { observations: parseLabs(text), wearableDays: [] as ImportedWearableDay[] };
  if (/\.json$/i.test(fileName)) return parseJsonExport(text);
  return parseCsvExport(text, type);
}

export function parseLabs(text: string): ImportedObservation[] {
  const results: ImportedObservation[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.toLowerCase().replace(/\s+/g, " ").trim();
    for (const [alias, definition] of Object.entries(labAliases)) {
      if (!line.includes(alias)) continue;
      const after = rawLine.slice(line.indexOf(alias) + alias.length);
      const value = number(after);
      if (value === undefined) continue;
      results.push({ conceptCode: definition.code, domain: definition.domain, valueNumber: value, unit: definition.unit, effectiveAt: new Date().toISOString(), source: "Uploaded lab", quality: "needs_review", metadata: { extractedLine: rawLine.trim(), parser: "lab-text-v1" } });
      break;
    }
  }
  const glucose = results.find((item) => item.conceptCode === "fasting_glucose")?.valueNumber;
  const insulin = results.find((item) => item.conceptCode === "fasting_insulin")?.valueNumber;
  if (glucose && insulin) results.push({ conceptCode: "homa_ir", domain: "metabolic", valueNumber: Number(((glucose * insulin) / 405).toFixed(2)), effectiveAt: new Date().toISOString(), source: "Calculated", quality: "needs_review", metadata: { formula: "fasting glucose mg/dL × fasting insulin µIU/mL ÷ 405", inputs: { glucose, insulin } } });
  return dedupe(results);
}

async function parseAppleHealth(text: string) {
  const byDay = new Map<string, ImportedWearableDay>(); const hash = await hashText(text);
  const record = /<Record\s+([^>]+?)\/?\s*>/g; let match: RegExpExecArray | null;
  while ((match = record.exec(text))) {
    const attrs = Object.fromEntries(Array.from(match[1].matchAll(/(\w+)="([^"]*)"/g)).map((item) => [item[1], item[2]]));
    const day = (attrs.startDate ?? attrs.endDate ?? "").slice(0, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    const current = byDay.get(day) ?? { day, provider: "apple_health", timezone: "local", quality: .9, rawHash: hash };
    const value = number(attrs.value); const type = attrs.type ?? "";
    if (type.includes("StepCount") && value !== undefined) current.steps = (current.steps ?? 0) + value;
    if (type.includes("RestingHeartRate") && value !== undefined) current.restingHr = value;
    if (type.includes("ActiveEnergyBurned") && value !== undefined) current.activeCalories = (current.activeCalories ?? 0) + value;
    if (type.includes("HeartRateVariabilitySDNN") && value !== undefined) (current as ImportedWearableDay & { hrvSdnn?: number }).hrvSdnn = value;
    byDay.set(day, current);
  }
  return { observations: [] as ImportedObservation[], wearableDays: Array.from(byDay.values()) };
}

async function parseGarmin(text: string) {
  if (!text.includes("<TrainingCenterDatabase") && text.includes(",")) return parseCsvExport(text, "garmin");
  const hash = await hashText(text); const byDay = new Map<string, ImportedWearableDay>();
  for (const match of text.matchAll(/<Activity[\s\S]*?<Id>([^<]+)<\/Id>[\s\S]*?<TotalTimeSeconds>([\d.]+)<\/TotalTimeSeconds>[\s\S]*?<AverageHeartRateBpm>[\s\S]*?<Value>([\d.]+)<\/Value>/g)) {
    const iso = dayFrom(match[1]); const day = iso.slice(0, 10); const current = byDay.get(day) ?? { day, provider: "garmin", timezone: "local", quality: .88, rawHash: hash };
    current.workoutMinutes = (current.workoutMinutes ?? 0) + Number(match[2]) / 60; (current as ImportedWearableDay & { averageWorkoutHr?: number }).averageWorkoutHr = Number(match[3]); byDay.set(day, current);
  }
  return { observations: [] as ImportedObservation[], wearableDays: Array.from(byDay.values()) };
}

async function parseCsvExport(text: string, provider: string) {
  const lines = text.split(/\r?\n/).filter(Boolean); if (lines.length < 2) return { observations: parseLabs(text), wearableDays: [] as ImportedWearableDay[] };
  const headers = splitCsvLine(lines[0]).map((cell) => cell.toLowerCase().replace(/[^a-z0-9]+/g, "_")); const hash = await hashText(text); const wearableDays: ImportedWearableDay[] = [];
  for (const line of lines.slice(1)) { const cells = splitCsvLine(line); const row = Object.fromEntries(headers.map((header, index) => [header, cells[index]])); const rawDate = row.date ?? row.day ?? row.start_date ?? row.timestamp; if (!rawDate) continue; const day = dayFrom(rawDate).slice(0, 10); wearableDays.push({ day, provider: provider || "csv", timezone: row.timezone || "local", sleepMinutes: number(row.sleep_minutes ?? row.total_sleep_minutes), sleepScore: number(row.sleep_score), hrvRmssd: number(row.hrv_rmssd ?? row.average_hrv), restingHr: number(row.resting_heart_rate ?? row.resting_hr), steps: number(row.steps), activeCalories: number(row.active_calories), workoutMinutes: number(row.workout_minutes ?? row.duration_minutes), quality: .85, rawHash: hash }); }
  return { observations: [] as ImportedObservation[], wearableDays };
}

async function parseJsonExport(text: string) {
  const value = JSON.parse(text) as unknown; const rows = Array.isArray(value) ? value : typeof value === "object" && value ? Object.values(value as Record<string, unknown>).find(Array.isArray) ?? [] : [];
  return parseCsvExport(["date,sleep_minutes,sleep_score,hrv_rmssd,resting_hr,steps,active_calories,workout_minutes", ...(rows as Array<Record<string, unknown>>).map((row) => [row.date ?? row.day ?? row.timestamp, row.sleep_minutes, row.sleep_score, row.hrv_rmssd, row.resting_hr, row.steps, row.active_calories, row.workout_minutes].join(","))].join("\n"), "json");
}

function dedupe(items: ImportedObservation[]) { const map = new Map<string, ImportedObservation>(); for (const item of items) map.set(item.conceptCode, item); return Array.from(map.values()); }
