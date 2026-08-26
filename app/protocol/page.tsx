import { MemberShell, PageHeader } from "../../components/member-shell";
import { ExperimentWorkspace } from "../../components/protocol-experience";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Experiment — Antiaging Labs",
  description: "Your current measurable intervention and its evidence.",
  openGraph: { title: "Your Experiment — Antiaging Labs", description: "One change, one measurable question, and an honest result.", images: [] },
  twitter: { title: "Your Experiment — Antiaging Labs", description: "One change, one measurable question, and an honest result.", images: [] },
};

export default function ProtocolPage() {
  return (
    <MemberShell>
      <PageHeader eyebrow="YOUR EXPERIMENT" title="Change one thing. Learn from your response." description="Your goal, hypothesis, evidence, schedule, readiness, and measurable outcome in one place." />
      <ExperimentWorkspace />
    </MemberShell>
  );
}
