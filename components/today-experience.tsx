"use client";

import Link from "next/link";
import { useState } from "react";
import { useAppData } from "./app-provider";
import { ButtonLink } from "./ui/button";

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

function greetingFor(name: string, hour: number) {
  const hello = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return `${hello}, ${name}.`;
}

export function TodayExperience() {
  const { data, loading, refresh } = useAppData();
  const [note, setNote] = useState("");
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInNotice, setCheckInNotice] = useState("");
  const firstName = data?.member?.fullName?.trim().split(/\s+/)[0] || "there";
  const greeting = greetingFor(firstName, new Date().getHours());
  const activeExperiment = data?.phase3.experiments.find((item) => item.status === "active");
  const activeIntervention = data?.responseState?.interventions.find((item) => item.status === "active");
  const nextPeriod = firstUnfinishedPeriod(activeExperiment);
  const periods = Array.isArray(activeExperiment?.periods) ? activeExperiment.periods as Row[] : [];
  const completedPeriods = periods.filter((period) => Boolean(period.completed)).length;
  const latestOutcome = data?.responseState?.responseAssessments[0] ?? data?.phase3.outcomes[0];
  const intakeReady = Boolean(data && data.intake.answered >= Math.min(10, data.intake.total));
  const layers = sourceState(data);
  const hasSignals = layers.some((item) => item.ready);
  const returning = Boolean(data?.twin) || Boolean(activeIntervention || activeExperiment) || Boolean(latestOutcome);
  const showFoundation = !returning || layers.some((item) => !item.ready);

  let next = { kicker: "START HERE", title: "Tell us what matters to you", detail: "Answer the essentials so analysis can start.", href: "/intake", cta: "Complete essential intake" };
  if (intakeReady && !hasSignals) next = { kicker: "ADD A SIGNAL", title: "Bring your existing health data", detail: "Wearable, labs, or DNA — start with one.", href: "/data", cta: "Connect or import data" };
  else if (intakeReady && hasSignals && !data?.twin) next = { kicker: "BASELINE", title: "Build your first evidence snapshot", detail: "Coverage is checked before any change is recommended.", href: "/twin", cta: "Build my Twin" };
  else if (activeIntervention || activeExperiment) next = { kicker: "TODAY", title: nextPeriod?.arm === "A" ? `Keep it usual: ${String(nextPeriod.instruction ?? "follow your normal routine")}` : String(activeIntervention?.exactInstruction ?? nextPeriod?.instruction ?? activeExperiment?.title ?? "Continue your current focus"), detail: nextPeriod?.arm === "A" ? "Do not add the focused change today." : "Follow today’s change. Note only unusual context.", href: "/plan", cta: "Open today’s focus" };
  else if (latestOutcome) next = { kicker: "NEW LEARNING", title: "See what changed", detail: "Check certainty, then keep, adjust, or stop.", href: "/learnings", cta: "Review what we learned" };
  else if (data?.twin) next = { kicker: "READY TO LEARN", title: data.responseState?.priorityCandidates[0] ? String(data.responseState.priorityCandidates[0].title) : "Find the clearest thing to learn next", detail: "Ranked from your goal, current data, and what we can measure.", href: "/plan", cta: data.responseState?.priorityCandidates[0] ? "Review recommended focus" : "Find my starting point" };

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
    <header className={`response-topbar ${returning ? "is-returning" : ""}`}>
      <div><p className="eyebrow">TODAY</p><h1 suppressHydrationWarning>{greeting}</h1>{returning ? null : <p>What to do today.</p>}</div>
    </header>
    <section className={`response-hero ${returning ? "is-returning" : ""}`}>
      <article className="next-decision-card"><span className="card-kicker">{next.kicker}</span><h2>{next.title}</h2><p>{next.detail}</p>{activeIntervention || activeExperiment ? <div className="today-checkin"><div><span>DAY {Math.min(completedPeriods + 1, periods.length || 1)} OF {periods.length || "CURRENT CYCLE"}</span><strong>{nextPeriod?.arm === "A" ? "Usual routine" : "Focused change"}</strong></div><label><span>Anything unusual today? <small>optional</small></span><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Travel, illness, alcohol, poor sleep…" /></label><button disabled={checkingIn} type="button" onClick={() => void checkIn()}>{checkingIn ? "Saving…" : "Mark today done"}</button>{checkInNotice ? <p role="status">{checkInNotice}</p> : null}<Link href={next.href}>{next.cta} →</Link></div> : <ButtonLink href={next.href}>{next.cta}</ButtonLink>}</article>
      {returning ? null : <article className="learning-loop-card"><span className="card-kicker">HOW THIS WORKS</span><div className="learning-loop"><span><i>1</i><strong>Measure</strong><small>Your baseline</small></span><span><i>2</i><strong>Focus</strong><small>One change</small></span><span><i>3</i><strong>Compare</strong><small>Your response</small></span><span><i>4</i><strong>Remember</strong><small>What works</small></span></div></article>}
    </section>
    <section className="response-grid">
      {showFoundation ? <article className="paper-card data-foundation-card"><div className="section-head compact"><div><span className="card-kicker">YOUR DATA</span><h2>Wearable, labs, DNA</h2></div><Link href="/data">Manage</Link></div><div className="foundation-layers">{layers.map((layer, index) => <div className={layer.ready ? "ready" : "missing"} key={layer.label}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{layer.label}</strong><small>{layer.detail}</small></div><i>{layer.ready ? "Ready" : "Add"}</i></div>)}</div></article> : null}
      <article className="paper-card evidence-now-card"><span className="card-kicker">WHAT STANDS OUT</span>{topDomain ? <><div className="evidence-state"><span>{String(topDomain.stateLabel ?? "Data available")}</span><strong>{confidence ? `${confidence}% signal strength` : "Strength pending"}</strong></div><h2>{String(topDomain.label ?? "Current state")}</h2><p>{String(data?.twin?.summary ?? "Your evidence snapshot is ready to inspect.")}</p><div className="evidence-now-meta"><span><small>KEY SIGNAL</small><strong>{String(topDomain.keyMetric ?? "—")} {String(topDomain.keyValue ?? "")}</strong></span><span><small>LAST UPDATED</small><strong>{String(topDomain.freshness ?? "Unknown")}</strong></span></div><Link href="/twin">Open Twin →</Link></> : <><h2>No state has been inferred yet.</h2><p>We will not invent a score from missing information. Add one reliable source to begin.</p><Link href="/data">Add a data source →</Link></>}</article>
    </section>
    {returning ? null : <section className="principles-strip"><span><strong>Measured</strong><small>Source and date preserved</small></span><span><strong>Inferred</strong><small>Confidence shown</small></span><span><strong>Unknown</strong><small>Missing data named</small></span><span><strong>Learned</strong><small>Response linked to one change</small></span></section>}
  </>;
}
