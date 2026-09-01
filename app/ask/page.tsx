import { MemberShell, PageHeader } from "../../components/member-shell";
import { ChatExperience } from "../../components/chat-experience";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ask — Antiaging Labs",
  description: "Personal answers grounded in your plan, health data, and measured responses.",
  openGraph: { title: "Ask — Antiaging Labs", description: "Personal answers grounded in your plan and measured responses.", images: [] },
  twitter: { title: "Ask — Antiaging Labs", description: "Personal answers grounded in your plan and measured responses.", images: [] },
};

export default function AskPage() {
  return (
    <MemberShell>
      <PageHeader eyebrow="ASK" title="Ask about today, your plan, or a result." description="Answers stay grounded in your data, with the reasoning kept visible." />
      <ChatExperience />
    </MemberShell>
  );
}
