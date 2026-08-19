"use client";

import { useState } from "react";
import { useAppData } from "./app-provider";

const todayActions = [
  { id: 1, time: "07:15", title: "Morning light", detail: "12 minutes outdoors", reason: "Circadian rhythm", done: true },
  { id: 2, time: "08:30", title: "Protein-first breakfast", detail: "35 g protein · 10 g fibre", reason: "Metabolic · Muscle", done: true },
  { id: 3, time: "12:40", title: "Post-lunch walk", detail: "12 minutes · easy pace", reason: "Glucose response", done: false },
  { id: 4, time: "17:30", title: "Zone 2 training", detail: "35 minutes · HR 132–146", reason: "Cardio · Metabolic", done: false },
  { id: 5, time: "20:00", title: "Magnesium glycinate", detail: "200 mg with dinner", reason: "Recovery · Sleep", done: false },
  { id: 6, time: "22:20", title: "Wind-down sequence", detail: "Dim light · reading · 10 min breathwork", reason: "Sleep regularity", done: false },
];

const domains = [
  { key: "nutrition", number: "01", title: "Nutrition", subtitle: "Metabolic control without rigid dieting", items: ["130 g protein across 3 meals", "35–40 g fibre daily", "12-minute walk after lunch and dinner", "Finish dinner by 8:15 PM"], tone: "rust" },
  { key: "training", number: "02", title: "Training", subtitle: "Build aerobic capacity and preserve muscle", items: ["Zone 2 · 3 × 35 minutes", "Full-body strength · 3 sessions", "Intervals · 1 session after recovery normalizes", "8,000–10,000 daily steps"], tone: "sage" },
  { key: "recovery", number: "03", title: "Recovery & sleep", subtitle: "Consistency before optimization", items: ["11:00 PM–7:00 AM sleep window", "Morning outdoor light", "Caffeine cutoff at 1:30 PM", "Recovery adjustment on low-HRV days"], tone: "blue" },
  { key: "supplements", number: "04", title: "Supplements", subtitle: "Focused and measurable", items: ["Omega-3 · 1.8 g EPA+DHA with lunch", "Magnesium glycinate · 200 mg evening", "Vitamin D3 · 2,000 IU with breakfast", "Review after 12-week blood retest"], tone: "amber" },
  { key: "mind", number: "05", title: "Mind & wellbeing", subtitle: "Lower friction, better recovery", items: ["10-minute downshift after work", "One device-free meal daily", "Sunday planning reset", "Two social recovery blocks weekly"], tone: "blue" },
];

export function ProtocolExperience() {
  const { data, toggleAction: toggleActionRemote } = useAppData();
  const [view, setView] = useState<"today" | "week" | "full">("today");
  const actions = data?.protocol?.actions?.length ? data.protocol.actions : todayActions;
  const completed = actions.filter((action) => action.done).length;

  const toggleAction = (id: number) => {
    const action = actions.find((item) => item.id === id);
    if (action) void toggleActionRemote(id, !action.done);
  };

  return (
    <>
      <section className="protocol-hero">
        <div className="protocol-strategy">
          <span className="card-kicker">PROTOCOL V{String(data?.protocol?.version ?? 2)} · ACTIVE 12-WEEK CYCLE</span>
          <h2>{String(data?.protocol?.strategy ?? "Build the strongest next version of your daily routine.")}</h2>
          <div className="priority-row"><span><i>01</i> Metabolic flexibility</span><span><i>02</i> Cardiovascular risk</span><span><i>03</i> Recovery rhythm</span></div>
        </div>
        <div className="cycle-progress">
          <div className="large-ring"><div><strong>78%</strong><span>ADHERENCE</span></div></div>
          <div><strong>Foundation phase</strong><span>18 days complete · 10 remaining</span><a href="#progress">View progress →</a></div>
        </div>
      </section>

      <div className="protocol-toolbar">
        <div className="segmented-control">
          <button className={view === "today" ? "active" : ""} onClick={() => setView("today")} type="button">Today</button>
          <button className={view === "week" ? "active" : ""} onClick={() => setView("week")} type="button">This week</button>
          <button className={view === "full" ? "active" : ""} onClick={() => setView("full")} type="button">Full protocol</button>
        </div>
        <div className="protocol-toolbar-links"><a href="/ask">✦ Ask about this plan</a><button type="button">Download ↓</button></div>
      </div>

      {view === "today" ? (
        <section className="protocol-view-grid">
          <article className="daily-plan paper-card">
            <div className="section-head">
              <div><span className="card-kicker">WEDNESDAY · TODAY</span><h2>{completed} of {actions.length} complete</h2></div>
              <div className="daily-progress"><span style={{width: `${completed / actions.length * 100}%`}} /></div>
            </div>
            <div className="daily-actions">
              {actions.map((action) => (
                <button className={`daily-action ${action.done ? "done" : ""}`} onClick={() => toggleAction(action.id)} type="button" key={action.id}>
                  <span className="action-check">{action.done ? "✓" : ""}</span>
                  <time>{action.time}</time>
                  <span className="action-main"><strong>{action.title}</strong><small>{action.detail}</small></span>
                  <span className="reason-tag">{action.reason}</span>
                  <span className="row-arrow">→</span>
                </button>
              ))}
            </div>
          </article>
          <aside className="today-context">
            <article className="adjustment-card">
              <span className="card-kicker">TODAY&apos;S ADJUSTMENT</span><h3>{String(data?.dailyAdjustment?.adjustedValue ?? "Follow the approved plan.")}</h3><p>{String(data?.dailyAdjustment?.rationale ?? "Current signals remain inside the expected range.")}</p><div className="context-metrics"><span><strong>{String(data?.dailyAdjustment?.knob ?? "maintain")}</strong> knob</span><span><strong>1</strong> max change</span></div><a href="/twin">See supporting evidence →</a>
            </article>
            <article className="meal-card paper-card"><span className="card-kicker">NEXT MEAL</span><h3>High-protein lunch</h3><p>Tandoori chicken bowl · brown rice · cucumber raita · mixed greens</p><div><span>42 g protein</span><span>14 g fibre</span></div><a href="/ask">Find a substitution →</a></article>
          </aside>
        </section>
      ) : null}

      {view === "week" ? (
        <section className="week-view paper-card">
          <div className="section-head"><div><span className="card-kicker">WEEK 3</span><h2>Your training and recovery rhythm</h2></div><span className="eta-chip">18 of 24 actions complete</span></div>
          <div className="week-calendar">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => <div className={index === 2 ? "current" : index < 2 ? "complete" : ""} key={day}><span>{day}</span><strong>{17 + index}</strong><i>{index === 0 || index === 3 ? "Strength" : index === 1 || index === 2 || index === 5 ? "Zone 2" : "Recovery"}</i><small>{index < 2 ? "✓ Complete" : index === 2 ? "Today" : "Planned"}</small></div>)}
          </div>
        </section>
      ) : null}

      {view === "full" ? (
        <section className="full-protocol-grid">
          {domains.map((domain) => <article className="plan-domain paper-card" key={domain.key}><div className="plan-domain-head"><span>{domain.number}</span><div><h3>{domain.title}</h3><p>{domain.subtitle}</p></div><i className={domain.tone} /></div><ul>{domain.items.map((item) => <li key={item}>{item}</li>)}</ul><div className="plan-domain-foot"><a href={`/ask?topic=${domain.key}`}>Ask about this →</a><button type="button">View detail</button></div></article>)}
        </section>
      ) : null}

      <section id="progress" className="protocol-rationale paper-card">
        <div><span className="card-kicker">WHY THIS PROTOCOL</span><h2>Every action connects to your data.</h2><p>Open any relationship to see the finding, target, and expected response.</p></div>
        <div className="relationship-flow"><span>ApoB 108</span><i>→</i><span className="middle">Cardiovascular priority</span><i>→</i><span>Nutrition + Zone 2</span></div>
        <div className="relationship-flow"><span>HOMA-IR 1.7</span><i>→</i><span className="middle">Metabolic improvement</span><i>→</i><span>Walks + meal structure</span></div>
        <div className="relationship-flow"><span>HRV trend ↓</span><i>→</i><span className="middle">Recovery watch</span><i>→</i><span>Training adjustment</span></div>
      </section>
    </>
  );
}
