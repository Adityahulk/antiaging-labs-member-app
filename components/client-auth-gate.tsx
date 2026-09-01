"use client";

import type { ReactNode } from "react";
import { AuthForm } from "./auth-form";
import { BetaGate } from "./beta-gate";
import { useAppData } from "./app-provider";

export function ClientAuthGate({ children }: { children: ReactNode }) {
  const { authStatus, betaStatus, refresh } = useAppData();
  if (authStatus === "checking") return <main className="session-check"><span className="session-spinner"/><strong>Opening your secure record…</strong></main>;
  if (authStatus === "authenticated") return children;
  if (authStatus === "beta") return <BetaGate status={betaStatus ?? "pending"} />;
  if (authStatus === "error") return <main className="session-check"><strong>We could not open the app.</strong><button className="primary-button" onClick={() => void refresh()} type="button">Try again</button></main>;
  return <main className="auth-screen"><section className="auth-card"><span className="auth-mark">A</span><p className="eyebrow">YOUR PERSONAL RESPONSE TWIN</p><h1>Your body doesn’t respond like everyone else’s.</h1><p>Antiaging Labs uses your bloodwork, DNA, and wearables to build a plan and show what actually works for you.</p><AuthForm onAuthenticated={refresh}/></section></main>;
}
