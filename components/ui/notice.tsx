import type { ReactNode } from "react";

type Tone = "success" | "info" | "warning" | "error";

/** Errors are announced assertively; everything else politely, so a background
 *  save does not interrupt whatever the member is reading. */
const ROLE: Record<Tone, "status" | "alert"> = {
  success: "status",
  info: "status",
  warning: "status",
  error: "alert",
};

export function Notice({ tone = "success", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <p className={`workflow-notice tone-${tone}`} role={ROLE[tone]} aria-live={tone === "error" ? "assertive" : "polite"}>
      {children}
    </p>
  );
}
