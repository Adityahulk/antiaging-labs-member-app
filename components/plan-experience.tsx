"use client";

import { useMemo } from "react";
import { useAppData } from "./app-provider";
import { ExperimentWorkspace } from "./protocol-experience";

const domainOrder = ["nutrition", "training", "recovery", "sleep", "supplement", "supplements", "mind", "lifestyle"];
const domainLabels: Record<string, string> = {
  nutrition: "Nutrition",
  training: "Training",
  recovery: "Recovery & sleep",
  sleep: "Recovery & sleep",
  supplement: "Supplements & co-factors",
  supplements: "Supplements & co-factors",
  mind: "Mind & wellbeing",
  lifestyle: "Daily foundations",
};

function normaliseDomain(value: string) {
  const key = value.toLowerCase().replaceAll("_", " ");
  if (key.includes("sleep") || key.includes("recovery")) return "recovery";
  if (key.includes("supplement") || key.includes("co-factor")) return "supplement";
  if (key.includes("train") || key.includes("activity") || key.includes("exercise")) return "training";
  if (key.includes("food") || key.includes("diet") || key.includes("nutrition")) return "nutrition";
  if (key.includes("mind") || key.includes("stress")) return "mind";
  return "lifestyle";
}

export function PlanExperience() {
  const { data, toggleAction } = useAppData();
  const actions = useMemo(() => data?.protocol?.actions ?? [], [data?.protocol?.actions]);
  const grouped = useMemo(() => {
    const groups = new Map<string, typeof actions>();
    actions.forEach((action) => {
      const domain = normaliseDomain(action.domain || "lifestyle");
      groups.set(domain, [...(groups.get(domain) ?? []), action]);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => domainOrder.indexOf(a) - domainOrder.indexOf(b));
  }, [actions]);
  const completed = actions.filter((action) => action.done).length;
  const activeTest = data?.responseState?.interventions.find((item) => ["active", "approved", "paused"].includes(String(item.status))) ?? data?.phase3.experiments.find((item) => item.status === "active");

  return <div className="plan-experience">
    <section className="plan-overview">
      <article className="plan-overview-copy">
        <span className="card-kicker">YOUR PLAN</span>
        <h2>Foundations and one focus.</h2>
        <div className="plan-overview-stats">
          <span><strong>{actions.length}</strong><small>foundation actions</small></span>
          <span><strong>{completed}/{actions.length || "—"}</strong><small>done today</small></span>
          <span><strong>{activeTest ? "1" : "0"}</strong><small>current focus</small></span>
        </div>
      </article>
      <aside className="plan-current-focus">
        <span className="card-kicker">CURRENT FOCUS</span>
        <h3>{String(activeTest?.title ?? "Choose the clearest thing to learn next")}</h3>
        <p>{String(activeTest?.hypothesis ?? "Ranked from your goal, measurements, safety, and what we can measure.")}</p>
        <a href="#current-focus">{activeTest ? "Open today’s focus" : "Find my starting point"} ↓</a>
      </aside>
    </section>

    <section className="foundation-plan paper-card">
      <div className="section-head compact"><div><span className="card-kicker">FOUNDATIONS</span><h2>Daily actions</h2></div><span className="eta-chip">v{String(data?.protocol?.version ?? "—")}</span></div>
      {grouped.length ? <div className="foundation-domain-grid">{grouped.map(([domain, domainActions]) => <article key={domain}>
        <header><span>{String(domainActions.length).padStart(2, "0")}</span><h3>{domainLabels[domain] ?? "Daily foundations"}</h3></header>
        <div>{domainActions.map((action) => <label aria-label={`Mark ${action.title} complete`} className={action.done ? "complete" : ""} htmlFor={`plan-action-${action.id}`} key={action.id}>
          <input id={`plan-action-${action.id}`} checked={action.done} onChange={(event) => void toggleAction(action.id, event.target.checked)} type="checkbox" />
          <span><strong>{action.title}</strong><small>{action.detail}</small><em>Why: {action.reason}</em></span>
        </label>)}</div>
      </article>)}</div> : <div className="empty-state plan-empty"><h3>Your foundation plan is being prepared.</h3><p>Add context and one reliable signal. Actions are not invented from missing data.</p><a href="/intake">Complete my context →</a></div>}
    </section>

    <section className="response-test-section" id="current-focus">
      <ExperimentWorkspace />
    </section>
  </div>;
}
