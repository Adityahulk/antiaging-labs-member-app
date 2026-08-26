import type { Metadata } from "next";
import { MemberShell, PageHeader } from "@/components/member-shell";
import { OutcomesExperience, OutcomesLoader } from "@/components/phase3-experiences";

export const metadata: Metadata = {
  title: "Your Results — Antiaging Labs",
  description: "Intervention-linked results with uncertainty, confounders, and source evidence.",
};

export default function ResultsPage() {
  return <MemberShell><PageHeader eyebrow="YOUR RESULTS" title="What changed—and what we learned." description="Inspect the comparison, uncertainty, confounders, and intervention link before choosing to keep, change, or stop." /><OutcomesLoader /><OutcomesExperience /></MemberShell>;
}
