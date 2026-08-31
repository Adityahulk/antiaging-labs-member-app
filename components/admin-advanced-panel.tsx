"use client";

import { useState } from "react";
import { AdminBackupPanel, AdminExperience, AdminSupportPanel } from "./workflow-experiences";
import { AdminPhase3 } from "./phase3-experiences";

export function AdminAdvancedPanel() {
  const [open, setOpen] = useState(false);
  if (!open) return <section className="paper-card admin-advanced-launch"><div><span className="card-kicker">DETAILED OPERATIONS</span><h2>Load the full operations workspace only when you need it.</h2><p>Orders, reviews, model validation, and cohort analysis are intentionally deferred so access requests and urgent queues stay fast.</p></div><button className="primary-button" onClick={() => setOpen(true)} type="button"><span>Load detailed operations</span><span>→</span></button></section>;
  return <><AdminSupportPanel /><AdminBackupPanel /><AdminExperience /><AdminPhase3 /></>;
}
