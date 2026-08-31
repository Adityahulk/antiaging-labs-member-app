import type { Metadata } from "next";
import { MemberShell, PageHeader } from "@/components/member-shell";
import { PlanExperience } from "@/components/plan-experience";
import { DataGate } from "@/components/ui/data-gate";

export const metadata: Metadata = {
  title: "My Plan — Antiaging Labs",
  description: "Your complete health plan and the focused response test learning what works for you.",
};

export default function PlanPage() {
  return <MemberShell><PageHeader eyebrow="MY PLAN" title="Your plan. Your response. Your next decision." description="Follow the foundations that support your whole programme while your Twin learns one personal response at a time." /><DataGate lines={5} title="Loading your plan…"><PlanExperience /></DataGate></MemberShell>;
}
