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
};

type ContextValue = { data: AppData | null; loading: boolean; refresh: () => Promise<void>; toggleAction: (id: number, done: boolean) => Promise<void> };
const AppContext = createContext<ContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    const response = await fetch("/api/bootstrap", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load member data");
    setData(await response.json() as AppData);
    setLoading(false);
  }, []);
  useEffect(() => {
    fetch("/api/bootstrap", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<AppData> : Promise.reject(new Error("Could not load member data")))
      .then((next) => { setData(next); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const toggleAction = useCallback(async (id: number, done: boolean) => {
    setData((current) => current?.protocol ? { ...current, protocol: { ...current.protocol, actions: current.protocol.actions.map((action) => action.id === id ? { ...action, done } : action) } } : current);
    const response = await fetch(`/api/protocol/actions/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ done }) });
    if (!response.ok) await refresh();
  }, [refresh]);

  const value = useMemo(() => ({ data, loading, refresh, toggleAction }), [data, loading, refresh, toggleAction]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppData() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useAppData must be used inside AppProvider");
  return value;
}
