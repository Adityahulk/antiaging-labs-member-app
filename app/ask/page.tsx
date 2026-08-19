import { MemberShell, PageHeader } from "../../components/member-shell";
import { ChatExperience } from "../../components/chat-experience";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ask — Antiaging Labs",
  description: "Personal answers grounded in your health data, Twin, and current protocol.",
  openGraph: { title: "Ask — Antiaging Labs", description: "Personal answers grounded in your data and protocol.", images: [] },
  twitter: { title: "Ask — Antiaging Labs", description: "Personal answers grounded in your data and protocol.", images: [] },
};

export default function AskPage() {
  return (
    <MemberShell>
      <PageHeader eyebrow="ASK" title="Your health, in conversation." description="Personal answers grounded in your data, Twin, and current protocol." />
      <ChatExperience />
    </MemberShell>
  );
}
