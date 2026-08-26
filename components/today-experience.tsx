"use client";

import Link from "next/link";
import { useState } from "react";
import { useAppData } from "./app-provider";

type Row = Record<string, unknown>;

function sourceState(data: ReturnType<typeof useAppData>["data"]) {
  if (!data) return [];
  const wearable = data.wearableConnections.some((item) => item.status === "active") || data.sources.some((item) => item.category === "wearable" || item.category === "health_data");
  const labs = data.observations.some((item) => item.source && item.domain !== "self_reported") || data.sources.some((item) => item.category === "laboratory");
  const genetics = data.genomics.artifacts.length > 0;
  return [
    { label: "Wearable", ready: wearable, detail: wearable ? "Continuous signals available" : "Connect or import history" },
    { label: "Biomarkers", ready: labs, detail: labs ? `${data.observations.length} observations available` : "Upload existing lab results" },
    { label: "DNA", ready: genetics, detail: genetics ? "Inherited context is processing or ready" : "Upload now or add later" },
  ];
}

function firstUnfinishedPeriod(experiment: Row | undefined) {
  const periods = Array.isArray(experiment?.periods) ? experiment.periods as Row[] : [];
  return periods.find((period) => !period.completed);
}

export function TodayExperience() {
  const { data, loading, refresh } = useAppData();
  const [note, setNote] = useState("");
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInNotice, setCheckInNotice] = useState("");
  const firstName = data?.member?.fullName?.trim().split(/\s+/)[0] || "there";
  const activeExperiment = data?.phase3.experiments.find((item) => item.status === "active");
  const activeIntervention = data?.responseState?.interventions.find((item) => item.status === "active");
  const nextPeriod = firstUnfinishedPeriod(activeExperiment);
  const periods = Array.isArray(activeExperiment?.periods) ? activeExperiment.periods as Row[] : [];
  const completedPeriods = periods.filter((period) => Boolean(period.completed)).length;
  const latestOutcome = data?.responseState?.responseAssessments[0] ?? data?.phase3.outcomes[0];
  const intakeReady = Boolean(data && data.intake.answered >= Math.min(10, data.intake.total));
  const layers = sourceState(data);
  const hasSignals = layers.some((item) => item.ready);

  let next = { kicker: "START HERE", title: "Tell us what matters to you", detail: "Complete the essential context so your Twin can distinguish what you feel from what your data suggests.", href: "/intake", cta: "Complete essential intake" };
  if (intakeReady && !hasSignals) next = { kicker: "ADD A SIGNAL", title: "Bring your existing health data", detail: "Connect a wearable, upload a recent lab result, or add DNA. You can start with any one of them.", href: "/data", cta: "Connect or import data" };
  else if (intakeReady && hasSignals && !data?.twin) next = { kicker: "BASELINE", title: "Build your first evidence snapshot", detail: "We will check coverage, freshness and missing information before recommending any change.", href: "/twin", cta: "Build my Twin" };
  else if (activeIntervention || activeExperiment) next = { kicker: "TODAY'S LEARNING STEP", title: nextPeriod?.arm === "A" ? `Control day: ${String(nextPeriod.instruction ?? "keep your usual routine")}` : String(activeIntervention?.exactInstruction ?? nextPeriod?.instruction ?? activeExperiment?.title ?? "Continue your experiment"), detail: nextPeriod?.arm === "A" ? "Keeping the usual routine today gives your Twin a clean comparison. Do not add the experimental change." : "Follow only today’s assigned change. Your wearable records the outcome; add a note only if something unusual could affect it.", href: "/experiment", cta: "See experiment details" };
  else if (latestOutcome) next = { kicker: "RESULT READY", title: "Review what changed", detail: "Inspect the baseline, comparison window, data quality and uncertainty before deciding to keep, change or stop.", href: "/results", cta: "Review the result" };
  else if (data?.twin) next = { kicker: "READY TO LEARN", title: data.responseState?.priorityCandidates[0] ? String(data.responseState.priorityCandidates[0].title) : "Find the best measurable starting point", detail: "You do not need to choose a problem category yourself. Your Twin ranks focused experiments from your goal, current state, inherited context and available measurements.", href: "/experiment", cta: data.responseState?.priorityCandidates[0] ? "Review recommended experiment" : "Calculate my priority" };

  if (loading) return <section className="response-loading paper-card"><span className="live-dot"/><strong>Connecting your private health record…</strong></section>;
  const twinSummary = String(data?.twin?.summary ?? "").toLowerCase();
  const namedFocus = data?.twin?.domains.find((domain) => twinSummary.includes(String(domain.label ?? "").split(" ")[0].toLowerCase()));
  const topDomain = data?.twin?.domains.find((domain) => domain.status === "priority") ?? namedFocus ?? data?.twin?.domains[0];
  const confidence = topDomain ? Math.round(Number(topDomain.confidence ?? 0) * 100) : 0;
  const checkIn = async () => {
    setCheckingIn(true); setCheckInNotice("");
    try {
      const endpoint = nextPeriod?.id ? "/api/experiments/check-in" : activeIntervention?.id ? `/api/interventions/${activeIntervention.id}/check-in` : "";
      if (!endpoint) throw new Error("No check-in is scheduled for today.");
      const body = nextPeriod?.id
        ? { periodId: nextPeriod.id, completed: true, adherence: 1, context: note }
        : { scheduledAt: new Date().toISOString(), occurredAt: new Date().toISOString(), plannedValue: activeIntervention?.exactInstruction, actualValue: activeIntervention?.exactInstruction, completed: true, adherence: 1, note };
      const response = await fetch(endpoint, { method: nextPeriod?.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "The check-in could not be saved.");
      setNote(""); setCheckInNotice("Done — today’s routine and context were recorded."); await refresh();
    } catch (error) { setCheckInNotice(error instanceof Error ? error.message : "The check-in could not be saved."); }
    finally { setCheckingIn(false); }
  };

  return <>
    <header className="response-topbar">
      <div><p className="eyebrow">YOUR PERSONAL RESPONSE TWIN</p><h1>Good morning, {firstName}.</h1><p>One useful decision at a time—grounded in what we know, honest about what we do not.</p></div>
    </header>
    <section className="response-hero">
      <article className="next-decision-card"><span className="card-kicker">{next.kicker}</span><h2>{next.title}</h2><p>{next.detail}</p>{activeIntervention || activeExperiment ? <div className="today-checkin"><div><span>DAY {Math.min(completedPeriods + 1, periods.length || 1)} OF {periods.length || "CURRENT CYCLE"}</span><strong>{nextPeriod?.arm === "A" ? "Control routine" : "Intervention routine"}</strong></div><label><span>Anything unusual today? <small>optional</small></span><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Travel, illness, alcohol, poor sleep…" /></label><button disabled={checkingIn} type="button" onClick={() => void checkIn()}>{checkingIn ? "Saving…" : "Mark today done"}</button>{checkInNotice ? <p role="status">{checkInNotice}</p> : null}<Link href={next.href}>{next.cta} →</Link></div> : <Link className="primary-button" href={next.href}><span>{next.cta}</span><span>→</span></Link>}</article>
      <article className="learning-loop-card"><span className="card-kicker">HOW YOUR TWIN LEARNS</span><div className="learning-loop"><span><i>1</i><strong>Context</strong><small>What matters</small></span><span><i>2</i><strong>Hypothesis</strong><small>What may help</small></span><span><i>3</i><strong>Experiment</strong><small>One change</small></span><span><i>4</i><strong>Response</strong><small>What worked</small></span></div><p>DNA proposes inherited context. Biomarkers show your current state. Wearables reveal the response.</p></article>
    </section>
    <section className="response-grid">
      <article className="paper-card data-foundation-card"><div className="section-head compact"><div><span className="card-kicker">DATA FOUNDATION</span><h2>Your three biological layers</h2></div><Link href="/data">Manage</Link></div><div className="foundation-layers">{layers.map((layer, index) => <div className={layer.ready ? "ready" : "missing"} key={layer.label}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{layer.label}</strong><small>{layer.detail}</small></div><i>{layer.ready ? "Ready" : "Add"}</i></div>)}</div></article>
      <article className="paper-card evidence-now-card"><span className="card-kicker">WHAT WE KNOW NOW</span>{topDomain ? <><div className="evidence-state"><span>{String(topDomain.stateLabel ?? "Data available")}</span><strong>{confidence ? `${confidence}% evidence confidence` : "Confidence pending"}</strong></div><h2>{String(topDomain.label ?? "Current state")}</h2><p>{String(data?.twin?.summary ?? "Your evidence snapshot is ready to inspect.")}</p><div className="evidence-now-meta"><span><small>KEY SIGNAL</small><strong>{String(topDomain.keyMetric ?? "—")} {String(topDomain.keyValue ?? "")}</strong></span><span><small>FRESHNESS</small><strong>{String(topDomain.freshness ?? "Unknown")}</strong></span></div><Link href="/twin">Inspect evidence and unknowns →</Link></> : <><h2>No state has been inferred yet.</h2><p>We will not invent a score from missing information. Add one reliable source to begin.</p><Link href="/data">Add a data source →</Link></>}</article>
    </section>
    <section className="principles-strip"><span><strong>Measured</strong><small>Source and date preserved</small></span><span><strong>Inferred</strong><small>Confidence shown</small></span><span><strong>Unknown</strong><small>Missing data named</small></span><span><strong>Learned</strong><small>Response linked to one change</small></span></section>
  </>;
}
