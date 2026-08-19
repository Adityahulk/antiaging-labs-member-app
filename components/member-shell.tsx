"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navigation = [
  { href: "/", number: "01", label: "Today" },
  { href: "/journey", number: "02", label: "Journey" },
  { href: "/twin", number: "03", label: "Twin" },
  { href: "/protocol", number: "04", label: "Protocol" },
  { href: "/reports", number: "05", label: "Reports" },
  { href: "/data", number: "06", label: "Data" },
  { href: "/ask", number: "07", label: "Ask" },
];

export function MemberShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="Antiaging Labs home">
          <span className="brand-mark">A</span>
          <span>ANTIAGING LABS</span>
        </a>

        <nav className="primary-nav" aria-label="Primary navigation">
          {navigation.map((item) => (
            <a
              key={item.href}
              className={`nav-item ${pathname === item.href ? "active" : ""}`}
              href={item.href}
            >
              <span>{item.number}</span>{item.label}
            </a>
          ))}
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

      <main className="main-content subpage-main">{children}</main>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        <a className={pathname === "/" ? "active" : ""} href="/"><span>●</span>Today</a>
        <a className={pathname === "/twin" ? "active" : ""} href="/twin"><span>◈</span>Twin</a>
        <a className={pathname === "/protocol" ? "active" : ""} href="/protocol"><span>✓</span>Protocol</a>
        <a className={pathname === "/reports" ? "active" : ""} href="/reports"><span>▤</span>Reports</a>
        <a className={pathname === "/ask" ? "active" : ""} href="/ask"><span>✦</span>Ask</a>
      </nav>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action ? <div className="page-action">{action}</div> : null}
    </header>
  );
}
