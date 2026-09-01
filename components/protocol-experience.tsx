"use client";

import { useState } from "react";
import { useAppData } from "./app-provider";
import { ExperimentsExperience } from "./phase3-experiences";
import { Button } from "./ui/button";
import { Notice } from "./ui/notice";

type Row = Record<string, unknown>;
type Feedback = { text: string; tone: "success" | "error" } | null;
const readable = (value: unknown) => String(value ?? "").replaceAll("_", " ");
const dateLabel = (value: unknown) => { if (!value) return "Not scheduled"; const date = new Date(String(value)); return Number.isNaN(date.getTime()) ? "Not scheduled" : date.toLocaleDateString(undefined, { day: "numeric", month: "short" }); };

export function ProtocolExperience() {
  const { data, toggleAction, refresh } = useAppData();
  const [notice, setNotice] = useState<Feedback>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const intervention = data?.responseState?.interventions.find((item) => item.status === "active") ?? data?.responseState?.interventions.find((item) => ["approved", "paused"].includes(String(item.status)));
  const active = data?.phase3.experiments.find((item) => item.status === "active") as Row | undefined;
  const periods = (active?.periods as Row[] | undefined) ?? [];
  const completed = periods.filter((period) => Boolean(period.completed));
  const nextPeriod = periods.find((period) => !period.completed);
  const exposures = (intervention?.exposures as Row[] | undefined) ?? [];
  const action = !intervention && !active ? (data?.protocol?.actions.find((item) => !item.done) ?? data?.protocol?.actions[0]) : undefined;
  const title = String(intervention?.title ?? active?.title ?? action?.title ?? "Current action");
  const hypothesis = String(intervention?.hypothesis ?? active?.hypothesis ?? "This cycle tests whether one specific routine changes your measured response.");
  const instruction = String(nextPeriod?.instruction ?? intervention?.exactInstruction ?? action?.detail ?? "Review the action before beginning.");
  const outcome = readable(intervention?.primaryOutcomeCode ?? active?.primaryOutcome ?? (action as Row | undefined)?.target ?? "outcome not defined");
  const totalDays = periods.length || exposures.length;
  const completedDays = periods.length ? completed.length : exposures.filter((item) => Boolean(item.completed)).length;
  const dayNumber = Math.min(completedDays + 1, totalDays || 1);
  const isControl = String(nextPeriod?.arm ?? "").toUpperCase() === "A";
  const safety = data?.responseState?.safetyDecisions.find((item) => item.id === intervention?.safetyDecisionId) ?? data?.responseState?.safetyDecisions.find((item) => item.id === data.responseState.priorityAssessment?.safetyDecisionId);
  const reviewedDna = data?.genomics.interpretations.filter((item) => item.status === "released").length ?? 0;

  const checkIn = async (adherence: number) => {
    setBusy(`check-${adherence}`); setNotice(null);
    try {
      const endpoint = nextPeriod?.id ? "/api/experiments/check-in" : intervention?.id ? `/api/interventions/${intervention.id}/check-in` : "";
      if (!endpoint) throw new Error("No scheduled check-in is available.");
      const body = nextPeriod?.id
        ? { periodId: nextPeriod.id, completed: adherence > 0, adherence, context: note }
        : { scheduledAt: new Date().toISOString(), occurredAt: adherence > 0 ? new Date().toISOString() : null, plannedValue: instruction, actualValue: adherence > 0 ? instruction : "Not completed", completed: adherence > 0, adherence, note };
      const response = await fetch(endpoint, { method: nextPeriod?.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "The check-in could not be saved");
      setNote(""); setNotice({ tone: "success", text: adherence === 1 ? "Today is recorded as completed." : adherence === .5 ? "Today is recorded as partly completed." : "Today is recorded as missed. That is still useful data." }); await refresh();
    } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "The check-in could not be saved" }); }
    finally { setBusy(""); }
  };

  const mutate = async (actionName: "pause" | "resume" | "stop") => {
    if (!intervention?.id) return;
    setBusy(actionName); setNotice(null);
    try {
      const body = actionName === "stop" ? { action: "decide", decision: "stop", reason: "Stopped by member" } : { action: actionName, reason: actionName === "pause" ? "Paused by member" : undefined };
      const response = await fetch(`/api/interventions/${intervention.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "The update could not be saved");
      setNotice({ tone: "success", text: actionName === "stop" ? "This experiment was stopped." : `This experiment is now ${actionName === "pause" ? "paused" : "active"}.` }); await refresh();
    } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "The update could not be saved" }); }
    finally { setBusy(""); }
  };

  if (!intervention && !active && !action) return <section className="paper-card outcome-empty"><span>NO CURRENT FOCUS</span><h2>Start with evidence, then focus on one useful question.</h2><p>Complete your essential context and connect one usable outcome source. Your Twin will rank a measurable starting point for you.</p><div className="protocol-toolbar-links"><a href="/intake">Complete context →</a><a href="/data">Connect health data →</a></div></section>;

  if (action && !active && !intervention) return <section className="paper-card current-action-card"><span className="card-kicker">CURRENT APPROVED ACTION</span><h2>{action.title}</h2><p>{action.detail}</p><p><strong>Why:</strong> {action.reason}</p><Button className={action.done ? "done" : undefined} trailing={action.done ? null : "✓"} onClick={() => void toggleAction(action.id, !action.done)}>{action.done ? "Mark not done" : "Mark today done"}</Button></section>;

  const safetyCopy = active && !intervention
    ? { title: "Earlier-cycle safety record", body: "This response test began in an earlier workflow. Pause and review before continuing if your medications, symptoms, pregnancy status, or health conditions have changed." }
    : safety?.status === "eligible_for_wellness_experiment"
    ? { title: "Safety check passed", body: "Your recorded context met the eligibility rules for this wellness response test. Stop and seek appropriate care if you feel unwell." }
    : safety
      ? { title: "More context is needed", body: `Complete or review: ${Array.isArray(safety.reasonCodesJson) ? safety.reasonCodesJson.map(readable).join(", ") : readable(safety.status)}.` }
      : { title: "Safety review not available", body: "Complete the essential safety questions before starting a new wellness experiment." };

  return <>
    {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
    <section className="protocol-hero focused-protocol" aria-labelledby="active-intervention-title"><div className="protocol-strategy"><span className="card-kicker">CURRENT FOCUS · DAY {dayNumber}{totalDays ? ` OF ${totalDays}` : ""}</span><h2 id="active-intervention-title">{title}</h2><p>{hypothesis}</p><div className="priority-row"><span><i>01</i> One focused change</span><span><i>02</i> Watching {outcome}</span><span><i>03</i> Measured against you</span></div></div><div className="cycle-progress"><div className="large-ring" style={{ background: `conic-gradient(#d07d5a ${totalDays ? Math.round(completedDays / totalDays * 100) : 0}%,rgba(255,255,255,.1) 0)` }}><div><strong>{completedDays}/{totalDays || "—"}</strong><span>USEFUL DAYS</span></div></div><div><strong>{readable(intervention?.status ?? active?.status ?? "active")}</strong><span>Your learning becomes available after enough usable outcome days.</span><a href="/learnings">Check learning readiness →</a></div></div></section>

    {nextPeriod || intervention?.status === "active" ? <section className="experiment-today-grid">
      <article className="paper-card experiment-action-card"><div className="experiment-action-head"><div><span className="card-kicker">TODAY · {isControl ? "USUAL ROUTINE" : "FOCUSED CHANGE"}</span><h2>{isControl ? `Keep it usual: ${instruction}` : instruction}</h2></div><span className={isControl ? "control-badge" : "intervention-badge"}>{isControl ? "A" : "B"}</span></div><p>{isControl ? "Today matters because it shows what happens without the experimental change. Keep the rest of your routine as normal as possible." : "Follow this one change and keep the rest of your routine as consistent as possible."}</p><label className="context-note"><span>Anything unusual that could affect today? <small>optional</small></span><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Travel, illness, alcohol, poor sleep, hard training…" /></label><div className="adherence-actions"><button disabled={Boolean(busy)} onClick={() => void checkIn(0)} type="button">Couldn’t do it</button><button disabled={Boolean(busy)} onClick={() => void checkIn(.5)} type="button">Partly done</button><Button trailing={null} disabled={Boolean(busy)} onClick={() => void checkIn(1)}>{busy ? "Saving…" : "Done as planned"}</Button></div></article>
      <aside className="paper-card experiment-why-card"><span className="card-kicker">WHAT YOUR TWIN IS LEARNING</span><h3>{outcome}</h3><p>Your connected data source records the outcome. Your check-in tells the Twin whether today is a useful comparison day.</p><dl><div><dt>Broader goal</dt><dd>{data?.member?.primaryGoal || "Not captured"}</dd></div><div><dt>The question</dt><dd>{hypothesis}</dd></div><div><dt>Review point</dt><dd>{dateLabel(intervention?.reviewAt ?? active?.endAt)}</dd></div></dl></aside>
    </section> : null}

    {periods.length ? <section className="paper-card experiment-calendar"><div className="section-head compact"><div><span className="card-kicker">YOUR CYCLE</span><h2>A and B days create the comparison</h2></div><span className="eta-chip">{completed.length}/{periods.length} recorded</span></div><div className="period-track">{periods.map((period) => <div className={period.completed ? "complete" : period.id === nextPeriod?.id ? "today" : ""} key={String(period.id)}><span>{new Date(String(period.day)).getUTCDate()}</span><i>{String(period.arm)}</i><small>{period.completed ? "Done" : period.id === nextPeriod?.id ? "Today" : "Next"}</small></div>)}</div><p className="calendar-key"><span><i className="a"/>A = your usual routine</span><span><i className="b"/>B = the experimental change</span></p></section> : null}

    <section className="experiment-support-grid"><article className="paper-card"><span className="card-kicker">SAFETY</span><h2>{safetyCopy.title}</h2><p>{safetyCopy.body}</p><a href="/ask?topic=safety">Ask about safety →</a></article><article className="paper-card"><span className="card-kicker">DNA IN THIS EXPERIMENT</span><h2>{reviewedDna ? `${reviewedDna} reviewed findings available` : "No reviewed DNA link used"}</h2><p>{reviewedDna ? "DNA can refine why this response may differ for you, but this experiment is judged by your observed response—not genotype alone." : "This cycle can still produce useful personal evidence. DNA is optional for this specific hypothesis."}</p><a href="/genetics">Inspect genetics →</a></article></section>

    <details className="paper-card experiment-details"><summary><span><span className="card-kicker">FULL PROTOCOL</span><strong>Schedule, measurement, and controls</strong></span><i>Open details</i></summary><dl className="order-detail-grid"><div><dt>Primary outcome</dt><dd>{outcome}</dd></div><div><dt>Schedule</dt><dd>{dateLabel(intervention?.startAt ?? active?.startAt)} – {dateLabel(intervention?.endAt ?? active?.endAt)}</dd></div><div className="wide"><dt>What stays constant</dt><dd>Keep sleep opportunity, meals, training, medication, and measurement timing as consistent as your real life allows. Note material deviations.</dd></div><div className="wide"><dt>What is measured automatically</dt><dd>{outcome} from your connected source. A connection alone is not enough; usable days and adherence determine interpretation.</dd></div></dl></details>

    {intervention ? <section className="protocol-controls"><span>You can pause or stop this focus at any time.</span><div>{intervention.status === "active" ? <button disabled={Boolean(busy)} onClick={() => void mutate("pause")}>Pause</button> : intervention.status === "paused" ? <button disabled={Boolean(busy)} onClick={() => void mutate("resume")}>Resume</button> : null}<button disabled={Boolean(busy)} onClick={() => void mutate("stop")}>Stop this focus</button><a href="/ask?topic=active-experiment">Ask why this →</a></div></section> : <p className="legacy-cycle-note">This cycle began in an earlier version of the app. Your check-ins remain valid; new cycles will also include pause and stop controls.</p>}
  </>;
}

export function ExperimentWorkspace() {
  const { data, refresh } = useAppData();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Feedback>(null);
  const hasActiveCycle = data?.responseState?.interventions.some((item) => ["active", "approved", "paused"].includes(String(item.status))) || data?.phase3.experiments.some((item) => item.status === "active");
  const assessment = data?.responseState?.priorityAssessment;
  const top = data?.responseState?.priorityCandidates[0];
  const safety = data?.responseState?.safetyDecisions.find((item) => item.id === assessment?.safetyDecisionId);
  const calculate = async () => { setBusy(true); setNotice(null); try { const response = await fetch("/api/priorities", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); const result = await response.json() as { error?: string }; if (!response.ok) throw new Error(result.error || "Could not calculate a priority"); await refresh(); setNotice({ tone: "success", text: "Your starting priorities were recalculated from current data." }); } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not calculate a priority" }); } finally { setBusy(false); } };
  if (hasActiveCycle) return <ProtocolExperience />;
  return <><ProtocolExperience /><section className="paper-card protocol-rationale"><div><span className="card-kicker">RECOMMENDED STARTING POINT</span><h2>{top ? String(top.title) : "Let your Twin find the clearest thing to learn next"}</h2><p>{top ? "Ranked from what matters to you, current measurements, safety, effort, and the chance of learning something useful. DNA can refine the question, but cannot override safety or missing current data." : "You do not need to diagnose yourself or pick a category. Your Twin ranks focused response tests from the evidence you already have."}</p></div><dl className="order-detail-grid"><div><dt>Safety</dt><dd>{readable(safety?.status ?? "not assessed")}</dd></div><div><dt>Do we have enough data?</dt><dd>{top ? `${Math.round(Number(top.measurementReadiness ?? 0) * 100)}% ready` : "Not calculated"}</dd></div><div className="wide"><dt>What would make this clearer?</dt><dd>{top && Array.isArray(top.missingJson) && top.missingJson.length ? top.missingJson.join(", ") : top ? "No test-specific gap recorded" : "Run the assessment"}</dd></div></dl><Button disabled={busy} onClick={() => void calculate()}>{busy ? "Calculating…" : assessment ? "Recalculate from current data" : "Find my starting point"}</Button></section>{notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}<ExperimentsExperience /></>;
}
