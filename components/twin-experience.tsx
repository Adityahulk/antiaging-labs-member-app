"use client";
import { useMemo, useState } from "react";
import { useAppData } from "./app-provider";

type Phenotype = { status?: "expressed" | "not_expressed" | "unknown"; label?: string; basis?: string; observedAt?: string | null };
type InheritedContext = { id?: string; gene?: string; rsid?: string; title?: string; reviewStatus?: string; evidenceLabel?: string; hypothesis?: string; whatThisChanges?: string; wouldClarify?: string[]; phenotype?: Phenotype; canCreateAction?: boolean };
type Evidence = { score?: number | null; dataState?: "measured" | "data_needed"; readiness?: number; observations?: string[]; missing?: string[]; unknowns?: string[]; change?: string; nextLearningStep?: string; inheritedContext?: InheritedContext[]; method?: string };
type Layer = { type: string; status: string; quality: number; evidence: string[] };

const domainGenes: Record<string, string[]> = { metabolic: ["FTO", "PPARGC1A", "MTHFR"], cardiovascular: ["APOE"], sleep: ["CYP1A2"], recovery: ["COMT", "BDNF"], activity: ["ACTN3", "PPARGC1A"], body_composition: ["FTO"], kidney_liver: [], constraints: ["CYP1A2"] };
const phenotypeLabel = (status?: string) => status === "expressed" ? "Phenotype expressed" : status === "not_expressed" ? "Phenotype not expressed" : "Phenotype unknown";

export function TwinExperience() {
  const { data, refresh } = useAppData();
  const domains = useMemo(() => data?.twin?.domains ?? [], [data]);
  const [selectedCode, setSelectedCode] = useState("metabolic");
  const [busy, setBusy] = useState(false);
  const selected = domains.find((domain) => domain.domainCode === selectedCode) ?? domains[0];
  const recompute = async () => { setBusy(true); try { await fetch("/api/twin/recompute", { method: "POST" }); await refresh(); } finally { setBusy(false); } };
  if (!selected) return <div className="paper-card empty-state"><h2>Building your Twin</h2><p>Add a wearable, verified lab result, or genetics file. The Twin will show unknowns until each domain has enough evidence.</p><button onClick={() => void recompute()} className="primary-button" type="button">Build now →</button></div>;

  const evidence = (selected.evidenceJson ?? {}) as Evidence;
  const measured = evidence.dataState === "measured" && typeof evidence.score === "number";
  const readiness = Math.round(Number(evidence.readiness ?? 0) * 100);
  const fusion = data?.twin?.crossModal?.find((item) => item.domainCode === selected.domainCode);
  const layers = (fusion?.layersJson ?? []) as Layer[];
  const fallbackInherited = (data?.genomics?.interpretations ?? []).filter((item) => (domainGenes[String(selected.domainCode)] ?? []).includes(String(item.gene))).map((item) => ({ id: String(item.id), gene: String(item.gene), rsid: String(item.rsid), title: String(item.title), reviewStatus: item.status === "released" ? "reviewed" : "pending_review", evidenceLabel: String(item.evidenceLabel ?? item.evidenceLevel ?? "context only"), hypothesis: String(item.hypothesis ?? item.summary ?? "Inherited context hypothesis"), whatThisChanges: String(item.whatThisChanges ?? "This finding remains context only and cannot create an action."), wouldClarify: (item.wouldClarify as string[]) ?? [], phenotype: (item.phenotype as Phenotype) ?? { status: "unknown" }, canCreateAction: false }));
  const inherited = evidence.inheritedContext?.length ? evidence.inheritedContext : fallbackInherited;
  const reviewedGenetics = (data?.genomics?.interpretations ?? []).filter((item) => item.status === "released").length;

  return <>
    <section className="twin-explorer">
      <div className="twin-stage">
        <div className="twin-stage-head"><div><span className="card-kicker">DNA-INFORMED LIVING TWIN</span><strong>Snapshot v{String(data?.twin?.version ?? 1)}</strong></div><button disabled={busy} onClick={() => void recompute()} className="filter-button" type="button">{busy ? "Recomputing…" : "Refresh Twin"}</button></div>
        <div className="expanded-map"><div className="map-ripple r1"/><div className="map-ripple r2"/><div className="map-ripple r3"/><div className="body-aura"/><div className="human-form expanded"><span className="form-head"/><span className="form-body"/></div>{domains.slice(0, 5).map((domain, index) => { const detail = (domain.evidenceJson ?? {}) as Evidence; const hasScore = detail.dataState === "measured" && typeof detail.score === "number"; return <button onClick={() => setSelectedCode(String(domain.domainCode))} className={`system-node ${["metabolic", "cardiovascular", "sleep", "recovery", "activity"][index]} ${domain.domainCode === selected.domainCode ? "active" : ""}`} type="button" key={String(domain.domainCode)}><span>{hasScore ? String(detail.score) : "?"}</span><strong>{String(domain.label).replace("Cardiovascular", "Cardio").replace(" & circadian", "")}</strong><small>{hasScore ? String(domain.stateLabel) : "Data needed"}</small></button>; })}</div>
        <div className="time-scrubber"><span>DATA READINESS</span><div className="scrub-track"><i/><b style={{ left: `${data?.twin?.coverage ?? 0}%` }}/></div><span>{String(data?.twin?.coverage ?? 0)}% READY · {reviewedGenetics} REVIEWED DNA FINDINGS</span></div>
      </div>
      <aside className="twin-focus-panel">
        <div className="focus-head"><span className="domain-score sage">{measured ? String(evidence.score) : "?"}</span><div><span className="card-kicker">SELECTED DOMAIN</span><h2>{String(selected.label)}</h2></div></div>
        <div className="focus-status"><span>{measured ? String(selected.stateLabel) : "Unknown · data needed"}</span><strong>{measured ? `${Math.round(Number(fusion?.confidence ?? selected.confidence) * 100)}% confidence` : `${readiness}% data readiness`}</strong></div>
        <p>{String(fusion?.statement ?? data?.twin?.summary)}</p>
        <div className="metric-stack"><div><span>{String(selected.keyMetric)}</span><strong>{String(selected.keyValue)}</strong><small>{String(selected.keyUnit ?? "")}</small></div><div><span>Change</span><strong>{measured ? String(selected.trend) : "Unknown"}</strong><small>{String(evidence.change ?? "No reliable comparison yet")}</small></div><div><span>Freshness</span><strong>{String(selected.freshness)}</strong><small>{measured ? String(selected.target ?? "Personal context") : "No inferred reassurance"}</small></div></div>
        <div className="evidence-box"><span>MEASURED EVIDENCE</span>{(evidence.observations ?? []).length ? (evidence.observations ?? []).map((item) => <strong key={item}>{item}</strong>) : <strong>No qualifying measurement yet</strong>}{evidence.missing?.length ? <p>Missing: {evidence.missing.join(", ")}</p> : null}{evidence.unknowns?.map((item) => <p key={item}>Unknown: {item}</p>)}<p><strong>Active learning:</strong> {evidence.nextLearningStep ?? "Add the missing data needed to establish this domain."}</p></div>
      </aside>
    </section>

    <section className="paper-card fusion-stack">
      <div className="section-head compact"><div><span className="card-kicker">INHERITED CONTEXT</span><h2>DNA generates hypotheses—it never creates an action alone</h2></div><span className="eta-chip">{inherited.length} linked</span></div>
      {inherited.length ? <div className="fusion-layers">{inherited.map((item, index) => <article className={item.reviewStatus === "reviewed" ? "available" : "pending"} key={item.id ?? `${item.gene}-${item.rsid}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{item.gene} · {item.title}</strong><small>{item.reviewStatus === "reviewed" ? "reviewed context" : "review pending"} · {item.evidenceLabel}</small><p>{item.hypothesis}</p><p><strong>{phenotypeLabel(item.phenotype?.status)}</strong> · {item.phenotype?.basis ?? "Related phenotype has not been established."}</p><p><strong>What this changes:</strong> {item.whatThisChanges}</p><p><strong>Would clarify:</strong> {(item.wouldClarify ?? []).join(", ") || "corroborating phenotype and response data"}</p></div><i/></article>)}</div> : <div className="empty-state"><p>No supported inherited-context finding is linked to this domain yet. The Twin will not infer genetic reassurance or risk from absence of data.</p></div>}
    </section>

    <section className="fusion-stack paper-card"><div className="section-head compact"><div><span className="card-kicker">EVIDENCE ASSEMBLY</span><h2>What supports—and limits—this state</h2></div><span className="eta-chip">{String(fusion?.methodVersion ?? evidence.method ?? "observer")}</span></div><div className="fusion-layers">{layers.map((layer, index) => <article className={layer.status} key={layer.type}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{layer.type}</strong><small>{layer.status} · {Math.round(Number(layer.quality ?? 0) * 100)}% quality</small><p>{layer.evidence?.[0] ?? "No current evidence"}</p></div><i/></article>)}</div><p className="fusion-note">Measurements retain dates and provenance. Wearables update only domains they observe. Reviewed genetics adds inherited context and hypotheses, but it never increases a domain score or directly creates an action.</p></section>

    <section className="domain-mosaic">{domains.map((domain) => { const detail = (domain.evidenceJson ?? {}) as Evidence; const hasScore = detail.dataState === "measured" && typeof detail.score === "number"; return <button onClick={() => setSelectedCode(String(domain.domainCode))} className="domain-card paper-card" type="button" key={String(domain.domainCode)}><div className="domain-card-top"><span className="domain-score blue">{hasScore ? String(detail.score) : "?"}</span><span className={`status-pill ${hasScore ? "sage" : "amber"}`}>{hasScore ? String(domain.stateLabel) : "Data needed"}</span></div><h3>{String(domain.label)}</h3><div className="domain-metric"><strong>{String(domain.keyMetric)} {String(domain.keyValue)} {String(domain.keyUnit ?? "")}</strong><span>{hasScore ? String(domain.trend) : `${Math.round(Number(detail.readiness ?? 0) * 100)}% ready`}</span></div><div className="micro-chart blue"><i/><i/><i/><i/><i/><i/><i/><i/></div><span>Explore evidence and unknowns →</span></button>; })}</section>
  </>;
}
