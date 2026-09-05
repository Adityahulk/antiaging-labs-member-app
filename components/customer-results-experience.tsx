"use client";

import { useState } from "react";
import { useAppData } from "./app-provider";

type Row = Record<string, unknown>;
const readable = (value: unknown) => String(value ?? "").replaceAll("_", " ");
const dateRange = (start: unknown, end: unknown) => { const format = (value: unknown) => value ? new Date(String(value)).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "unknown"; return `${format(start)} – ${format(end)}`; };
const trendMeta: Record<string, { label: string; direction: "lower" | "higher" | "context" }> = {
  apob: { label: "ApoB", direction: "lower" }, homa_ir: { label: "Insulin resistance (HOMA-IR)", direction: "lower" }, resting_hr_28d: { label: "Resting heart rate", direction: "lower" }, resting_hr: { label: "Resting heart rate", direction: "lower" }, sleep_duration_28d: { label: "Sleep duration", direction: "higher" }, sleep_minutes: { label: "Sleep duration", direction: "higher" }, hrv_28d: { label: "Heart-rate variability", direction: "higher" }, hrv: { label: "Heart-rate variability", direction: "higher" }, steps_28d: { label: "Daily steps", direction: "higher" }, steps: { label: "Daily steps", direction: "higher" },
};

export function CustomerResultsExperience() {
  const { data, refresh } = useAppData();
  const [notice, setNotice] = useState("");
  const [decisions, setDecisions] = useState<Record<string, "keep" | "change" | "stop">>({});
  const assessments = data?.responseState?.responseAssessments ?? [];
  const interventions = data?.responseState?.interventions ?? [];
  const trends = data?.phase3.outcomes ?? [];
  const activeExperiment = data?.phase3.experiments.find((item) => item.status === "active");
  const activeIntervention = interventions.find((item) => item.status === "active");
  const periods = (activeExperiment?.periods as Row[] | undefined) ?? [];
  const completed = periods.filter((period) => Boolean(period.completed)).length;
  const exposureRows = (activeIntervention?.exposures as Row[] | undefined) ?? [];
  const recorded = periods.length ? completed : exposureRows.filter((item) => Boolean(item.completed)).length;
  const planned = periods.length || exposureRows.length;
  const consent = Boolean(data?.phase3.researchConsent?.granted);
  const conclusive = assessments.filter((item) => !Array.isArray(item.insufficiencyReasonsJson) || item.insufficiencyReasonsJson.length === 0).length;
  const uncertain = Math.max(assessments.length - conclusive, 0);
  const planDecisions = interventions.filter((item) => ["keep", "change", "stop"].includes(String(item.memberDecision ?? item.decision ?? ""))).length;

  const chooseDecision = async (assessment: Row, decision: "keep" | "change" | "stop") => {
    const id = String(assessment.id);
    const interventionId = String(assessment.interventionEpisodeId ?? "");
    if (!interventionId) { setNotice("This result has no linked intervention, so a decision cannot be saved yet."); return; }
    setDecisions((current) => ({ ...current, [id]: decision }));
    const response = await fetch(`/api/interventions/${interventionId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "decide", decision, reason: `Member chose ${decision} after reviewing result ${id}` }) });
    const result = await response.json() as { error?: string };
    if (!response.ok) { setNotice(result.error || "The decision could not be saved."); return; }
    setNotice(`Your “${decision}” decision was saved to this experiment.`); await refresh();
  };

  const updateConsent = async (granted: boolean) => { await fetch("/api/research/consent", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ granted }) }); setNotice(granted ? "Optional research contribution enabled." : "Research contribution stopped."); await refresh(); };

  return <>
    {notice ? <p className="workflow-notice" role="status">{notice}</p> : null}
    <section className="learning-memory-hero"><div><span className="card-kicker">SO FAR</span><h2>What changed for you.</h2></div><dl><div><dt>Learnings</dt><dd>{assessments.length}</dd></div><div><dt>Useful signals</dt><dd>{conclusive}</dd></div><div><dt>Still uncertain</dt><dd>{uncertain}</dd></div><div><dt>Plan decisions</dt><dd>{planDecisions}</dd></div></dl></section>
    {!assessments.length ? <section className="paper-card result-readiness"><div><span className="card-kicker">FIRST LEARNING</span><h2>{activeExperiment || activeIntervention ? "This learning isn’t ready yet." : "The first result needs one clean comparison."}</h2><p>{activeExperiment || activeIntervention ? "Keep the assigned days until enough routines and outcomes are recorded." : "Trends can move. A linked before-and-after test shows whether one change worked."}</p><a className="primary-button" href="/plan">{activeExperiment || activeIntervention ? "Complete today’s action" : "Choose a focus"}<span>→</span></a></div><div className="result-progress"><strong>{recorded}<small>/{planned || "—"}</small></strong><span>useful days recorded</span><div><i style={{ width: planned ? `${Math.round(recorded / planned * 100)}%` : "0%" }}/></div><p>{planned ? `${Math.max(planned - recorded, 0)} days remain in this cycle` : "A schedule has not been created yet"}</p></div></section> : <section className="result-section-head"><span className="card-kicker">LEARNED</span><h2>Responses tied to a specific change</h2></section>}

    {assessments.length ? <section className="experiment-result-list">{assessments.map((assessment) => <ExperimentResultCard key={String(assessment.id)} item={assessment} intervention={interventions.find((candidate) => candidate.id === assessment.interventionEpisodeId)} decision={decisions[String(assessment.id)]} onDecision={(decision) => void chooseDecision(assessment, decision)} />)}</section> : null}

    <section className="paper-card health-trends"><div className="section-head compact"><div><span className="card-kicker">CHANGES WORTH NOTICING</span><h2>Movement that may shape the next question</h2><p>These trends are not linked to one change. They do not prove why anything moved.</p></div><span className="eta-chip">{trends.length} trends</span></div>{trends.length ? <><div className="trend-list">{trends.slice(0, 3).map((trend) => <TrendRow key={String(trend.id)} item={trend} />)}</div>{trends.length > 3 ? <details className="more-trends"><summary>See {trends.length - 3} more health trends</summary><div className="trend-list">{trends.slice(3).map((trend) => <TrendRow key={String(trend.id)} item={trend} />)}</div></details> : null}</> : <p>No reliable longitudinal comparisons are available yet.</p>}</section>

    <section className="progress-controls customer-result-controls"><details className="paper-card"><summary><span><span className="card-kicker">OPTIONAL RESEARCH</span><strong>Contribute de-identified results</strong></span><i>{consent ? "On" : "Off"}</i></summary><p>Only de-identified outcome rows enter cohort analytics. Small groups are suppressed. This does not change your experience.</p><label className="consent-toggle"><input type="checkbox" checked={consent} onChange={(event) => void updateConsent(event.target.checked)} /><span/><strong>{consent ? "Contributing" : "Not contributing"}</strong></label></details><article className="paper-card"><span className="card-kicker">NEED HELP?</span><h2>Ask about one result.</h2><a href="/ask?topic=results">Ask about my results →</a></article></section>
  </>;
}

function ExperimentResultCard({ item, intervention, decision, onDecision }: { item: Row; intervention?: Row; decision?: "keep" | "change" | "stop"; onDecision: (decision: "keep" | "change" | "stop") => void }) {
  const confounders = Array.isArray(item.confoundersJson) ? item.confoundersJson as unknown[] : [];
  const insufficient = Array.isArray(item.insufficiencyReasonsJson) ? item.insufficiencyReasonsJson as unknown[] : [];
  const hasComparison = item.baselineValue !== null && item.baselineValue !== undefined && item.comparisonValue !== null && item.comparisonValue !== undefined;
  const percent = item.percentChange === null || item.percentChange === undefined ? null : Number(item.percentChange);
  return <article className="paper-card experiment-result-card"><header><div><span className="card-kicker">PERSONAL LEARNING · {readable(item.primaryOutcomeCode ?? "response")}</span><h2>{String(intervention?.title ?? "Your measured response")}</h2></div><span className="change-pill neutral">{percent === null ? readable(item.status) : `${percent > 0 ? "+" : ""}${percent.toFixed(1)}%`}</span></header><p className="result-conclusion">{String(item.conclusion ?? "There is not enough data for a reviewed conclusion yet.")}</p><div className="result-comparison"><span><small>YOUR BASELINE</small><strong>{hasComparison ? `${Number(item.baselineValue).toFixed(1)} ${String(item.unit ?? "")}` : "Insufficient data"}</strong><i>{dateRange(item.baselineStart, item.baselineEnd)}</i></span><b>→</b><span><small>WITH THIS CHANGE</small><strong>{hasComparison ? `${Number(item.comparisonValue).toFixed(1)} ${String(item.unit ?? "")}` : "Insufficient data"}</strong><i>{dateRange(item.comparisonStart, item.comparisonEnd)}</i></span></div><div className="result-confidence"><span><small>How certain are we?</small><strong>{readable(item.attributionGrade ?? "unknown")}</strong></span><span><small>How consistently?</small><strong>{Number.isFinite(Number(item.adherence)) ? `${Math.round(Number(item.adherence) * 100)}%` : "Unknown"}</strong></span><span><small>Usable data</small><strong>{Number.isFinite(Number(item.dataQuality)) ? `${Math.round(Number(item.dataQuality) * 100)}%` : "Unknown"}</strong></span></div>{insufficient.length ? <p className="result-caution"><strong>Why this remains uncertain:</strong> {insufficient.map(String).join("; ")}</p> : null}<details className="result-evidence"><summary>What else may have affected this?</summary><p><strong>Likely range:</strong> {item.lowerBound !== null && item.lowerBound !== undefined && item.upperBound !== null && item.upperBound !== undefined ? `${Number(item.lowerBound).toFixed(1)} to ${Number(item.upperBound).toFixed(1)} ${String(item.unit ?? "")}` : "Not available"}</p><p><strong>Unusual context:</strong> {confounders.length ? confounders.map(String).join("; ") : "None was recorded. That does not prove none occurred."}</p></details><fieldset className="result-decision"><legend>Should this enter your plan?</legend>{(["keep", "change", "stop"] as const).map((value) => <button key={value} type="button" className={decision === value ? "active" : ""} aria-pressed={decision === value} onClick={() => onDecision(value)}>{value === "keep" ? "Add & confirm" : value === "change" ? "Adjust & test again" : "Do not keep"}</button>)}</fieldset></article>;
}

function TrendRow({ item }: { item: Row }) {
  const code = String(item.targetCode ?? "health metric");
  const meta = trendMeta[code] ?? { label: readable(code), direction: "context" as const };
  const base = Number(item.baselineValue);
  const current = Number(item.currentValue);
  const change = current - base;
  const percent = item.percentChange === null || item.percentChange === undefined ? null : Number(item.percentChange);
  const favorable = meta.direction === "context" ? null : meta.direction === "higher" ? change > 0 : change < 0;
  const directionCopy = change === 0 ? "No material movement" : favorable === null ? "Direction needs context" : favorable ? "Generally favorable direction" : "Generally less favorable direction";
  return <article className="trend-row"><div><strong>{meta.label}</strong><small>{directionCopy}</small></div><div className="trend-values"><span>{base.toFixed(1)} <small>{String(item.unit ?? "")}</small></span><i>→</i><span>{current.toFixed(1)} <small>{String(item.unit ?? "")}</small></span></div><span className={`trend-change ${favorable === true ? "favorable" : favorable === false ? "unfavorable" : "neutral"}`}>{percent === null ? `${change > 0 ? "+" : ""}${change.toFixed(1)}` : `${percent > 0 ? "+" : ""}${percent.toFixed(1)}%`}</span><footer>{new Date(String(item.baselineAt)).toLocaleDateString()} – {new Date(String(item.currentAt)).toLocaleDateString()} · {Math.round(Number(item.quality ?? 0) * 100)}% data quality</footer></article>;
}
