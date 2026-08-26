"use client";

import { useMemo, useState } from "react";
import { useAppData } from "./app-provider";
import { ExperimentsExperience } from "./phase3-experiences";

type Row = Record<string, unknown>;

function readable(value: unknown) {
  return String(value ?? "").replaceAll("_", " ");
}

function dateLabel(value: unknown) {
  if (!value) return "Not scheduled";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "Not scheduled" : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function ProtocolExperience() {
  const { data, toggleAction, refresh } = useAppData();
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const phase3State = (data?.phase3 ?? {}) as unknown as Row;
  const interventions = (phase3State.interventions as Row[] | undefined) ?? [];
  const intervention = interventions.find((item) => item.status === "active") ?? interventions.find((item) => ["approved", "proposed", "paused"].includes(String(item.status)));
  const active = data?.phase3.experiments.find((item) => item.status === "active") as Row | undefined;
  const periods = (active?.periods as Row[] | undefined) ?? [];
  const completedPeriods = periods.filter((period) => Boolean(period.completed));
  const nextPeriod = periods.find((period) => !period.completed);
  const exposures = (intervention?.exposures as Row[] | undefined) ?? [];
  const completedExposures = exposures.filter((item) => Boolean(item.completed));
  const action = !intervention && !active ? (data?.protocol?.actions.find((item) => !item.done) ?? data?.protocol?.actions[0]) : undefined;
  const actionData = action as (typeof action & Row);
  const genomicArtifacts = data?.genomics.artifacts ?? [];
  const reviewedInterpretations = data?.genomics.interpretations.filter((item) =>
    ["reviewed", "interpretable", "released"].includes(String(item.status ?? item.reviewStatus ?? "").toLowerCase()),
  ) ?? [];
  const wearableReady = data?.wearableConnections.some((item) => item.status === "active") ?? false;
  const experimentOutcome = intervention?.primaryOutcomeCode ? readable(intervention.primaryOutcomeCode) : active?.primaryOutcome ? readable(active.primaryOutcome) : actionData?.target ? readable(actionData.target) : "Not defined";
  const adherence = exposures.length ? Math.round(exposures.reduce((sum, item) => sum + Number(item.adherence ?? 0), 0) / exposures.length * 100) : periods.length ? Math.round((completedPeriods.length / periods.length) * 100) : action ? (action.done ? 100 : 0) : null;
  const result = (active?.resultJson as Row | undefined) ?? {};
  const validDays = Number(result.validDays ?? 0);

  const dnaStatement = useMemo(() => {
    if (!genomicArtifacts.length) return "No DNA data has been added yet. Genetics can refine future hypotheses without blocking this cycle.";
    if (!reviewedInterpretations.length) return "DNA data is present, but no reviewed interpretation is linked to this intervention yet.";
    return `${reviewedInterpretations.length} reviewed genetic finding${reviewedInterpretations.length === 1 ? " is" : "s are"} available. The current data contract does not identify one as supporting or conflicting with this intervention.`;
  }, [genomicArtifacts.length, reviewedInterpretations.length]);

  const mutateIntervention = async (actionName: "pause" | "resume" | "stop" | "checkin" | "assess") => {
    if (!intervention?.id) return;
    setBusy(actionName); setNotice("");
    try {
      const endpoint = actionName === "checkin" ? `/api/interventions/${intervention.id}/check-in` : actionName === "assess" ? `/api/interventions/${intervention.id}/response` : `/api/interventions/${intervention.id}`;
      const body = actionName === "checkin" ? { scheduledAt: new Date().toISOString(), occurredAt: new Date().toISOString(), completed: true, adherence: 1 }
        : actionName === "assess" ? undefined
          : actionName === "stop" ? { action: "decide", decision: "stop", reason: "Stopped by member" }
            : { action: actionName, reason: actionName === "pause" ? "Paused by member" : undefined };
      const response = await fetch(endpoint, { method: actionName === "checkin" || actionName === "assess" ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "The update could not be saved");
      setNotice(actionName === "checkin" ? "Today’s check-in was recorded." : actionName === "assess" ? "The response assessment was recalculated." : `Intervention ${actionName === "stop" ? "stopped" : `${actionName}d`}.`);
      await refresh();
    } catch (error) { setNotice(error instanceof Error ? error.message : "The update could not be saved"); }
    finally { setBusy(""); }
  };

  if (!intervention && !active && !action) {
    return (
      <section className="paper-card outcome-empty" aria-labelledby="intervention-empty-title">
        <span>NO ACTIVE INTERVENTION</span>
        <h2 id="intervention-empty-title">Your first intervention should begin with evidence.</h2>
        <p>Complete the essential intake and connect usable data. The app can then recommend one measurable change instead of showing a generic plan.</p>
        <div className="protocol-toolbar-links">
          <a href="/intake">Complete essential context →</a>
          <a href="/data">Connect health data →</a>
        </div>
      </section>
    );
  }

  const title = String(intervention?.title ?? active?.title ?? action?.title ?? "Current intervention");
  const hypothesis = String(intervention?.hypothesis ?? active?.hypothesis ?? data?.protocol?.strategy ?? "A measurable hypothesis has not been recorded for this action.");
  const instruction = String(nextPeriod?.instruction ?? intervention?.exactInstruction ?? action?.detail ?? "Review the approved instruction before beginning.");
  const reason = String(action?.reason ?? "This experiment was selected to test a specific response in your own data.");

  return (
    <>
      {notice ? <p className="workflow-notice" role="status">{notice}</p> : null}
      <section className="protocol-hero" aria-labelledby="active-intervention-title">
        <div className="protocol-strategy">
          <span className="card-kicker">{intervention ? `${readable(intervention.status).toUpperCase()} INTERVENTION` : active ? "ACTIVE EXPERIMENT" : "CURRENT APPROVED ACTION"}</span>
          <h2 id="active-intervention-title">{title}</h2>
          <p>{instruction}</p>
          <div className="priority-row" aria-label="Intervention summary">
            <span><i>01</i> One change</span>
            <span><i>02</i> {experimentOutcome}</span>
            <span><i>03</i> {intervention ? readable(intervention.category) : active ? readable(active.design) : "Not yet experimental"}</span>
          </div>
        </div>
        <div className="cycle-progress">
          <div className="large-ring"><div><strong>{adherence === null ? "—" : `${adherence}%`}</strong><span>CHECK-INS</span></div></div>
          <div>
            <strong>{intervention ? readable(intervention.status) : active ? readable(active.status) : action?.done ? "Completed" : "In progress"}</strong>
            <span>{intervention ? `${completedExposures.length} of ${exposures.length} scheduled exposures recorded` : active ? `${completedPeriods.length} of ${periods.length} assigned days recorded` : "This action is not yet linked to an experiment"}</span>
            <a href="/results">View measured results →</a>
          </div>
        </div>
      </section>

      <section className="protocol-view-grid">
        <article className="daily-plan paper-card">
          <div className="section-head">
            <div><span className="card-kicker">YOUR QUESTION</span><h2>{hypothesis}</h2></div>
          </div>
          <dl className="order-detail-grid">
            <div className="wide"><dt>Goal</dt><dd>{data?.member?.primaryGoal || "Your near-term goal has not been captured yet."}</dd></div>
            <div className="wide"><dt>Why this was chosen</dt><dd>{reason}</dd></div>
            <div><dt>Primary outcome</dt><dd>{experimentOutcome}</dd></div>
            <div><dt>Schedule</dt><dd>{intervention ? `${dateLabel(intervention.startAt)} – ${dateLabel(intervention.endAt)}` : active ? `${dateLabel(active.startAt)} – ${dateLabel(active.endAt)}` : "Defined by the current action"}</dd></div>
            <div><dt>Usable outcome days</dt><dd>{intervention ? String(intervention.comparisonUsableDays ?? "Not calculated") : active ? String(validDays) : "Not available"}</dd></div>
            <div><dt>Review point</dt><dd>{dateLabel(intervention?.reviewAt ?? active?.endAt)}</dd></div>
          </dl>
          {action ? (
            <button className={`daily-action ${action.done ? "done" : ""}`} onClick={() => void toggleAction(action.id, !action.done)} type="button" aria-pressed={action.done}>
              <span className="action-check" aria-hidden="true">{action.done ? "✓" : ""}</span>
              <time>{action.scheduledTime || "Today"}</time>
              <span className="action-main"><strong>{action.title}</strong><small>{action.detail}</small></span>
              <span className="reason-tag">{action.reason}</span>
            </button>
          ) : null}
        </article>

        <aside className="today-context">
          <article className="adjustment-card">
            <span className="card-kicker">READINESS</span>
            <h3>{wearableReady ? "A wearable connection is active" : "Outcome data connection needs attention"}</h3>
            <p>{wearableReady ? "Connection alone does not guarantee usable outcome data. Recorded experiment days determine readiness." : "Connect or import the source required for the primary outcome before interpreting a response."}</p>
            <div className="context-metrics">
              <span><strong>{validDays}</strong> usable days</span>
              <span><strong>{intervention ? exposures.length : periods.length}</strong> planned days</span>
            </div>
            <a href="/data">Inspect data readiness →</a>
          </article>
          <article className="meal-card paper-card">
            <span className="card-kicker">SAFETY</span>
            <h3>{intervention?.safetyStatus ? readable(intervention.safetyStatus) : "No intervention-specific safety decision in this payload"}</h3>
            <p>{intervention?.safetyStatus ? "This status comes from the intervention record. Review its reason codes and expiry before changing the intervention." : "The current payload does not expose a separate safety decision, contraindications, or reviewer record. Do not treat this screen as medical clearance."}</p>
            <a href="/ask?topic=safety">Ask about safety →</a>
          </article>
        </aside>
      </section>

      <section className="protocol-rationale paper-card" aria-labelledby="dna-influence-title">
        <div>
          <span className="card-kicker">DNA INFLUENCE</span>
          <h2 id="dna-influence-title">Inherited context should change the hypothesis—not dictate it.</h2>
          <p>{dnaStatement}</p>
        </div>
        <div className="relationship-flow"><span>DNA context</span><i>→</i><span className="middle">Personal hypothesis</span><i>→</i><span>Observed response</span></div>
        <div className="relationship-flow"><span>{genomicArtifacts.length ? "DNA added" : "DNA not added"}</span><i>→</i><span className="middle">{reviewedInterpretations.length ? "Reviewed context available" : "No reviewed link"}</span><i>→</i><span>{intervention || active ? "Response cycle active" : "Response cycle not active"}</span></div>
      </section>

      <section className="paper-card validation-panel" aria-labelledby="controls-title">
        <div>
          <span className="card-kicker">CONTROL YOUR INTERVENTION</span>
          <h2 id="controls-title">You can question or leave any experiment.</h2>
          <p>Record adherence, pause when context changes, stop if the intervention is not right for you, and calculate a result only from the captured comparison window.</p>
        </div>
        <div className="protocol-toolbar-links">
          {intervention?.status === "active" && !active ? <button type="button" disabled={Boolean(busy)} onClick={() => void mutateIntervention("checkin")}>Record today done</button> : null}
          {intervention?.status === "active" ? <button type="button" disabled={Boolean(busy)} onClick={() => void mutateIntervention("pause")}>Pause</button> : null}
          {intervention?.status === "paused" ? <button type="button" disabled={Boolean(busy)} onClick={() => void mutateIntervention("resume")}>Resume</button> : null}
          {intervention && ["active", "paused", "completed"].includes(String(intervention.status)) ? <button type="button" disabled={Boolean(busy)} onClick={() => void mutateIntervention("stop")}>Stop</button> : null}
          {intervention?.status === "active" && !active ? <button type="button" disabled={Boolean(busy)} onClick={() => void mutateIntervention("assess")}>Calculate current result</button> : null}
          <a href="/ask?topic=active-experiment">Ask why this →</a>
        </div>
      </section>
    </>
  );
}

export function ExperimentWorkspace() {
  const { data, refresh } = useAppData();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const phase3State = (data?.phase3 ?? {}) as unknown as Row;
  const interventions = (phase3State.interventions as Row[] | undefined) ?? [];
  const hasActiveCycle = interventions.some((item) => ["active", "approved", "paused"].includes(String(item.status))) || (data?.phase3.experiments.some((item) => item.status === "active") ?? false);
  const assessment = data?.responseState?.priorityAssessment;
  const candidates = data?.responseState?.priorityCandidates ?? [];
  const top = candidates[0];
  const safety = data?.responseState?.safetyDecisions.find((item) => item.id === assessment?.safetyDecisionId);
  if (data?.phase3.experiments.some((item) => item.status === "active")) return <><ProtocolExperience /><ExperimentsExperience /></>;
  const calculate = async () => { setBusy(true); setNotice(""); try { const response = await fetch("/api/priorities", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); const result = await response.json() as { error?: string }; if (!response.ok) throw new Error(result.error || "Could not calculate a priority"); await refresh(); setNotice("Your measurable priorities were recalculated from current data."); } catch (error) { setNotice(error instanceof Error ? error.message : "Could not calculate a priority"); } finally { setBusy(false); } };
  return <><ProtocolExperience />{hasActiveCycle ? null : <><section className="paper-card protocol-rationale"><div><span className="card-kicker">DETERMINISTIC PRIORITY</span><h2>{top ? String(top.title) : "Let the app find the most measurable starting point"}</h2><p>{top ? `Ranked from your goal, actionability, measurement readiness, evidence, burden and safety. DNA can adjust a hypothesis slightly, but cannot override safety or missing phenotype data.` : "You do not need to diagnose yourself or choose sleep, recovery, energy, or metabolic health. The app ranks testable priorities from the evidence you have."}</p></div><dl className="order-detail-grid"><div><dt>Safety state</dt><dd>{readable(safety?.status ?? "not assessed")}</dd></div><div><dt>Measurement readiness</dt><dd>{top ? `${Math.round(Number(top.measurementReadiness ?? 0) * 100)}%` : "Not calculated"}</dd></div><div><dt>DNA influence</dt><dd>{top && Number(top.geneticsModifier ?? 0) ? "Reviewed context used as a small modifier" : "No DNA modifier used"}</dd></div><div className="wide"><dt>Missing before confidence improves</dt><dd>{top && Array.isArray(top.missingJson) && top.missingJson.length ? top.missingJson.join(", ") : top ? "No template-specific readiness gap recorded" : "Run the assessment"}</dd></div></dl><button type="button" className="primary-button" disabled={busy} onClick={() => void calculate()}><span>{busy ? "Calculating…" : assessment ? "Recalculate from current data" : "Calculate my starting priority"}</span><span>→</span></button></section>{notice ? <p className="workflow-notice" role="status">{notice}</p> : null}<ExperimentsExperience /></>}</>;
}
