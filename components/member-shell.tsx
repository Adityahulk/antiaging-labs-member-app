"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import Link from "next/link";
import { useAppData } from "./app-provider";

const primaryNavigation = [
  { href: "/", label: "Today", glyph: "01" },
  { href: "/experiment", label: "Experiment", glyph: "02" },
  { href: "/results", label: "Results", glyph: "03" },
  { href: "/twin", label: "Twin", glyph: "04" },
];

const libraryNavigation = [
  { href: "/data", label: "Data sources" },
  { href: "/genetics", label: "Inherited context" },
  { href: "/reports", label: "Reports" },
  { href: "/tests", label: "Tests & orders" },
  { href: "/support", label: "Privacy & support" },
];

function stageFor(data: ReturnType<typeof useAppData>["data"]) {
  if (!data) return { label: "Loading your state", detail: "Connecting your secure health record", progress: 8 };
  const activeExperiment = data.responseState?.interventions.find((item) => item.status === "active") ?? data.phase3.experiments.find((item) => item.status === "active");
  if (activeExperiment) return { label: "Learning from your response", detail: String(activeExperiment.title ?? "One experiment is active"), progress: 76 };
  if (data.responseState?.responseAssessments.length) return { label: "A result is ready", detail: "Review what changed and choose what happens next", progress: 92 };
  if (data.intake.answered < Math.min(10, data.intake.total)) return { label: "Complete your context", detail: "Answer the essentials so analysis can begin", progress: 18 };
  const hasSignals = data.sources.length > 0 || data.wearableConnections.some((item) => item.status === "active") || data.observations.length > 0;
  if (!hasSignals) return { label: "Add your first signal", detail: "Connect a wearable or import existing data", progress: 32 };
  if (!data.twin) return { label: "Building your baseline", detail: "Checking coverage, quality and missing context", progress: 48 };
  if (data.phase3.outcomes.length) return { label: "Health trends available", detail: "Review movement while your Twin gathers causal evidence", progress: 68 };
  return { label: "Choose your first learning cycle", detail: "Your data is ready for one focused experiment", progress: 62 };
}

export function MemberShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data } = useAppData();
  const name = data?.member?.fullName?.trim() || "Member";
  const initials = name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const stage = stageFor(data);

  return (
    <div className="app-shell response-shell">
      <aside className="sidebar response-sidebar">
        <Link className="brand" href="/" aria-label="Antiaging Labs home">
          <span className="brand-mark">A</span>
          <span>ANTIAGING LABS</span>
        </Link>
        <nav className="primary-nav response-primary-nav" aria-label="Primary navigation">
          {primaryNavigation.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname === item.href || (item.href === "/experiment" && pathname === "/experiments") || (item.href === "/results" && pathname === "/outcomes");
            return <Link key={item.href} className={`nav-item ${active ? "active" : ""}`} href={item.href}><span>{item.glyph}</span>{item.label}</Link>;
          })}
        </nav>
        <div className="response-stage-card">
          <span>YOUR CURRENT STAGE</span><strong>{stage.label}</strong><p>{stage.detail}</p><div><i style={{ width: `${stage.progress}%` }} /></div>
        </div>
        <nav className="library-nav" aria-label="Health record and settings">
          <span>YOUR RECORD</span>
          {libraryNavigation.map((item) => <Link className={pathname === item.href ? "active" : ""} href={item.href} key={item.href}>{item.label}<i>→</i></Link>)}
          {data?.roles.includes("admin") ? <Link href="/admin">Operations<i>→</i></Link> : null}
        </nav>
        <a className="profile-button" href="/auth/logout" title="Sign out">
          <span className="avatar">{initials}</span><span><strong>{name}</strong><small>Founding member</small></span><span className="more">SIGN OUT</span>
        </a>
      </aside>
      <main className="main-content subpage-main response-main">{children}</main>
      <Link className="floating-guide" href="/ask" aria-label="Ask your data-aware guide"><span>✦</span> Ask your Twin</Link>
      <nav className="mobile-nav response-mobile-nav" aria-label="Mobile navigation">
        {primaryNavigation.map((item) => <Link className={(item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)) ? "active" : ""} href={item.href} key={item.href}><span>{item.glyph}</span>{item.label}</Link>)}
      </nav>
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <header className="page-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{action ? <div className="page-action">{action}</div> : null}</header>;
}
