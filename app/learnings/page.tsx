import type { Metadata } from "next";
import { MemberShell, PageHeader } from "@/components/member-shell";
import { OutcomesLoader } from "@/components/phase3-experiences";
import { CustomerResultsExperience } from "@/components/customer-results-experience";
import { DataGate } from "@/components/ui/data-gate";

export const metadata: Metadata = {
  title: "My Learnings — Antiaging Labs",
  description: "Your growing personal record of what helped, what did not, and what remains uncertain.",
};

export default function LearningsPage() {
  return <MemberShell><PageHeader eyebrow="LEARNINGS" title="What has worked for you." description="Each test stays attached to the change that produced it, including what is still uncertain." /><DataGate lines={5} title="Loading what your Twin has learned…"><OutcomesLoader /><CustomerResultsExperience /></DataGate></MemberShell>;
}
