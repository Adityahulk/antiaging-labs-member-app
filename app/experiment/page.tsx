import type { Metadata } from "next";
import { MemberShell, PageHeader } from "@/components/member-shell";
import { ExperimentWorkspace } from "@/components/protocol-experience";

export const metadata: Metadata = {
  title: "Your Experiment — Antiaging Labs",
  description: "One measurable intervention, its rationale, and your observed response.",
};

export default function ExperimentPage() {
  return <MemberShell><PageHeader eyebrow="YOUR EXPERIMENT" title="Change one thing. Learn from your response." description="See the hypothesis, evidence, safety readiness, schedule, adherence, and outcome before deciding what comes next." /><ExperimentWorkspace /></MemberShell>;
}
