"use client";
import { useEffect, useMemo, useState } from "react";
import { useAppData } from "./app-provider";

type Row = Record<string, unknown>;

export function OutcomesLoader() {
  const { refresh } = useAppData();
  useEffect(() => {
    fetch("/api/outcomes", { cache: "no-store" })
      .then(() => refresh())
      .catch(() => undefined);
  }, [refresh]);
  return null;
}

export function CompanionConnections() {
  const { data, refresh } = useAppData();
  const [pair, setPair] = useState<{
    code: string;
    platform: string;
    expiresAt: string;
  } | null>(null);
  const [notice, setNotice] = useState("");
  const create = async (platform: "ios" | "android") => {
    const response = await fetch("/api/native/pairing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform }),
    });
    const result = (await response.json()) as {
      code?: string;
      platform?: string;
      expiresAt?: string;
      error?: string;
    };
    if (response.ok && result.code)
      setPair(result as { code: string; platform: string; expiresAt: string });
    else setNotice(result.error ?? "Could not create pairing code");
    await refresh();
  };
  return (
    <section className="paper-card companion-panel">
      <div className="section-head compact">
        <div>
          <span className="card-kicker">DIRECT PHONE SYNC</span>
          <h2>Apple Health & Health Connect</h2>
        </div>
        <span className="live-chip">
          <i /> incremental sync
        </span>
      </div>
      <p>
        Your phone companion reads only the categories you approve, sends
        changed records in encrypted batches, and keeps deletions and source
        attribution synchronized.
      </p>
      <div className="companion-actions">
        <button onClick={() => void create("ios")}>
          <span></span>
          <strong>Pair iPhone</strong>
          <small>Apple Watch through HealthKit</small>
        </button>
        <button onClick={() => void create("android")}>
          <span>H</span>
          <strong>Pair Android</strong>
          <small>Health Connect on device</small>
        </button>
      </div>
      {pair ? (
        <div className="pairing-ticket">
          <span>{pair.platform.toUpperCase()} PAIRING CODE</span>
          <strong>{pair.code}</strong>
          <small>
            Enter once in the companion app. Expires at{" "}
            {new Date(pair.expiresAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
            .
          </small>
        </div>
      ) : null}
      {notice ? <p className="workflow-notice">{notice}</p> : null}
      <div className="paired-devices">
        {(data?.phase3.companions ?? []).map((device) => (
          <span key={String(device.id)}>
            <i className={String(device.status) === "active" ? "ready" : ""} />
            <strong>{String(device.deviceName)}</strong>
            <small>
              {String(device.platform).toUpperCase()} ·{" "}
              {device.lastSyncAt
                ? `Synced ${new Date(String(device.lastSyncAt)).toLocaleString()}`
                : "Ready for first sync"}
            </small>
          </span>
        ))}
      </div>
    </section>
  );
}

export function OutcomesExperience() {
  const { data, refresh } = useAppData();
  const [notice, setNotice] = useState("");
  const [decisions, setDecisions] = useState<Record<string, "keep" | "change" | "stop">>({});
  const state = data?.phase3;
  const enrichedState = (state ?? {}) as unknown as Row;
  const outcomes = state?.outcomes ?? [];
  const experiments = state?.experiments ?? [];
  const responseAssessments = (enrichedState.responseAssessments as Row[] | undefined) ?? [];
  const interventions = (enrichedState.interventions as Row[] | undefined) ?? [];
  const consent = Boolean(state?.researchConsent?.granted);
  const updateConsent = async (granted: boolean) => {
    await fetch("/api/research/consent", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ granted }),
    });
    setNotice(
      granted
        ? "Research contribution enabled. Your personal experience is unchanged."
        : "Research contribution stopped.",
    );
    await refresh();
  };
  const experimentFor = (targetCode: unknown) => {
    const aliases: Record<string, string[]> = {
      resting_hr_28d: ["resting_hr"],
      sleep_duration_28d: ["sleep_minutes"],
    };
    const code = String(targetCode);
    const accepted = [code, ...(aliases[code] ?? [])];
    return experiments.find((item) => accepted.includes(String(item.primaryOutcome)) && item.status !== "active");
  };
  const chooseDecision = async (id: string, decision: "keep" | "change" | "stop", linkedInterventionId?: string) => {
    setDecisions((current) => ({ ...current, [id]: decision }));
    const assessment = responseAssessments.find((item) => String(item.id) === id);
    const interventionId = String(assessment?.interventionEpisodeId ?? linkedInterventionId ?? "");
    if (!interventionId) {
      setNotice(`“${decision}” is noted locally only because this longitudinal comparison is not linked to an intervention.`);
      return;
    }
    const response = await fetch(`/api/interventions/${interventionId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "decide", decision, reason: `Member chose ${decision} after reviewing result ${id}` }) });
    const result = await response.json() as { error?: string };
    if (!response.ok) { setNotice(result.error || "The decision could not be saved."); return; }
    setNotice(`“${decision}” was saved to this intervention response.`);
    await refresh();
  };
  return (
    <>
      {notice ? <p className="workflow-notice">{notice}</p> : null}
      <section className="progress-hero paper-card">
        <div>
          <span className="card-kicker">YOUR RESULTS</span>
          <h2>What changed—and what we can honestly conclude.</h2>
          <p>
            Each result keeps its dates, unit, quality, and source trail. When an
            intervention is not linked to the comparison window, the app does not
            imply that it caused the change.
          </p>
        </div>
        <div className="progress-orbit">
          <span>{responseAssessments.length || outcomes.length}</span>
          <small>
            available
            <br />
            comparisons
          </small>
          <i />
        </div>
      </section>
      {responseAssessments.length ? <section className="outcome-grid">{responseAssessments.map((assessment) => <ResponseAssessmentCard key={String(assessment.id)} item={assessment} intervention={interventions.find((candidate) => candidate.id === assessment.interventionEpisodeId)} decision={decisions[String(assessment.id)]} onDecision={(decision) => void chooseDecision(String(assessment.id), decision)} />)}</section> : null}
      <section className="outcome-grid">
        {responseAssessments.length ? null : outcomes.length ? (
          outcomes.map((outcome, index) => (
            <OutcomeCard
              key={String(outcome.id)}
              item={outcome}
              index={index}
              experiment={experimentFor(outcome.targetCode)}
              decision={decisions[String(outcome.id)]}
              onDecision={(decision) => { const experiment = experimentFor(outcome.targetCode); const linked = interventions.find((item) => item.sourceExperimentId === experiment?.id); void chooseDecision(String(outcome.id), decision, linked ? String(linked.id) : undefined); }}
            />
          ))
        ) : (
          <article className="paper-card outcome-empty">
            <span>NO INTERPRETABLE RESULT YET</span>
            <h2>A result needs a reliable before and after.</h2>
            <p>
              Complete the assigned intervention and keep the required data source
              connected. Lab results appear only after a verified retest.
            </p>
            <a href="/experiment">Review your active experiment →</a>
          </article>
        )}
      </section>
      <section className="progress-controls">
        <article className="paper-card">
          <span className="card-kicker">OPTIONAL RESEARCH CONTRIBUTION</span>
          <h2>Help validate what works.</h2>
          <p>
            Only de-identified outcome rows enter cohort analytics, and small
            groups are suppressed. Turn it off anytime.
          </p>
          <label className="consent-toggle">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => void updateConsent(event.target.checked)}
            />
            <span />
            <strong>{consent ? "Contributing" : "Not contributing"}</strong>
          </label>
        </article>
        <article className="paper-card"><span className="card-kicker">HOW TO READ RESULTS</span><h2>Association is not always response.</h2><p>A related experiment, adherence, uncertainty, and confounders appear on each result when the current data contains them. Missing fields remain visibly unknown.</p><a href="/ask?topic=results">Ask about a result →</a></article>
      </section>
    </>
  );
}

function ResponseAssessmentCard({ item, intervention, decision, onDecision }: { item: Row; intervention?: Row; decision?: "keep" | "change" | "stop"; onDecision: (decision: "keep" | "change" | "stop") => void }) {
  const confounders = Array.isArray(item.confoundersJson) ? item.confoundersJson as unknown[] : [];
  const insufficiency = Array.isArray(item.insufficiencyReasonsJson) ? item.insufficiencyReasonsJson as unknown[] : [];
  const hasComparison = item.baselineValue !== null && item.baselineValue !== undefined && item.comparisonValue !== null && item.comparisonValue !== undefined;
  return <article className="paper-card outcome-card" aria-labelledby={`response-${String(item.id)}`}>
    <div><span className="card-kicker">{String(item.primaryOutcomeCode ?? "response").replaceAll("_", " ")}</span><span className="change-pill neutral">{item.percentChange === null || item.percentChange === undefined ? readableResult(item.status) : `${Number(item.percentChange) > 0 ? "+" : ""}${Number(item.percentChange).toFixed(1)}%`}</span></div>
    <h2 id={`response-${String(item.id)}`}>{String(intervention?.title ?? "Intervention response")}</h2>
    <p>{String(item.conclusion ?? "No reviewed conclusion is available.")}</p>
    <div className="outcome-values"><span><small>BASELINE WINDOW</small><strong>{hasComparison ? `${Number(item.baselineValue).toFixed(1)} ${String(item.unit ?? "")}` : "Insufficient data"}</strong><i>{dateRange(item.baselineStart, item.baselineEnd)}</i></span><span><small>COMPARISON WINDOW</small><strong>{hasComparison ? `${Number(item.comparisonValue).toFixed(1)} ${String(item.unit ?? "")}` : "Insufficient data"}</strong><i>{dateRange(item.comparisonStart, item.comparisonEnd)}</i></span></div>
    <dl className="order-detail-grid"><div><dt>Attribution</dt><dd>{readableResult(item.attributionGrade ?? "unknown")}</dd></div><div><dt>Uncertainty interval</dt><dd>{item.lowerBound !== null && item.lowerBound !== undefined && item.upperBound !== null && item.upperBound !== undefined ? `${Number(item.lowerBound).toFixed(1)} to ${Number(item.upperBound).toFixed(1)} ${String(item.unit ?? "")}` : "Not available"}</dd></div><div><dt>Adherence</dt><dd>{Number.isFinite(Number(item.adherence)) ? `${Math.round(Number(item.adherence) * 100)}%` : "Unknown"}</dd></div><div><dt>Data quality</dt><dd>{Number.isFinite(Number(item.dataQuality)) ? `${Math.round(Number(item.dataQuality) * 100)}%` : "Unknown"}</dd></div><div className="wide"><dt>Confounders</dt><dd>{confounders.length ? confounders.map(String).join("; ") : "None captured; absence of a record does not prove none occurred."}</dd></div>{insufficiency.length ? <div className="wide"><dt>Why this is not yet interpretable</dt><dd>{insufficiency.map(String).join("; ")}</dd></div> : null}</dl>
    <p><strong>Engine recommendation:</strong> {readableResult(item.recommendedDecision ?? "not available")}. You make the final decision after reviewing the evidence.</p>
    <fieldset className="intake-actions"><legend className="card-kicker">YOUR DECISION</legend>{(["keep", "change", "stop"] as const).map((value) => <button key={value} type="button" className={decision === value ? "primary-button" : "quiet-button"} aria-pressed={decision === value} onClick={() => onDecision(value)}>{value === "keep" ? "Keep and confirm" : value === "change" ? "Change and retest" : "Stop and review"}</button>)}</fieldset>
  </article>;
}

function readableResult(value: unknown) { return String(value ?? "").replaceAll("_", " "); }
function dateRange(start: unknown, end: unknown) { const format = (value: unknown) => value ? new Date(String(value)).toLocaleDateString() : "unknown"; return `${format(start)} – ${format(end)}`; }

function OutcomeCard({ item, index, experiment, decision, onDecision }: { item: Row; index: number; experiment?: Row; decision?: "keep" | "change" | "stop"; onDecision: (decision: "keep" | "change" | "stop") => void }) {
  const change = Number(item.absoluteChange ?? 0);
  const percent =
    item.percentChange === null || item.percentChange === undefined
      ? null
      : Number(item.percentChange);
  const label = String(item.targetCode).replaceAll("_", " ");
  const experimentResult = (experiment?.resultJson as Row | undefined) ?? {};
  const interval = Array.isArray(experimentResult.interval) ? experimentResult.interval as unknown[] : [];
  const periods = (experiment?.periods as Row[] | undefined) ?? [];
  const confounders = periods.flatMap((period) => {
    const context = (period.contextJson as Row | undefined) ?? {};
    return typeof context.note === "string" && context.note.trim() ? [context.note.trim()] : [];
  });
  const attribution = experiment
    ? "A completed experiment targets this metric, but this baseline-to-latest card is not yet tied to that experiment's exact comparison window. Treat the relationship as contextual, not causal."
    : "No completed intervention is linked to this comparison. It shows longitudinal movement only—not what caused it.";
  const path = useMemo(() => {
    const base = Number(item.baselineValue);
    const current = Number(item.currentValue);
    const midpoint =
      (base + current) / 2 +
      (index % 2 ? Math.abs(change) * 0.2 : -Math.abs(change) * 0.15);
    const min = Math.min(base, current, midpoint);
    const max = Math.max(base, current, midpoint);
    const y = (value: number) => 70 - ((value - min) / (max - min || 1)) * 46;
    return `M 5 ${y(base)} C 28 ${y(base)}, 48 ${y(midpoint)}, 66 ${y(midpoint)} S 92 ${y(current)}, 115 ${y(current)}`;
  }, [item, index, change]);
  return (
    <article className="paper-card outcome-card">
      <div>
        <span className="card-kicker">{label}</span>
        <span className="change-pill neutral">
          {change > 0 ? "+" : ""}
          {percent !== null
            ? `${percent.toFixed(1)}%`
            : `${change.toFixed(1)} ${item.unit}`}
        </span>
      </div>
      <svg
        viewBox="0 0 120 78"
        role="img"
        aria-label={`${label} changed from ${item.baselineValue} to ${item.currentValue}`}
      >
        <path className="outcome-guide" d="M5 66 H115" />
        <path className="outcome-line" d={path} />
        <circle cx="5" cy="54" r="3" />
        <circle cx="115" cy="24" r="4" />
      </svg>
      <div className="outcome-values">
        <span>
          <small>BASELINE</small>
          <strong>
            {Number(item.baselineValue).toFixed(1)} {String(item.unit)}
          </strong>
          <i>{new Date(String(item.baselineAt)).toLocaleDateString()}</i>
        </span>
        <span>
          <small>CURRENT</small>
          <strong>
            {Number(item.currentValue).toFixed(1)} {String(item.unit)}
          </strong>
          <i>{new Date(String(item.currentAt)).toLocaleDateString()}</i>
        </span>
      </div>
      <footer>
        <span>Data quality {Math.round(Number(item.quality) * 100)}% · {Array.isArray(item.sourceRefsJson) ? item.sourceRefsJson.length : 0} source references</span>
        <a href="/data">Inspect sources →</a>
      </footer>
      <div className="protocol-rationale">
        <div><span className="card-kicker">INTERVENTION LINK</span><h3>{experiment ? String(experiment.title) : "No linked intervention"}</h3><p>{attribution}</p></div>
        <div className="relationship-flow"><span>{experiment ? String(experiment.title) : "Unknown intervention"}</span><i>→</i><span className="middle">{label}</span><i>→</i><span>{experiment ? String(experimentResult.conclusion ?? "Insufficient experiment data") : "Attribution unavailable"}</span></div>
        <p><strong>Uncertainty:</strong> {interval.length === 2 ? `${Number(interval[0]).toFixed(1)} to ${Number(interval[1]).toFixed(1)} ${String(item.unit)}` : "No interval is available for this comparison."}</p>
        <p><strong>Confounders:</strong> {confounders.length ? confounders.join("; ") : "None were captured in the current record; this does not prove none occurred."}</p>
      </div>
      <fieldset className="intake-actions">
        <legend className="card-kicker">WHAT SHOULD HAPPEN NEXT?</legend>
        {(["keep", "change", "stop"] as const).map((value) => <button key={value} type="button" className={decision === value ? "primary-button" : "quiet-button"} aria-pressed={decision === value} onClick={() => onDecision(value)}>{value === "keep" ? "Keep and confirm" : value === "change" ? "Change and retest" : "Stop and review"}</button>)}
      </fieldset>
    </article>
  );
}

export function ExperimentsExperience() {
  const { data: appData } = useAppData();
  const [data, setData] = useState<{
    templates: Row[];
    experiments: Row[];
  } | null>(null);
  const [notice, setNotice] = useState("");
  const [reviewCode, setReviewCode] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const load = () =>
    fetch("/api/experiments", { cache: "no-store" })
      .then(
        async (response) =>
          (await response.json()) as { templates: Row[]; experiments: Row[] },
      )
      .then(setData);
  useEffect(() => {
    void load();
  }, []);
  const active = data?.experiments.find((item) => item.status === "active");
  const selected = data?.templates.find((item) => item.code === reviewCode);
  const selectedMethodology = (selected?.methodology as Row | undefined) ?? {};
  const selectedRequirements = (selectedMethodology.dataRequirements as Row | undefined) ?? {};
  const selectedEligibility = (selectedMethodology.eligibility as Row | undefined) ?? {};
  const wearableReady = appData?.wearableConnections.some((item) => item.status === "active") ?? false;
  const contextReady = Boolean(appData && appData.intake.answered >= Math.min(10, appData.intake.total));
  const safetyDecision = appData?.responseState?.safetyDecisions.find((item) => item.id === appData.responseState.priorityAssessment?.safetyDecisionId);
  const safetyReady = safetyDecision?.status === "eligible_for_wellness_experiment";
  const measurementReady = selectedRequirements.source === "observations"
    ? appData?.observations.some((item) => item.conceptCode === selectedRequirements.metric && item.valueNumber !== null) ?? false
    : wearableReady;
  const start = async (code: string) => {
    const response = await fetch("/api/experiments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateCode: code }),
    });
    const result = (await response.json()) as { error?: string };
    setNotice(
      response.ok
        ? "Experiment scheduled. Your first day starts tomorrow."
        : (result.error ?? "Could not start"),
    );
    await load();
    if (response.ok) { setReviewCode(""); setAcknowledged(false); }
  };
  const check = async (periodId: string, completed: boolean) => {
    await fetch("/api/experiments/check-in", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        periodId,
        completed,
        adherence: completed ? 1 : 0,
      }),
    });
    await load();
  };
  return (
    <>
      {notice ? <p className="workflow-notice">{notice}</p> : null}
      {active ? (
        <ActiveExperiment experiment={active} onCheck={check} />
      ) : (
        <section className="experiment-intro paper-card">
          <div>
            <span className="card-kicker">CHOOSE ONE MEASURABLE QUESTION</span>
            <h2>Review before you begin.</h2>
            <p>
              Each option changes one routine and measures one wearable outcome.
              Selection is not a diagnosis or medical recommendation, and only one
              experiment can run at a time.
            </p>
          </div>
          <span className="experiment-number">1<small>change</small></span>
        </section>
      )}
      {selected && !active ? <section className="paper-card validation-panel" aria-labelledby="experiment-review-title"><div><span className="card-kicker">PRE-START REVIEW</span><h2 id="experiment-review-title">{String(selected.title)}</h2><p>{String(selected.hypothesis)}</p><dl className="order-detail-grid"><div><dt>Routine A</dt><dd>{String(selected.a)}</dd></div><div><dt>Routine B</dt><dd>{String(selected.b)}</dd></div><div><dt>Primary outcome</dt><dd>{String(selected.outcome).replaceAll("_", " ")}</dd></div><div><dt>Design and duration</dt><dd>{selectedMethodology.designType ? `${String(selectedMethodology.designType).replaceAll("_", " ")} · ${String(selectedMethodology.durationDays)} days` : "Methodology not supplied"}</dd></div><div className="wide"><dt>Data requirement</dt><dd>{String(selectedRequirements.description ?? "The required baseline contract is not available.")}</dd></div><div className="wide"><dt>Do not start when</dt><dd>{Array.isArray(selectedEligibility.exclusions) ? selectedEligibility.exclusions.join("; ") : "Experiment-specific exclusions are not available."}</dd></div></dl></div><div className="validation-steps"><span className={contextReady ? "done" : ""}><i>1</i><strong>Essential context</strong><small>{contextReady ? "Complete" : "Complete intake"}</small></span><span className={measurementReady ? "done" : ""}><i>2</i><strong>Outcome source</strong><small>{measurementReady ? "Detected" : "Required data not detected"}</small></span><span className={appData?.responseState?.priorityAssessment ? "done" : ""}><i>3</i><strong>Priority ranking</strong><small>{appData?.responseState?.priorityAssessment ? "Calculated" : "Calculate above"}</small></span><span className={safetyReady ? "done" : ""}><i>4</i><strong>Safety decision</strong><small>{safetyReady ? "Eligible for wellness experiment" : String(safetyDecision?.status ?? "Not assessed").replaceAll("_", " ")}</small></span></div><label className="consent-toggle"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} /><span/><strong>I reviewed the instructions and exclusions and will stop if I feel unwell.</strong></label><div className="intake-actions"><button className="quiet-button" type="button" onClick={() => { setReviewCode(""); setAcknowledged(false); }}>Choose another</button><button className="primary-button" type="button" disabled={!measurementReady || !contextReady || !safetyReady || !acknowledged} onClick={() => void start(String(selected.code))}>Start this experiment →</button></div><p><small>The API rechecks the intervention-specific safety decision and historical data before creating the response cycle. Urgent symptoms or critical results belong in medical care, not a wellness experiment.</small></p></section> : null}
      <section className="template-grid">
        {(data?.templates ?? []).map((template) => (
          <article
            className="paper-card template-card"
            key={String(template.code)}
          >
            <span className="experiment-glyph">
              {String(template.code).slice(0, 1).toUpperCase()}
            </span>
            <small>{String(template.outcome).replaceAll("_", " ")}</small>
            <h3>{String(template.title)}</h3>
            <p>{String(template.hypothesis)}</p>
            <div>
              <span>A · {String(template.a)}</span>
              <span>B · {String(template.b)}</span>
            </div>
            <p><small>{String(template.availability ?? "readiness checked before start").replaceAll("_", " ")}</small></p>
            <button
              disabled={Boolean(active)}
              onClick={() => { setReviewCode(String(template.code)); setAcknowledged(false); }}
            >
              {active ? "One experiment active" : reviewCode === String(template.code) ? "Selected for review" : "Review this experiment →"}
            </button>
          </article>
        ))}
      </section>
      <section className="paper-card experiment-history">
        <div className="section-head compact">
          <div>
            <span className="card-kicker">EXPERIMENT ARCHIVE</span>
            <h2>What your body taught us</h2>
          </div>
        </div>
        {(data?.experiments ?? []).filter((item) => item.status !== "active")
          .length ? (
          (data?.experiments ?? [])
            .filter((item) => item.status !== "active")
            .map((item) => (
              <div key={String(item.id)}>
                <strong>{String(item.title)}</strong>
                <span>
                  {String((item.resultJson as Row)?.conclusion ?? "Completed")}
                </span>
              </div>
            ))
        ) : (
          <p>
            No completed experiments yet. Your first clean comparison will live
            here.
          </p>
        )}
      </section>
    </>
  );
}

function ActiveExperiment({
  experiment,
  onCheck,
}: {
  experiment: Row;
  onCheck: (id: string, done: boolean) => Promise<void>;
}) {
  const periods = (experiment.periods as Row[]) ?? [];
  const completed = periods.filter((period) => period.completed).length;
  const next = periods.find((period) => !period.completed);
  const result = experiment.resultJson as Row;
  return (
    <section className="active-experiment paper-card">
      <div className="active-experiment-head">
        <div>
          <span className="card-kicker">
            ACTIVE EXPERIMENT · {completed}/{periods.length} DAYS
          </span>
          <h2>{String(experiment.title)}</h2>
          <p>{String(experiment.hypothesis)}</p>
        </div>
        <span className="arm-badge">
          TODAY
          <br />
          <strong>{String(next?.arm ?? "—")}</strong>
        </span>
      </div>
      <div className="period-track">
        {periods.map((period) => (
          <button
            aria-label={`${period.day}: routine ${period.arm}`}
            className={
              period.completed
                ? "complete"
                : period.id === next?.id
                  ? "today"
                  : ""
            }
            key={String(period.id)}
            onClick={() =>
              !period.completed && void onCheck(String(period.id), true)
            }
          >
            <span>{new Date(String(period.day)).getUTCDate()}</span>
            <i>{String(period.arm)}</i>
          </button>
        ))}
      </div>
      {next ? (
        <div className="today-instruction">
          <span>NEXT ROUTINE</span>
          <strong>{String(next.instruction)}</strong>
          <button onClick={() => void onCheck(String(next.id), true)}>
            Mark complete
          </button>
        </div>
      ) : null}
      <p className="experiment-conclusion">
        {String(
          result?.conclusion ??
            "Complete each assigned routine; the outcome is attached only when your wearable data for that day is available.",
        )}
      </p>
    </section>
  );
}

export function AdminPhase3() {
  const [data, setData] = useState<Row | null>(null);
  const [studyRef, setStudyRef] = useState("");
  const [validation, setValidation] = useState({
    n: "",
    mae: "",
    coverage: "",
    disparity: "",
    datasetHash: "",
  });
  const [notice, setNotice] = useState("");
  const reload = async () => {
    const response = await fetch("/api/admin/phase3", { cache: "no-store" });
    setData((await response.json()) as Row);
  };
  useEffect(() => {
    fetch("/api/admin/phase3", { cache: "no-store" })
      .then(async (response) => (await response.json()) as Row)
      .then(setData);
  }, []);
  const cohort = data?.cohort as Row | undefined;
  const cohortMetrics = (cohort?.metrics as Row[] | undefined) ?? [];
  const runs = data?.connectorRuns as Row[] | undefined;
  const models = data?.models as Row[] | undefined;
  const train = async (targetCode: string) => {
    const response = await fetch("/api/admin/models/train", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetCode }),
    });
    const result = (await response.json()) as { status?: string; error?: string };
    setNotice(
      response.ok
        ? `Candidate trained: ${result.status?.replaceAll("_", " ")}.`
        : (result.error ?? "Training failed"),
    );
    await reload();
  };
  const validate = async (modelId: string) => {
    const response = await fetch("/api/admin/models/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        modelId,
        prospectiveStudyId: studyRef,
        evaluation: {
          n: Number(validation.n),
          mae: Number(validation.mae),
          coverage: Number(validation.coverage),
          maxSubgroupMaeRatio: Number(validation.disparity),
          datasetHash: validation.datasetHash,
        },
      }),
    });
    const result = (await response.json()) as { error?: string };
    setNotice(
      response.ok
        ? "Model published with prospective validation reference."
        : (result.error ?? "Validation failed"),
    );
    await reload();
  };
  return (
    <section className="phase3-admin">
      <div className="section-head compact">
        <div>
          <span className="card-kicker">PHASE 3 · SCALE & VALIDATION</span>
          <h2>Connector, cohort, and model control</h2>
        </div>
        <span className="eta-chip">live governance</span>
      </div>
      {notice ? <p className="phase3-admin-notice">{notice}</p> : null}
      <div className="phase3-admin-grid">
        <article>
          <span>CONSENTED COHORT</span>
          <strong>{String(cohort?.consentedMembers ?? "—")}</strong>
          <small>
            Cells under {String(cohort?.minimumCell ?? 5)} suppressed
          </small>
        </article>
        <article>
          <span>CONNECTOR RUNS</span>
          <strong>{runs?.length ?? "—"}</strong>
          <small>
            {runs?.filter((run) => run.status === "failed").length ?? 0} recent
            failures
          </small>
        </article>
        <article>
          <span>VALIDATED MODELS</span>
          <strong>
            {models?.filter((model) => model.status === "validated").length ??
              0}
          </strong>
          <small>{models?.length ?? 0} registered targets</small>
        </article>
        <article>
          <span>NATIVE DEVICES</span>
          <strong>
            {(data?.installations as Row[] | undefined)?.length ?? "—"}
          </strong>
          <small>Apple + Android companions</small>
        </article>
      </div>
      <div className="model-ledger">
        {models?.length ? (
          models.map((model) => (
            <span key={String(model.id)}>
              <strong>
                {String(model.target_code).replaceAll("_", " ")} v
                {String(model.version)}
              </strong>
              <i className={String(model.status)} />
              <small>
                {String(model.status)} · n=
                {String((model.metrics_json as Row)?.n ?? 0)} · coverage{" "}
                {Math.round(
                  Number((model.calibration_json as Row)?.coverage ?? 0) * 100,
                )}
                %
              </small>
              <div>
                <button
                  onClick={() => void train(String(model.target_code))}
                >
                  Train next candidate
                </button>
                {model.status === "eligible_review" ? (
                  <>
                    <input
                      aria-label="Prospective study reference"
                      placeholder="Prospective study ID"
                      value={studyRef}
                      onChange={(event) => setStudyRef(event.target.value)}
                    />
                    <input
                      aria-label="Prospective cohort size"
                      placeholder="n"
                      inputMode="numeric"
                      value={validation.n}
                      onChange={(event) =>
                        setValidation({ ...validation, n: event.target.value })
                      }
                    />
                    <input
                      aria-label="Prospective mean absolute error"
                      placeholder="MAE"
                      inputMode="decimal"
                      value={validation.mae}
                      onChange={(event) =>
                        setValidation({
                          ...validation,
                          mae: event.target.value,
                        })
                      }
                    />
                    <input
                      aria-label="Prospective interval coverage"
                      placeholder="Coverage 0–1"
                      inputMode="decimal"
                      value={validation.coverage}
                      onChange={(event) =>
                        setValidation({
                          ...validation,
                          coverage: event.target.value,
                        })
                      }
                    />
                    <input
                      aria-label="Maximum subgroup error ratio"
                      placeholder="Subgroup ratio"
                      inputMode="decimal"
                      value={validation.disparity}
                      onChange={(event) =>
                        setValidation({
                          ...validation,
                          disparity: event.target.value,
                        })
                      }
                    />
                    <input
                      aria-label="Prospective dataset hash"
                      placeholder="Dataset SHA-256"
                      value={validation.datasetHash}
                      onChange={(event) =>
                        setValidation({
                          ...validation,
                          datasetHash: event.target.value,
                        })
                      }
                    />
                    <button
                      disabled={
                        !studyRef.trim() ||
                        !validation.n ||
                        !validation.mae ||
                        !validation.coverage ||
                        !validation.disparity ||
                        !validation.datasetHash.trim()
                      }
                      onClick={() => void validate(String(model.id))}
                    >
                      Validate & publish
                    </button>
                  </>
                ) : null}
              </div>
            </span>
          ))
        ) : (
          <p>
            No response model can publish until prospective outcome volume and
            calibration gates pass.
          </p>
        )}
      </div>
      <div className="cohort-ledger">
        <span className="card-kicker">CONSENTED COHORT OUTCOMES</span>
        {cohortMetrics.length ? (
          cohortMetrics.map((metric) => (
            <span key={String(metric.targetCode)}>
              <strong>{String(metric.targetCode).replaceAll("_", " ")}</strong>
              <small>n={String(metric.n)}</small>
              <b>
                {metric.suppressed
                  ? "Suppressed"
                  : `${Number(metric.averagePercentChange ?? 0).toFixed(1)}% average change`}
              </b>
            </span>
          ))
        ) : (
          <p>Metrics appear only after members explicitly opt in.</p>
        )}
      </div>
    </section>
  );
}
