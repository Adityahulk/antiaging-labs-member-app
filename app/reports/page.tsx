import { MemberShell, PageHeader } from "../../components/member-shell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reports — Antiaging Labs",
  description: "Explore summaries and deep analysis across biomarkers, wearables, genetics, and protocols.",
  openGraph: { title: "Reports — Antiaging Labs", description: "Your complete health analysis, from overview to deep dive.", images: [] },
  twitter: { title: "Reports — Antiaging Labs", description: "Your complete health analysis, from overview to deep dive.", images: [] },
};

const reports = [
  { type: "BIOMARKERS", title: "Complete biomarker analysis", date: "28 June 2026", status: "Ready", accent: "rust", note: "74 markers · 6 priority findings", href: "#biomarkers" },
  { type: "WEARABLES", title: "28-day wearable analysis", date: "18 August 2026", status: "New", accent: "sage", note: "Sleep · recovery · activity", href: "#wearables" },
  { type: "GENETICS", title: "Longevity genetics", date: "Processing", status: "In progress", accent: "amber", note: "Kit received · analysis underway", href: "#genetics" },
  { type: "PROTOCOL", title: "Personal protocol v2", date: "12 August 2026", status: "Current", accent: "blue", note: "12 weeks · 5 domains", href: "/protocol" },
];

export default function ReportsPage() {
  return (
    <MemberShell>
      <PageHeader eyebrow="REPORTS" title="The complete story behind your data." description="Fast summaries when you need clarity, full analysis when you want every detail." action={<button className="filter-button" type="button">All reports ⌄</button>} />
      <section className="featured-report">
        <div className="featured-copy"><span className="card-kicker">LATEST ANALYSIS · 18 AUG</span><h2>Your recovery is temporarily lower, while sleep regularity and activity consistency continue to improve.</h2><p>The current pattern supports a lighter training day—not a full stop. Your weekly protocol remains on track.</p><div className="featured-actions"><a className="primary-button wide" href="#wearable-report"><span>Open overview</span><span>→</span></a><a className="quiet-button" href="#deep-dive">Read deep dive</a></div></div>
        <div className="report-visual"><div className="report-chart"><span style={{height:"43%"}} /><span style={{height:"58%"}} /><span style={{height:"51%"}} /><span style={{height:"70%"}} /><span style={{height:"64%"}} /><span style={{height:"47%"}} /><span className="last" style={{height:"38%"}} /></div><div className="visual-labels"><span>12 AUG</span><strong>RECOVERY TREND</strong><span>TODAY</span></div><div className="report-metric"><span>Current HRV</span><strong>39 ms</strong><small>−12% vs baseline</small></div></div>
      </section>
      <section className="report-grid">
        {reports.map((report) => <a className="report-card paper-card" href={report.href} key={report.type}><div className="report-card-top"><span className={`report-glyph ${report.accent}`}>{report.type.charAt(0)}</span><span className={`status-pill ${report.accent}`}>{report.status}</span></div><span className="card-kicker">{report.type}</span><h3>{report.title}</h3><p>{report.note}</p><div className="report-card-foot"><time>{report.date}</time><span>Open →</span></div></a>)}
      </section>
      <section className="comparison-card paper-card"><div><span className="card-kicker">LONGITUDINAL VIEW</span><h2>See what changed between tests.</h2><p>Compare biomarkers, Twin states, and protocol versions across your complete history.</p></div><div className="comparison-dates"><span><small>BASELINE</small><strong>28 Jun</strong></span><i>→</i><span><small>NEXT RETEST</small><strong>10 Nov</strong></span></div><button className="primary-button" type="button"><span>Open comparison</span><span>→</span></button></section>
    </MemberShell>
  );
}
