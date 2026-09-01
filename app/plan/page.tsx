import type { Metadata } from "next";
import { MemberShell, PageHeader } from "@/components/member-shell";
import { PlanExperience } from "@/components/plan-experience";
import { DataGate } from "@/components/ui/data-gate";

export const metadata: Metadata = {
  title: "My Plan — Antiaging Labs",
  description: "Your complete health plan and the focused response test learning what works for you.",
};

export default function PlanPage() {
  return <MemberShell><PageHeader eyebrow="PLAN" title="Your plan." description="Daily foundations, plus one change measured closely enough to learn from." /><DataGate lines={5} title="Loading your plan…"><PlanExperience /></DataGate></MemberShell>;
}
