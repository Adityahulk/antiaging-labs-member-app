"use client";

import { useMemo, useState } from "react";
import { useAppData } from "./app-provider";

type Phenotype = { status?: "expressed" | "not_expressed" | "unknown"; basis?: string };
type InheritedContext = { id?: string; gene?: string; rsid?: string; title?: string; reviewStatus?: string; evidenceLabel?: string; hypothesis?: string; whatThisChanges?: string; wouldClarify?: string[]; phenotype?: Phenotype };
type Evidence = { score?: number | null; dataState?: "measured" | "data_needed"; readiness?: number; observations?: string[]; missing?: string[]; unknowns?: string[]; change?: string; nextLearningStep?: string; inheritedContext?: InheritedContext[]; method?: string };
type Layer = { type: string; status: string; quality: number; evidence: string[] };

const domainGenes: Record<string, string[]> = { metabolic: ["FTO", "PPARGC1A", "MTHFR"], cardiovascular: ["APOE"], sleep: ["CYP1A2"], recovery: ["COMT", "BDNF"], activity: ["ACTN3", "PPARGC1A"], body_composition: ["FTO"], kidney_liver: [], constraints: ["CYP1A2"] };
const readable = (value: unknown) => String(value ?? "").replaceAll("_", " ");
const phenotypeLabel = (status?: string) => status === "expressed" ? "Observed in your current data" : status === "not_expressed" ? "Not observed in your current data" : "Not yet checked against your current data";
const isMeasured = (evidence: Evidence) => evidence.dataState === "measured" || (evidence.dataState === undefined && typeof evidence.score === "number");
const readinessFor = (evidence: Evidence, fallback: unknown) => Math.round(Number(evidence.readiness ?? (isMeasured(evidence) ? fallback : 0)) * 100);

export function TwinExperience() {
  const { data, refresh } = useAppData();
  const domains = useMemo(() => data?.twin?.domains ?? [], [data]);
  const [selectedCode, setSelectedCode] = useState("");
  const [busy, setBusy] = useState(false);
  const priorityDomain = domains.find((domain) => domain.status === "priority") ?? domains[0];
  const selected = domains.find((domain) => domain.domainCode === selectedCode) ?? priorityDomain;
  const recompute = async () => { setBusy(true); try { await fetch("/api/twin/recompute", { method: "POST" }); await refresh(); } finally { setBusy(false); } };
  if (!selected) return <div className="paper-card empty-state"><h2>Building your Twin</h2><p>Add a wearable, verified lab result, or genetics file. The Twin will keep each domain unknown until there is enough evidence.</p><button onClick={() => void recompute()} className="primary-button" type="button">Build now →</button></div>;

  const evidence = (selected.evidenceJson ?? {}) as Evidence;
  const measured = isMeasured(evidence);
  const fusion = data?.twin?.crossModal?.find((item) => item.domainCode === selected.domainCode);
  const confidence = Math.round(Number(fusion?.confidence ?? selected.confidence ?? 0) * 100);
  const readiness = readinessFor(evidence, fusion?.confidence ?? selected.confidence ?? 0);
  const layers = (fusion?.layersJson ?? []) as Layer[];
  const fallbackInherited = (data?.genomics?.interpretations ?? [])
    .filter((item) => (domainGenes[String(selected.domainCode)] ?? []).includes(String(item.gene)))
    .map((item) => ({ id: String(item.id), gene: String(item.gene), rsid: String(item.rsid), title: String(item.title), reviewStatus: item.status === "released" ? "reviewed" : "pending_review", evidenceLabel: String(item.evidenceLabel ?? item.evidenceLevel ?? "context only"), hypothesis: String(item.hypothesis ?? item.summary ?? "Inherited context hypothesis"), whatThisChanges: String(item.whatThisChanges ?? "This finding remains context only and cannot create an action."), wouldClarify: (item.wouldClarify as string[]) ?? [], phenotype: (item.phenotype as Phenotype) ?? { status: "unknown" } }));
  const inheritedRaw = evidence.inheritedContext?.length ? evidence.inheritedContext : fallbackInherited;
  const inherited = Array.from(new Map(inheritedRaw.map((item) => [`${item.gene}:${item.title}`, item])).values());
  const reviewedGenetics = (data?.genomics?.interpretations ?? []).filter((item) => item.status === "released").length;
  const activeFocus = data?.responseState?.interventions.find((item) => ["active", "approved", "paused"].includes(String(item.status))) ?? data?.phase3.experiments.find((item) => item.status === "active");
  const learnedCount = data?.responseState?.responseAssessments.length ?? 0;
  const measuredCount = domains.filter((domain) => isMeasured((domain.evidenceJson ?? {}) as Evidence)).length;

  return <>
    <section className="twin-story-grid">
      <article><span className="card-kicker">01 · MEASURED</span><strong>{measuredCount} of {domains.length} domains have a current signal</strong><p>Bloodwork, wearable data, intake and reviewed DNA keep their original source and date.</p><a href="/data">Manage my data →</a></article>
      <article className="priority"><span className="card-kicker">02 · STANDS OUT</span><strong>{String(priorityDomain?.label ?? "A priority is still being built")}</strong><p>{String(data?.twin?.summary ?? "Your Twin will name the clearest priority once enough reliable data is available.")}</p></article>
      <article><span className="card-kicker">03 · TESTING</span><strong>{String(activeFocus?.title ?? "No current focus")}</strong><p>{String(activeFocus?.hypothesis ?? "Your next focus will be selected from your goals, current state, safety and measurable outcomes.")}</p><a href="/plan">Open my plan →</a></article>
      <article><span className="card-kicker">04 · LEARNED</span><strong>{learnedCount ? `${learnedCount} personal ${learnedCount === 1 ? "learning" : "learnings"} recorded` : "Your record starts with the first completed test"}</strong><p>Useful, uncertain and repeated responses stay attached to the change that produced them.</p><a href="/learnings">Open learnings →</a></article>
    </section>
    <section className="twin-explorer customer-twin">
      <div className="twin-stage">
        <div className="twin-stage-head"><div><span className="card-kicker">HEALTH MAP</span><strong>Snapshot v{String(data?.twin?.version ?? 1)}</strong></div><button disabled={busy} onClick={() => void recompute()} className="filter-button" type="button">{busy ? "Refreshing…" : "Refresh with latest data"}</button></div>
        <div className="expanded-map" aria-label="Select a health domain">
          <div className="map-ripple r1"/><div className="map-ripple r2"/><div className="map-ripple r3"/><div className="body-aura"/><div className="human-form expanded"><span className="form-head"/><span className="form-body"/></div>
          {domains.slice(0, 5).map((domain, index) => { const detail = (domain.evidenceJson ?? {}) as Evidence; const known = isMeasured(detail); return <button onClick={() => setSelectedCode(String(domain.domainCode))} className={`system-node ${["metabolic", "cardiovascular", "sleep", "recovery", "activity"][index]} ${domain.domainCode === selected.domainCode ? "active" : ""}`} type="button" key={String(domain.domainCode)} aria-pressed={domain.domainCode === selected.domainCode}><span>{known ? "✓" : "?"}</span><strong>{String(domain.label).replace("Cardiovascular", "Cardio").replace(" & circadian", "")}</strong><small>{known ? String(domain.stateLabel) : "Needs data"}</small></button>; })}
        </div>
        <div className="time-scrubber" aria-hidden="true"><span>DATA COVERAGE</span><div className="scrub-track"><i/><b style={{ left: `${data?.twin?.coverage ?? 0}%` }}/></div><span>{String(data?.twin?.coverage ?? 0)}% · {reviewedGenetics} REVIEWED DNA FINDINGS</span></div>
      </div>
      <aside className="twin-focus-panel">
        <div className="focus-head"><span className={`domain-score ${measured ? "sage" : "amber"}`}>{measured ? "✓" : "?"}</span><div><span className="card-kicker">CURRENT STATE</span><h2>{String(selected.label)}</h2></div></div>
        <div className="focus-status"><span>{measured ? String(selected.stateLabel) : "Unknown · data needed"}</span><strong>{measured ? `${confidence}% signal strength` : `${readiness}% data ready`}</strong></div>
        <p>{String(fusion?.statement ?? data?.twin?.summary)}</p>
        <div className="metric-stack"><div><span>What we measured</span><strong>{String(selected.keyMetric ?? "Not measured")}</strong><small>{selected.keyValue === null || selected.keyValue === undefined ? "—" : `${String(selected.keyValue)} ${String(selected.keyUnit ?? "")}`}</small></div><div><span>What may be happening</span><strong>{measured ? readable(selected.trend || "No reliable change") : "Still unknown"}</strong><small>{String(evidence.change ?? "A second reliable measurement will show whether this is changing")}</small></div><div><span>What would clarify it</span><strong className="metric-action">{String(evidence.nextLearningStep ?? (measured ? `Repeat ${String(selected.keyMetric ?? "this measurement")} on schedule to confirm direction` : "Add the missing data for this domain"))}</strong><small>{String(selected.freshness ?? "Freshness unknown")}</small></div></div>
        <div className="evidence-box"><span>WHY YOUR TWIN SAYS THIS</span>{(evidence.observations ?? []).length ? (evidence.observations ?? []).slice(0, 3).map((item) => <strong key={item}>{item}</strong>) : <strong>No qualifying measurement yet</strong>}{evidence.missing?.length ? <p>To improve this: {evidence.missing.join(", ")}</p> : null}{evidence.unknowns?.slice(0, 2).map((item) => <p key={item}>Still unknown: {item}</p>)}</div>
      </aside>
    </section>

    <section className="domain-overview paper-card"><div className="section-head compact"><div><span className="card-kicker">EXPLORE YOUR BIOLOGY</span><h2>See what is measured, possible, or still unknown</h2></div></div><div>{domains.map((domain) => { const detail = (domain.evidenceJson ?? {}) as Evidence; const known = isMeasured(detail); const domainReadiness = readinessFor(detail, domain.confidence ?? 0); return <button onClick={() => { setSelectedCode(String(domain.domainCode)); window.scrollTo({ top: 0, behavior: "smooth" }); }} className={domain.domainCode === selected.domainCode ? "active" : ""} type="button" key={String(domain.domainCode)}><span className={`status-dot ${known ? "known" : "unknown"}`}/><strong>{String(domain.label)}</strong><small>{known ? String(domain.stateLabel) : `${domainReadiness}% data ready`}</small><em>{String(domain.keyMetric ?? "No key signal yet")} {domain.keyValue !== null && domain.keyValue !== undefined ? `· ${String(domain.keyValue)} ${String(domain.keyUnit ?? "")}` : ""}</em><i>→</i></button>; })}</div></section>

    <section className="paper-card fusion-stack inherited-summary">
      <div className="section-head compact"><div><span className="card-kicker">DNA CONTEXT FOR {String(selected.label).toUpperCase()}</span><h2>{inherited.length ? "Inherited clues that may refine this hypothesis" : "No supported DNA clue is linked here yet"}</h2><p className="fusion-note">DNA generates hypotheses and never increases a domain score; your measured phenotype and observed response decide what is useful.</p></div><span className="eta-chip">{inherited.length} linked</span></div>
      {inherited.length ? <div className="fusion-layers">{inherited.slice(0, 2).map((item, index) => <article className={item.reviewStatus === "reviewed" ? "available" : "pending"} key={item.id ?? `${item.gene}-${item.rsid}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{item.gene} · {item.title}</strong><small>{item.reviewStatus === "reviewed" ? "reviewed context" : "review pending"} · {item.evidenceLabel}</small><p>{item.hypothesis}</p><p><strong>{phenotypeLabel(item.phenotype?.status)}</strong></p><p><strong>What it changes:</strong> {item.whatThisChanges}</p></div><i/></article>)}</div> : <div className="empty-state"><p>DNA is important to your Twin, but it stays as inherited context until current biomarkers or response data support it. It never creates an action by itself.</p></div>}
      {inherited.length > 2 ? <details className="twin-details"><summary>See {inherited.length - 2} more linked DNA findings</summary><div className="fusion-layers">{inherited.slice(2).map((item, index) => <article key={item.id ?? `${item.gene}-${item.rsid}-${index}`}><span>{String(index + 3).padStart(2, "0")}</span><div><strong>{item.gene} · {item.title}</strong><small>{item.evidenceLabel}</small><p>{item.hypothesis}</p></div><i/></article>)}</div></details> : null}
    </section>

    <details className="fusion-stack paper-card twin-details"><summary><span><span className="card-kicker">EVIDENCE DETAILS</span><strong>Sources supporting and limiting this state</strong></span><i>Open evidence trail</i></summary><div className="fusion-layers">{layers.map((layer, index) => <article className={layer.status} key={layer.type}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{readable(layer.type)}</strong><small>{readable(layer.status)} · source support {Math.round(Number(layer.quality ?? 0) * 100)}%</small><p>{layer.evidence?.[0] ?? "No current evidence"}</p></div><i/></article>)}</div><p className="fusion-note">Source support describes how much this source contributes to the current domain—not a grade for your health. Dates and provenance remain attached to every measurement.</p></details>
  </>;
}
