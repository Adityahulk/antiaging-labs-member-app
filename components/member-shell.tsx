"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAppData } from "./app-provider";
import Link from "next/link";

const navigation = [
  { href: "/", number: "01", label: "Today" },
  { href: "/journey", number: "02", label: "Journey" },
  { href: "/twin", number: "03", label: "Twin" },
  { href: "/protocol", number: "04", label: "Protocol" },
  { href: "/reports", number: "05", label: "Reports" },
  { href: "/data", number: "06", label: "Data" },
  { href: "/genetics", number: "07", label: "Genetics" },
  { href: "/outcomes", number: "08", label: "Progress" },
  { href: "/experiments", number: "09", label: "Experiments" },
  { href: "/ask", number: "10", label: "Ask" },
  { href: "/admin", number: "11", label: "Operations" },
];

export function MemberShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data } = useAppData();
  const name = data?.member?.fullName ?? "Arjun Sharma";
  const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const progress = data?.journeyProgress ?? 72;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="Antiaging Labs home">
          <span className="brand-mark">A</span>
          <span>ANTIAGING LABS</span>
        </Link>

        <nav className="primary-nav" aria-label="Primary navigation">
          {navigation.filter((item)=>item.href!=="/admin"||data?.roles.includes("admin")).map((item) => (
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
          <div className="mini-head"><span>FOUNDATION</span><strong>{progress}%</strong></div>
          <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
          <p>2 steps until your first complete protocol</p>
          <a href="/journey">Continue journey <span>→</span></a>
        </div>

        <a className="profile-button" href="/signout-with-chatgpt?return_to=%2F" title="Sign out">
          <span className="avatar">{initials}</span>
          <span><strong>{name}</strong><small>Founding member</small></span>
          <span className="more">SIGN OUT</span>
        </a>
      </aside>

      <main className="main-content subpage-main">{children}</main>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        <Link className={pathname === "/" ? "active" : ""} href="/"><span>●</span>Today</Link>
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
