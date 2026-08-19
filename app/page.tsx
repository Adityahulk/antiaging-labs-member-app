const domains = [
  { name: "Metabolic", status: "Improving", value: "82", tone: "sage" },
  { name: "Recovery", status: "Watch today", value: "64", tone: "amber" },
  { name: "Sleep", status: "Stable", value: "78", tone: "blue" },
  { name: "Cardio", status: "Priority", value: "71", tone: "rust" },
];

const protocol = [
  { time: "07:15", title: "Morning light", detail: "12 minutes outdoors", done: true },
  { time: "08:30", title: "Protein-first breakfast", detail: "35 g protein · 10 g fibre", done: true },
  { time: "12:40", title: "Post-meal walk", detail: "12 minutes · easy pace", done: false },
  { time: "17:30", title: "Zone 2 training", detail: "35 minutes · HR 132–146", done: false },
];

export default function Home() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#top" aria-label="Antiaging Labs home">
          <span className="brand-mark">A</span>
          <span>ANTIAGING LABS</span>
        </a>

        <nav className="primary-nav" aria-label="Primary navigation">
          <a className="nav-item active" href="/"><span>01</span>Today</a>
          <a className="nav-item" href="/journey"><span>02</span>Journey</a>
          <a className="nav-item" href="/twin"><span>03</span>Twin</a>
          <a className="nav-item" href="/protocol"><span>04</span>Protocol</a>
          <a className="nav-item" href="/reports"><span>05</span>Reports</a>
          <a className="nav-item" href="/data"><span>06</span>Data</a>
          <a className="nav-item" href="/ask"><span>07</span>Ask</a>
        </nav>

        <div className="journey-mini">
          <div className="mini-head"><span>FOUNDATION</span><strong>72%</strong></div>
          <div className="progress-track"><span /></div>
          <p>2 steps until your first complete protocol</p>
          <a href="/journey">Continue journey <span>→</span></a>
        </div>

        <button className="profile-button" type="button">
          <span className="avatar">AS</span>
          <span><strong>Arjun Sharma</strong><small>Founding member</small></span>
          <span className="more">•••</span>
        </button>
      </aside>

      <main id="top" className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">WEDNESDAY · 19 AUGUST</p>
            <h1>Good morning, Arjun.</h1>
            <p className="subhead">Today is about recovery without losing momentum.</p>
          </div>
          <div className="top-actions">
            <button className="icon-button" aria-label="Notifications" type="button">2</button>
            <a className="ask-button" href="/ask"><span className="spark">✦</span> Ask anything</a>
          </div>
        </header>

        <section id="today" className="hero-grid">
          <article className="next-card paper-card">
            <div className="card-kicker"><span className="live-dot" /> YOUR NEXT MOVE</div>
            <div className="next-copy">
              <p className="next-time">Before 1:00 PM</p>
              <h2>Walk after lunch.</h2>
              <p>A short walk today supports your glucose response and keeps your activity rhythm intact while recovery is lower.</p>
            </div>
            <div className="action-row">
              <button className="primary-button" type="button"><span>Start 12 min walk</span><span>→</span></button>
              <button className="quiet-button" type="button">Why this today?</button>
            </div>
            <div className="evidence-line"><span>Based on</span><strong>Glucose trend</strong><i /> <strong>Recovery state</strong><i /> <strong>Protocol v2</strong></div>
          </article>

          <article id="twin" className="twin-card">
            <div className="twin-head">
              <div><span className="card-kicker">YOUR BIOLOGICAL TWIN</span><h2>Living health map</h2></div>
              <button className="time-control" type="button">Now <span>⌄</span></button>
            </div>

            <div className="health-map" aria-label="Interactive health domain overview">
              <div className="orbital orbital-one" />
              <div className="orbital orbital-two" />
              <div className="core-glow" />
              <div className="human-form"><span className="form-head" /><span className="form-body" /></div>
              <div className="map-node node-metabolic"><span>METABOLIC</span><strong>Improving</strong></div>
              <div className="map-node node-recovery"><span>RECOVERY</span><strong>Watch today</strong></div>
              <div className="map-node node-sleep"><span>SLEEP</span><strong>Stable</strong></div>
              <div className="map-node node-cardio"><span>CARDIO</span><strong>Priority</strong></div>
            </div>

            <div className="twin-foot">
              <span><i className="sync-dot" /> Updated 8:10 AM</span>
              <a href="/twin">Explore your Twin <span>→</span></a>
            </div>
          </article>
        </section>

        <section className="insight-strip" aria-label="Today's health changes">
          <div className="strip-title"><span>WHAT CHANGED</span><strong>Since yesterday</strong></div>
          <div className="change-item up"><span className="change-icon">↗</span><div><strong>Sleep timing</strong><small>23 min more consistent</small></div></div>
          <div className="change-item down"><span className="change-icon">↘</span><div><strong>Recovery</strong><small>Below 28-day baseline</small></div></div>
          <div className="change-item steady"><span className="change-icon">→</span><div><strong>Activity</strong><small>On weekly target</small></div></div>
          <a href="/twin">See evidence →</a>
        </section>

        <section className="content-grid">
          <article id="protocol" className="protocol-card paper-card">
            <div className="section-head">
              <div><span className="card-kicker">TODAY'S PROTOCOL</span><h2>Four actions, built around your day.</h2></div>
              <div className="completion-ring"><span>2/4</span></div>
            </div>
            <div className="protocol-list">
              {protocol.map((item) => (
                <button className={`protocol-item ${item.done ? "done" : ""}`} type="button" key={item.time}>
                  <span className="checkmark">{item.done ? "✓" : ""}</span>
                  <time>{item.time}</time>
                  <span className="protocol-copy"><strong>{item.title}</strong><small>{item.detail}</small></span>
                  <span className="row-arrow">→</span>
                </button>
              ))}
            </div>
            <a className="text-link" href="/protocol">Open full protocol <span>→</span></a>
          </article>

          <article className="domains-card paper-card">
            <div className="section-head compact">
              <div><span className="card-kicker">CURRENT STATE</span><h2>Your key domains</h2></div>
              <a href="/twin">View all</a>
            </div>
            <div className="domain-list">
              {domains.map((domain) => (
                <a className="domain-row" href={`#${domain.name.toLowerCase()}`} key={domain.name}>
                  <span className={`domain-score ${domain.tone}`}>{domain.value}</span>
                  <span className="domain-copy"><strong>{domain.name}</strong><small>{domain.status}</small></span>
                  <span className={`domain-trend ${domain.tone}`}><i /><i /><i /><i /><i /></span>
                  <span className="row-arrow">→</span>
                </a>
              ))}
            </div>
          </article>
        </section>
      </main>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        <a className="active" href="#today"><span>●</span>Today</a>
        <a href="/twin"><span>◈</span>Twin</a>
        <a href="/protocol"><span>✓</span>Protocol</a>
        <a href="/reports"><span>▤</span>Reports</a>
        <a href="/ask"><span>✦</span>Ask</a>
      </nav>
    </div>
  );
}
