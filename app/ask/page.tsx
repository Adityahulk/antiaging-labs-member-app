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
      <PageHeader eyebrow="ASK YOUR TWIN" title="Ask about today, your plan, or what we have learned." description="Direct answers grounded in your own data, with the reasoning and remaining uncertainty kept visible." />
      <ChatExperience />
    </MemberShell>
  );
}
