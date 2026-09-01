"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type AppData = {
  member: { id: string; fullName: string; email: string; primaryGoal: string } | null;
  roles: string[];
  catalog: Array<Record<string, unknown>>;
  journey: Array<{ id: number; stepCode: string; title: string; detail: string; state: string; dueAt: string | null }>;
  journeyProgress: number;
  orders: Array<Record<string, unknown>>;
  sources: Array<Record<string, unknown>>;
  twin: ({ coverage: number; summary: string; asOf: string; domains: Array<Record<string, unknown>>; crossModal?: Array<Record<string, unknown>> } & Record<string, unknown>) | null;
  genomics: { artifacts: Array<Record<string, unknown>>; interpretations: Array<Record<string, unknown>>; runs: Array<Record<string, unknown>> };
  reports: Array<Record<string, unknown>>;
  protocol: ({ id: string; version: number; strategy: string; actions: Array<{ id: number; scheduledTime: string; title: string; detail: string; reason: string; domain: string; done: boolean }> } & Record<string, unknown>) | null;
  observations: Array<Record<string, unknown>>;
  intake: { answered: number; total: number };
  notifications: Array<Record<string, unknown>>;
  dailyAdjustment: Record<string, unknown> | null;
  wearableConnections: Array<Record<string, unknown>>;
  integrations: Record<string, { mode: string; ready: boolean }>;
  phase3: { outcomes: Array<Record<string, unknown>>; researchConsent: (Record<string, unknown> & { granted: boolean }) | null; companions: Array<Record<string, unknown>>; experiments: Array<Record<string, unknown>>; predictions: Array<Record<string, unknown>>; jurisdiction: Record<string, unknown> };
  responseState: { goal: Record<string, unknown> | null; priorityAssessment: Record<string, unknown> | null; priorityCandidates: Array<Record<string, unknown>>; safetyDecisions: Array<Record<string, unknown>>; interventions: Array<Record<string, unknown>>; responseAssessments: Array<Record<string, unknown>> };
  interoperability: Record<string, { mode?: string; standard?: string; profile?: string; ready: boolean }>;
};

type ContextValue = {
  data: AppData | null;
  loading: boolean;
  authStatus: "checking" | "authenticated" | "unauthenticated" | "beta" | "error";
  betaStatus: string | null;
  /** Set when the member record could not be loaded. While this is non-null,
   *  callers must not render values — a partial or absent record would be
   *  indistinguishable from a real health record of zeroes. */
  error: string | null;
  refresh: () => Promise<void>;
  toggleAction: (id: number, done: boolean) => Promise<void>;
};
const AppContext = createContext<ContextValue | null>(null);

const LOAD_FAILED = "We could not reach your health record. Nothing shown below would be trustworthy, so we have stopped here.";

type BootstrapResult = { kind: "authenticated"; data: AppData } | { kind: "unauthenticated" } | { kind: "beta"; status: string };

async function fetchBootstrap(): Promise<BootstrapResult> {
  const response = await fetch("/api/bootstrap", { cache: "no-store" });
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) {
    const result = await response.json().catch(() => ({})) as { betaStatus?: string };
    return { kind: "beta", status: result.betaStatus ?? "pending" };
  }
  if (!response.ok) throw new Error(LOAD_FAILED);
  return { kind: "authenticated", data: await response.json() as AppData };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<ContextValue["authStatus"]>("checking");
  const [betaStatus, setBetaStatus] = useState<string | null>(null);

  const apply = useCallback((result: BootstrapResult) => {
    if (result.kind === "authenticated") { setData(result.data); setAuthStatus("authenticated"); setBetaStatus(null); setError(null); return; }
    setData(null);
    setAuthStatus(result.kind);
    setBetaStatus(result.kind === "beta" ? result.status : null);
    setError(null);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      apply(await fetchBootstrap());
    } catch {
      setData(null);
      setAuthStatus("error");
      setError(LOAD_FAILED);
    } finally {
      setLoading(false);
    }
  }, [apply]);

  // The initial load stays as a promise chain rather than `await load()` so no
  // state is set synchronously inside the effect body.
  useEffect(() => {
    let live = true;
    void fetchBootstrap()
      .then((next) => { if (live) apply(next); })
      .catch(() => { if (live) { setData(null); setAuthStatus("error"); setError(LOAD_FAILED); } })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [apply]);

  const toggleAction = useCallback(async (id: number, done: boolean) => {
    setData((current) => current?.protocol ? { ...current, protocol: { ...current.protocol, actions: current.protocol.actions.map((action) => action.id === id ? { ...action, done } : action) } } : current);
    const response = await fetch(`/api/protocol/actions/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ done }) });
    if (!response.ok) await load();
  }, [load]);

  const value = useMemo(() => ({ data, loading, authStatus, betaStatus, error, refresh: load, toggleAction }), [data, loading, authStatus, betaStatus, error, load, toggleAction]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppData() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useAppData must be used inside AppProvider");
  return value;
}
