import { MemberShell, PageHeader } from "../../components/member-shell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Biological Twin — Antiaging Labs",
  description: "Explore your living health map, domain changes, evidence, and connected protocol actions.",
  openGraph: { title: "Your Biological Twin — Antiaging Labs", description: "Explore your living health map and the evidence behind every domain.", images: [] },
  twitter: { title: "Your Biological Twin — Antiaging Labs", description: "Explore your living health map and the evidence behind every domain.", images: [] },
};

const domainCards = [
  { name: "Metabolic", state: "Improving", score: "82", metric: "HOMA-IR 1.7", change: "↓ 18% from June", tone: "sage" },
  { name: "Cardiovascular", state: "Current priority", score: "71", metric: "ApoB 108 mg/dL", change: "Target < 80", tone: "rust" },
  { name: "Sleep & circadian", state: "Stable", score: "78", metric: "7h 42m average", change: "↑ 23 min regularity", tone: "blue" },
  { name: "Autonomic recovery", state: "Watch today", score: "64", metric: "HRV 39 ms RMSSD", change: "↓ 12% vs baseline", tone: "amber" },
  { name: "Activity & fitness", state: "On target", score: "80", metric: "8,420 steps/day", change: "4 of 5 workouts", tone: "sage" },
  { name: "Nutrition", state: "Building consistency", score: "74", metric: "Protein 112 g/day", change: "Target 130 g", tone: "blue" },
];

export default function TwinPage() {
  return (
    <MemberShell>
      <PageHeader
        eyebrow="YOUR BIOLOGICAL TWIN"
        title="Your health, alive and connected."
        description="Explore what is changing, what is driving it, and how your protocol responds."
        action={<div className="freshness-pill"><i /> Updated today, 8:10 AM</div>}
      />

      <section className="twin-explorer">
        <div className="twin-stage">
          <div className="twin-stage-head">
            <div><span className="card-kicker">LIVING HEALTH MAP</span><strong>Now</strong></div>
            <div className="range-switch"><button type="button">7D</button><button className="active" type="button">28D</button><button type="button">90D</button><button type="button">1Y</button></div>
          </div>
          <div className="expanded-map">
            <div className="map-ripple r1" /><div className="map-ripple r2" /><div className="map-ripple r3" />
            <div className="body-aura" /><div className="human-form expanded"><span className="form-head" /><span className="form-body" /></div>
            <button className="system-node metabolic active" type="button"><span>82</span><strong>Metabolic</strong><small>Improving</small></button>
            <button className="system-node cardiovascular" type="button"><span>71</span><strong>Cardio</strong><small>Priority</small></button>
            <button className="system-node sleep" type="button"><span>78</span><strong>Sleep</strong><small>Stable</small></button>
            <button className="system-node recovery" type="button"><span>64</span><strong>Recovery</strong><small>Watch</small></button>
            <button className="system-node activity" type="button"><span>80</span><strong>Activity</strong><small>On target</small></button>
          </div>
          <div className="time-scrubber"><span>22 JUL</span><div className="scrub-track"><i /><b /></div><span>19 AUG</span></div>
        </div>

        <aside className="twin-focus-panel">
          <div className="focus-head"><span className="domain-score sage">82</span><div><span className="card-kicker">SELECTED DOMAIN</span><h2>Metabolic</h2></div></div>
          <div className="focus-status"><span>Improving</span><strong>High confidence</strong></div>
          <p>Your glucose regulation is moving in the right direction. Fasting insulin and post-meal activity are the strongest current signals.</p>
          <div className="metric-stack">
            <div><span>HOMA-IR</span><strong>1.7</strong><small className="positive">↓ 18%</small></div>
            <div><span>Fasting insulin</span><strong>7.1</strong><small>µIU/mL</small></div>
            <div><span>Waist</span><strong>89</strong><small>cm</small></div>
          </div>
          <div className="evidence-box"><span>WHAT IS HELPING</span><strong>Post-meal walking · 81% adherence</strong><p>Your most consistent glucose-supporting action this cycle.</p></div>
          <a className="primary-button wide" href="#domain-detail"><span>Open full domain</span><span>→</span></a>
        </aside>
      </section>

      <section className="domain-mosaic">
        {domainCards.map((domain) => (
          <article className="domain-card paper-card" key={domain.name}>
            <div className="domain-card-top"><span className={`domain-score ${domain.tone}`}>{domain.score}</span><span className={`status-pill ${domain.tone}`}>{domain.state}</span></div>
            <h3>{domain.name}</h3>
            <div className="domain-metric"><strong>{domain.metric}</strong><span>{domain.change}</span></div>
            <div className={`micro-chart ${domain.tone}`}><i /><i /><i /><i /><i /><i /><i /><i /></div>
            <a href="#domain-detail">Explore evidence <span>→</span></a>
          </article>
        ))}
      </section>

      <section className="twin-lower-grid">
        <article className="paper-card twin-timeline-card">
          <div className="section-head compact"><div><span className="card-kicker">TWIN TIMELINE</span><h2>How your health story is changing</h2></div><button className="filter-button" type="button">All events ⌄</button></div>
          <div className="event-list">
            <div><time>Today</time><span className="event-dot amber" /><p><strong>Recovery moved below baseline</strong><small>Three-night pattern · Oura</small></p></div>
            <div><time>16 Aug</time><span className="event-dot sage" /><p><strong>Sleep regularity improved</strong><small>28-day comparison</small></p></div>
            <div><time>12 Aug</time><span className="event-dot rust" /><p><strong>Protocol v2 published</strong><small>Three actions changed</small></p></div>
            <div><time>28 Jul</time><span className="event-dot blue" /><p><strong>Oura baseline completed</strong><small>28 valid nights</small></p></div>
          </div>
        </article>
        <article className="paper-card coverage-card">
          <span className="card-kicker">DATA COVERAGE</span><h2>87%</h2><p>Strong enough for 8 of 10 domains</p>
          <div className="coverage-list"><span><i style={{width:"100%"}} />Intake <b>100%</b></span><span><i style={{width:"92%"}} />Wearables <b>92%</b></span><span><i style={{width:"72%"}} />Labs <b>72%</b></span><span><i style={{width:"40%"}} />Genetics <b>Processing</b></span></div>
          <a href="/data">Manage your data →</a>
        </article>
      </section>
    </MemberShell>
  );
}
