import { MemberShell, PageHeader } from "../../components/member-shell";
import type { Metadata } from "next";
import { UploadExperience, WearableConnections } from "@/components/workflow-experiences";

export const metadata: Metadata = {
  title: "Your Data — Antiaging Labs",
  description: "See every connected source, metric, update, and calculation used by your app.",
  openGraph: { title: "Your Data — Antiaging Labs", description: "Everything connected and visible in one place.", images: [] },
  twitter: { title: "Your Data — Antiaging Labs", description: "Everything connected and visible in one place.", images: [] },
};

const sources = [
  { name: "Oura Ring", type: "Wearable", state: "Connected", detail: "Synced today, 8:04 AM", coverage: "92%", glyph: "O", tone: "sage" },
  { name: "Apple Health", type: "Health data", state: "Connected", detail: "Synced today, 7:58 AM", coverage: "88%", glyph: "A", tone: "blue" },
  { name: "Tata 1mg", type: "Laboratory", state: "74 results", detail: "Latest 28 Jun 2026", coverage: "72%", glyph: "T", tone: "rust" },
  { name: "Genetics Array", type: "Genetics", state: "Processing", detail: "Expected 24 Aug", coverage: "40%", glyph: "G", tone: "amber" },
  { name: "Health Intake", type: "Self-reported", state: "Complete", detail: "Updated 14 Aug", coverage: "100%", glyph: "I", tone: "sage" },
];

export default function DataPage() {
  return (
    <MemberShell>
      <PageHeader eyebrow="YOUR DATA" title="Everything connected, nothing hidden." description="See every source, metric, update, and calculation used across your Twin and protocol." action={<button className="primary-button" type="button"><span>＋ Add data</span><span>→</span></button>} />
      <section className="data-summary-grid"><article className="paper-card data-summary"><span>OVERALL COVERAGE</span><strong>87%</strong><p>8 Twin domains supported</p><div className="summary-bar"><i /></div></article><article className="paper-card data-summary"><span>OBSERVATIONS</span><strong>Connected</strong><p>Labs, imports and daily signals</p><small>Longitudinal record</small></article><article className="paper-card data-summary"><span>FRESHNESS</span><strong>Daily</strong><p>Provider sync and imports</p><small className="positive">Quality tracked per source</small></article></section>
      <WearableConnections />
      <section className="source-section paper-card"><div className="section-head compact"><div><span className="card-kicker">CONNECTED SOURCES</span><h2>Where your data comes from</h2></div><button className="filter-button" type="button">Manage sources</button></div><div className="source-list">{sources.map((source) => <button className="source-row" type="button" key={source.name}><span className={`source-glyph ${source.tone}`}>{source.glyph}</span><span className="source-main"><strong>{source.name}</strong><small>{source.type}</small></span><span className="source-sync"><strong>{source.state}</strong><small>{source.detail}</small></span><span className="source-coverage"><strong>{source.coverage}</strong><small>coverage</small></span><span className="row-arrow">→</span></button>)}</div></section>
      <section className="data-lower-grid"><article className="paper-card metric-browser"><div className="section-head compact"><div><span className="card-kicker">DATA EXPLORER</span><h2>Browse every metric</h2></div><a href="#all-metrics">View all</a></div><div className="metric-search">⌕ <span>Search 148 metrics</span><kbd>⌘ K</kbd></div><div className="metric-categories"><a href="#labs"><span className="rust">74</span><strong>Biomarkers</strong><small>6 priorities</small></a><a href="#sleep"><span className="blue">16</span><strong>Sleep</strong><small>Current</small></a><a href="#activity"><span className="sage">24</span><strong>Activity</strong><small>On target</small></a><a href="#recovery"><span className="amber">12</span><strong>Recovery</strong><small>Watch</small></a></div></article><article className="paper-card data-quality"><span className="card-kicker">DATA QUALITY</span><h2>Strong foundation</h2><p>Two additions will make your Twin more complete.</p><div><span><i>1</i><strong>Complete blood collection</strong><small>Unlocks full metabolic and cardio state</small></span><span><i>2</i><strong>Finish genetics processing</strong><small>Adds inherited context</small></span></div><a href="/journey">Continue your journey →</a></article></section>
      <UploadExperience />
    </MemberShell>
  );
}
