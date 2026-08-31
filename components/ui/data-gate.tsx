"use client";

import type { ReactNode } from "react";
import { useAppData } from "../app-provider";

export function Skeleton({ lines = 3, title }: { lines?: number; title?: string }) {
  return (
    <div className="skeleton paper-card" aria-busy="true" aria-live="polite">
      <span className="skeleton-label">{title ?? "Loading your record…"}</span>
      {Array.from({ length: lines }, (_, index) => (
        <i className="skeleton-line" key={index} />
      ))}
    </div>
  );
}

/**
 * Renders `children` only once the member record has actually arrived.
 *
 * Without this, a slow or failed bootstrap let screens fall through to their
 * empty state — so "no active experiment" or a 0% coverage ring looked like a
 * finding about the member rather than a missing fetch.
 */
export function DataGate({ children, lines, title }: { children: ReactNode; lines?: number; title?: string }) {
  const { data, loading, error, refresh } = useAppData();

  if (error) {
    return (
      <section className="record-unavailable paper-card" role="alert">
        <span className="card-kicker">RECORD UNAVAILABLE</span>
        <h2>We could not load this section.</h2>
        <p>{error}</p>
        <button className="primary-button" onClick={() => void refresh()} type="button">
          <span>Try again</span>
          <span aria-hidden="true">→</span>
        </button>
      </section>
    );
  }

  if (loading || !data) return <Skeleton lines={lines} title={title} />;

  return <>{children}</>;
}
