"use client";
/* eslint-disable @next/next/no-html-link-for-pages */

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAppData } from "./app-provider";
import { Button } from "./ui/button";
import { Meter } from "./ui/meter";

const primaryNavigation = [
  { href: "/", label: "Today", shortLabel: "Today", glyph: "01" },
  { href: "/plan", label: "My Plan", shortLabel: "Plan", glyph: "02" },
  { href: "/learnings", label: "Learnings", shortLabel: "Learnings", glyph: "03" },
  { href: "/twin", label: "My Twin", shortLabel: "Twin", glyph: "04" },
];

const libraryNavigation = [
  { href: "/data", label: "Data" },
  { href: "/genetics", label: "Genetics" },
  { href: "/reports", label: "Reports" },
  { href: "/journey", label: "Timeline" },
  { href: "/tests", label: "Tests" },
  { href: "/support", label: "Help" },
];

const planAliases = ["/experiment", "/experiments", "/protocol"];
const learningAliases = ["/results", "/outcomes"];

function isNavActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/plan") return pathname === "/plan" || planAliases.includes(pathname) || pathname.startsWith("/experiment");
  if (href === "/learnings") return pathname === "/learnings" || learningAliases.includes(pathname) || pathname.startsWith("/result");
  return pathname === href || pathname.startsWith(`${href}/`);
}

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
  const { data, error, refresh } = useAppData();
  const [moreOpen, setMoreOpen] = useState(false);
  const name = data?.member?.fullName?.trim() || "Member";
  const email = data?.member?.email?.trim() || "Signed in";
  const initials = name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const stage = error
    ? { label: "Record unavailable", detail: "We could not reach your health record", progress: 0 }
    : stageFor(data);
  const moreActive = libraryNavigation.some((item) => isNavActive(pathname, item.href)) || pathname === "/ask" || pathname.startsWith("/admin") || pathname === "/intake";

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  return (
    <div className="app-shell response-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className="sidebar response-sidebar">
        <a className="brand" href="/" aria-label="Antiaging Labs home">
          <span className="brand-mark">A</span>
          <span>ANTIAGING LABS</span>
        </a>
        <nav className="primary-nav response-primary-nav" aria-label="Primary navigation">
          {primaryNavigation.map((item) => {
            const active = isNavActive(pathname, item.href);
            return <a key={item.href} className={`nav-item ${active ? "active" : ""}`} href={item.href}><span>{item.glyph}</span>{item.label}</a>;
          })}
        </nav>
        <div className="response-stage-card">
          <span>WHERE YOU ARE</span><strong>{stage.label}</strong><p>{stage.detail}</p>
          <Meter value={stage.progress} label={`Programme progress: ${stage.label}`} />
        </div>
        <nav className="library-nav" aria-label="Health record and settings">
          <span>YOUR RECORD</span>
          {libraryNavigation.map((item) => <a className={isNavActive(pathname, item.href) ? "active" : ""} href={item.href} key={item.href}>{item.label}<i>→</i></a>)}
          {data?.roles.includes("admin") ? <a className={pathname.startsWith("/admin") ? "active" : ""} href="/admin">Operations<i>→</i></a> : null}
        </nav>
        <a className="profile-button" href="/auth/logout" title="Sign out">
          <span className="avatar">{initials}</span><span><strong>{name}</strong><small>{email}</small></span><span className="more">SIGN OUT</span>
        </a>
      </aside>
      <main className="main-content subpage-main response-main" id="main-content">
        {error ? (
          <div className="shell-failure">
            <div className="record-unavailable paper-card" role="alert">
              <span className="card-kicker">RECORD UNAVAILABLE</span>
              <h2>We stopped rather than show you the wrong numbers.</h2>
              <p>{error}</p>
              <Button onClick={() => void refresh()}>Try again</Button>
            </div>
          </div>
        ) : children}
      </main>
      <a className="floating-guide" href="/ask" aria-label="Ask your Twin"><span>✦</span> Ask your Twin</a>
      <nav className="mobile-nav response-mobile-nav" aria-label="Mobile navigation">
        {primaryNavigation.map((item) => (
          <a className={isNavActive(pathname, item.href) ? "active" : ""} href={item.href} key={item.href}><span>{item.glyph}</span>{item.shortLabel}</a>
        ))}
        <button
          aria-controls="mobile-more-sheet"
          aria-expanded={moreOpen}
          className={moreOpen || moreActive ? "active" : ""}
          onClick={() => setMoreOpen((open) => !open)}
          type="button"
        >
          <span aria-hidden="true">···</span>More
        </button>
      </nav>
      {moreOpen ? (
        <div className="mobile-more">
          <button aria-label="Close menu" className="mobile-more-backdrop" onClick={() => setMoreOpen(false)} type="button" />
          <div aria-label="More" aria-modal="true" className="mobile-more-sheet" id="mobile-more-sheet" role="dialog">
            <div className="mobile-more-head">
              <strong>Your record</strong>
              <button onClick={() => setMoreOpen(false)} type="button">Close</button>
            </div>
            <nav aria-label="Record and settings">
              <a className={pathname === "/ask" ? "active" : ""} href="/ask" onClick={() => setMoreOpen(false)}><span>Ask your Twin</span><i>→</i></a>
              {libraryNavigation.map((item) => (
                <a className={isNavActive(pathname, item.href) ? "active" : ""} href={item.href} key={item.href} onClick={() => setMoreOpen(false)}><span>{item.label}</span><i>→</i></a>
              ))}
              {data?.roles.includes("admin") ? <a className={pathname.startsWith("/admin") ? "active" : ""} href="/admin" onClick={() => setMoreOpen(false)}><span>Operations</span><i>→</i></a> : null}
            </nav>
            <a className="mobile-more-signout" href="/auth/logout">Sign out · {name}</a>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return <header className="page-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{description ? <p>{description}</p> : null}</div>{action ? <div className="page-action">{action}</div> : null}</header>;
}
