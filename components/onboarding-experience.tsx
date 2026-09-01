"use client";

import { useAppData } from "./app-provider";
import { IntakeExperience } from "./workflow-experiences";

export function OnboardingExperience() {
  const { data } = useAppData();
  const hasWearable = data?.wearableConnections.some((item) => item.status === "active") ?? false;
  const hasLabs = data?.observations.some((item) => item.source === "lab" || item.sourceType === "lab") ?? false;
  const hasDna = Boolean(data?.genomics.artifacts.length);

  return (
    <>
      <section className="paper-card validation-panel" aria-labelledby="onboarding-title">
        <div>
          <span className="card-kicker">UNDERSTAND → MEASURE → TEST</span>
          <h2 id="onboarding-title">What matters to you.</h2>
          <p>Essential questions now. You can add more later.</p>
        </div>
        <div className="validation-steps" aria-label="Onboarding readiness">
          <span className={data?.intake.answered ? "done" : ""}><i>1</i><strong>Context</strong><small>{data?.intake.answered ? `${data.intake.answered} saved` : "Start here"}</small></span>
          <span className={hasWearable ? "done" : ""}><i>2</i><strong>Wearable</strong><small>{hasWearable ? "Connected" : "Can be added next"}</small></span>
          <span className={hasLabs ? "done" : ""}><i>3</i><strong>Biomarkers</strong><small>{hasLabs ? "Available" : "Optional initially"}</small></span>
          <span className={hasDna ? "done" : ""}><i>4</i><strong>DNA</strong><small>{hasDna ? "Added" : "Central, not blocking"}</small></span>
        </div>
      </section>
      <IntakeExperience />
    </>
  );
}
