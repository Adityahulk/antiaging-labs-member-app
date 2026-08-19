import { MemberShell, PageHeader } from "../../components/member-shell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Journey — Antiaging Labs",
  description: "Track every step from testing and connected data to your personalized protocol.",
  openGraph: { title: "Your Journey — Antiaging Labs", description: "Track testing, data, reports, and your protocol in one clear journey.", images: [] },
  twitter: { title: "Your Journey — Antiaging Labs", description: "Track testing, data, reports, and your protocol in one clear journey.", images: [] },
};

const stages = [
  { label: "Account created", detail: "Profile and goals", state: "complete", date: "12 Aug" },
  { label: "Health intake", detail: "Core and deep context", state: "complete", date: "14 Aug" },
  { label: "Wearables connected", detail: "Oura · 28 valid days", state: "complete", date: "15 Aug" },
  { label: "Blood collection", detail: "Tomorrow · 7:30–8:30 AM", state: "current", date: "20 Aug" },
  { label: "Laboratory processing", detail: "Expected 2–3 days", state: "future", date: "22 Aug" },
  { label: "Analysis", detail: "Data joined into your Twin", state: "future", date: "23 Aug" },
  { label: "Protocol ready", detail: "Your complete 12-week plan", state: "future", date: "24 Aug" },
  { label: "Retest", detail: "Measure your response", state: "future", date: "Nov" },
];

export default function JourneyPage() {
  return (
    <MemberShell>
      <PageHeader
        eyebrow="YOUR JOURNEY"
        title="One clear path, from data to progress."
        description="Every test, connection, report, and protocol milestone in one place."
        action={<a className="ask-button" href="/ask"><span className="spark">✦</span> Get help</a>}
      />

      <section className="journey-hero-grid">
        <article className="journey-next paper-card">
          <span className="card-kicker">NEXT IMPORTANT STEP</span>
          <div className="journey-next-body">
            <div className="date-tile"><strong>20</strong><span>AUG</span></div>
            <div>
              <p>Tomorrow · 7:30–8:30 AM</p>
              <h2>Fasting blood collection</h2>
              <span>At home · Tata 1mg phlebotomist</span>
            </div>
          </div>
          <div className="prep-list">
            <span className="complete">✓ <strong>Fasting window confirmed</strong></span>
            <span>○ <strong>Stop calories after 9:30 PM</strong></span>
            <span>○ <strong>Hydrate with plain water</strong></span>
          </div>
          <div className="action-row">
            <button className="primary-button" type="button"><span>View preparation</span><span>→</span></button>
            <button className="quiet-button" type="button">Reschedule</button>
          </div>
        </article>

        <article className="journey-progress-card">
          <div className="journey-progress-ring"><div><strong>72%</strong><span>FOUNDATION</span></div></div>
          <h2>Your data foundation is nearly complete.</h2>
          <p>Blood results will unlock your full metabolic and cardiovascular domains.</p>
          <div className="coverage-tags"><span>Intake <b>100%</b></span><span>Wearables <b>92%</b></span><span>Labs <b>Pending</b></span></div>
        </article>
      </section>

      <section className="journey-section paper-card">
        <div className="section-head compact"><div><span className="card-kicker">PROGRAM TIMELINE</span><h2>Your path to the first full protocol</h2></div><span className="eta-chip">4 days remaining</span></div>
        <div className="journey-timeline">
          {stages.map((stage, index) => (
            <div className={`journey-stage ${stage.state}`} key={stage.label}>
              <div className="stage-marker">{stage.state === "complete" ? "✓" : index + 1}</div>
              <div className="stage-copy"><strong>{stage.label}</strong><span>{stage.detail}</span></div>
              <time>{stage.date}</time>
            </div>
          ))}
        </div>
      </section>

      <section className="order-grid">
        <article className="order-card paper-card">
          <div className="order-icon">B</div>
          <div className="order-top"><span>BIOMARKER PANEL</span><strong>Appointment confirmed</strong></div>
          <h3>Advanced Longevity Panel</h3>
          <p>74 biomarkers · at-home collection</p>
          <div className="order-meta"><span>Order AL-2048</span><span>20 Aug</span></div>
          <a href="/tests">View booking →</a>
        </article>
        <article className="order-card paper-card">
          <div className="order-icon genetics">G</div>
          <div className="order-top"><span>GENETICS</span><strong>Kit in transit</strong></div>
          <h3>Longevity Genetics Array</h3>
          <p>Kit arriving by Friday · BlueDart</p>
          <div className="tracking-bar"><span /></div>
          <div className="order-meta"><span>Dispatched</span><span>Expected 21 Aug</span></div>
          <a href="/tests">Track kit →</a>
        </article>
      </section>
    </MemberShell>
  );
}
