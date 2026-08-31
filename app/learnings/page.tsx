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
  return <MemberShell><PageHeader eyebrow="MY LEARNINGS" title="Your personal operating manual, built over time." description="Every response test adds to a permanent record of what appears helpful, what remains uncertain, and what belongs in your plan." /><DataGate lines={5} title="Loading what your Twin has learned…"><OutcomesLoader /><CustomerResultsExperience /></DataGate></MemberShell>;
}
