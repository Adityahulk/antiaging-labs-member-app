"use client";
/* eslint-disable react-hooks/exhaustive-deps */
import { useMemo } from "react";
import { useAppData } from "./app-provider";
import { UploadExperience, WearableConnections } from "./workflow-experiences";
import { CompanionConnections } from "./phase3-experiences";
export function DataExperience() {
  const { data } = useAppData();
  const artifacts = data?.genomics?.artifacts ?? [];
  const sources = useMemo(() => {
    const base = (data?.sources ?? []).map((item) => ({
      id: String(item.id),
      name: String(item.name),
      type: String(item.category),
      state: String(item.status),
      detail: item.lastSyncAt
        ? `Updated ${new Date(String(item.lastSyncAt)).toLocaleDateString()}`
        : "Awaiting data",
      coverage: Number(item.coverage),
      glyph: String(item.name).charAt(0),
    }));
    if (artifacts.length)
      base.push({
        id: String(artifacts[0].id),
        name: "Genomic artifact",
        type: "Genetics",
        state: String(artifacts[0].status),
        detail: `${String(artifacts[0].genomeBuild)} · ${String(artifacts[0].format)}`,
        coverage:
          Number(
            (artifacts[0].qcJson as { callRate?: number })?.callRate ?? 0,
          ) * 100,
        glyph: "G",
      });
    return base;
  }, [data, artifacts]);
  const coverage = data?.twin?.coverage ?? 0;
  return (
    <>
      <section className="data-entry-hero">
        <div><span className="card-kicker">BUILD YOUR EVIDENCE FOUNDATION</span><h1>Start with what you already have.</h1><p>You do not need every data source to begin. Each layer answers a different question, and your Twin stays explicit about what is still unknown.</p></div>
        <div className="data-entry-paths">
          <a href="#wearables"><span>01</span><strong>Wearable history</strong><small>How your body changes day to day</small><i>{data?.wearableConnections.some((item)=>item.status==="active")?"Connected":"Connect"} →</i></a>
          <a href="#uploads"><span>02</span><strong>Existing labs</strong><small>Your current internal state</small><i>{data?.observations.length?"Available":"Upload"} →</i></a>
          <a href="#uploads" className="genome-path"><span>03</span><strong>DNA context</strong><small>Inherited hypotheses to test—not destiny</small><i>{artifacts.length?"Added":"Upload or add later"} →</i></a>
        </div>
      </section>
      <section className="data-summary-grid">
        <article className="paper-card data-summary">
          <span>OVERALL COVERAGE</span>
          <strong>{coverage}%</strong>
          <p>{data?.twin?.domains.length ?? 0} Twin domains supported</p>
          <div className="summary-bar">
            <i style={{ width: `${coverage}%` }} />
          </div>
        </article>
        <article className="paper-card data-summary">
          <span>OBSERVATIONS</span>
          <strong>{data?.observations.length ?? 0}</strong>
          <p>Latest canonical records in view</p>
          <small>Labs, imports and daily summaries</small>
        </article>
        <article className="paper-card data-summary">
          <span>GENOMIC FOUNDATION</span>
          <strong>
            {artifacts.length
              ? String(artifacts[0].status).replaceAll("_", " ")
              : "Not added"}
          </strong>
          <p>
            {artifacts.length
              ? `${String(artifacts[0].genomeBuild)} · ${data?.genomics.interpretations.length ?? 0} supported findings`
              : "Raw array or VCF"}
          </p>
          <small>
            <a href="/genetics">Open genetics →</a>
          </small>
        </article>
      </section>
      <div id="wearables"><WearableConnections /></div>
      <CompanionConnections />
      <section className="source-section paper-card">
        <div className="section-head compact">
          <div>
            <span className="card-kicker">CONNECTED SOURCES</span>
            <h2>Where your data comes from</h2>
          </div>
          <span className="eta-chip">{sources.length} sources</span>
        </div>
        <div className="source-list">
          {sources.map((source) => (
            <div className="source-row" key={source.id}>
              <span className="source-glyph sage">{source.glyph}</span>
              <span className="source-main">
                <strong>{source.name}</strong>
                <small>{source.type}</small>
              </span>
              <span className="source-sync">
                <strong>{source.state.replaceAll("_", " ")}</strong>
                <small>{source.detail}</small>
              </span>
              <span className="source-coverage">
                <strong>{Math.round(source.coverage)}%</strong>
                <small>coverage</small>
              </span>
            </div>
          ))}
        </div>
      </section>
      <section className="data-lower-grid">
        <article className="paper-card metric-browser">
          <div className="section-head compact">
            <div>
              <span className="card-kicker">DATA EXPLORER</span>
              <h2>Canonical record</h2>
            </div>
          </div>
          <div className="metric-categories">
            <a href="#labs">
              <span className="rust">
                {data?.observations.filter(
                  (item) =>
                    !String(item.source).match(/Oura|WHOOP|Apple|Garmin/),
                ).length ?? 0}
              </span>
              <strong>Biomarkers</strong>
              <small>Measured values</small>
            </a>
            <a href="#sleep">
              <span className="blue">
                {data?.twin?.domains.filter((item) =>
                  ["sleep", "recovery", "activity"].includes(
                    String(item.domainCode),
                  ),
                ).length ?? 0}
              </span>
              <strong>Wearable states</strong>
              <small>Personal baseline</small>
            </a>
            <a href="/genetics">
              <span className="sage">
                {data?.genomics.interpretations.length ?? 0}
              </span>
              <strong>Genetics</strong>
              <small>Versioned context</small>
            </a>
            <a href="/intake">
              <span className="amber">{data?.intake.answered ?? 0}</span>
              <strong>Intake</strong>
              <small>of {data?.intake.total ?? 0} answers</small>
            </a>
          </div>
        </article>
        <article className="paper-card data-quality">
          <span className="card-kicker">DATA QUALITY</span>
          <h2>{coverage >= 80 ? "Strong foundation" : "Still resolving"}</h2>
          <p>
            Quality, freshness, missingness, and provenance stay visible in
            every downstream state.
          </p>
          <div>
            {data?.twin?.domains
              .filter(
                (item) =>
                  ((item.evidenceJson as { missing?: string[] })?.missing
                    ?.length ?? 0) > 0,
              )
              .slice(0, 2)
              .map((item, index) => (
                <span key={String(item.domainCode)}>
                  <i>{index + 1}</i>
                  <strong>{String(item.label)}</strong>
                  <small>
                    {(
                      (item.evidenceJson as { missing?: string[] }).missing ??
                      []
                    ).join(", ")}
                  </small>
                </span>
              ))}
          </div>
          <a href="/twin">Explore fusion evidence →</a>
        </article>
      </section>
      <div id="uploads"><UploadExperience /></div>
    </>
  );
}
