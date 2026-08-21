import { getChatGPTUser } from "@/app/chatgpt-auth";
import { runtimeConfig } from "./integrations";

export type MemberIdentity = { id: string; email: string; fullName: string };

export async function getMemberIdentity(): Promise<MemberIdentity> {
  const signedIn = await getChatGPTUser();
  if (signedIn) return { id: signedIn.userId, email: signedIn.email, fullName: signedIn.fullName ?? signedIn.displayName };

  if (runtimeConfig().ALLOW_DEMO_AUTH === "true") return { id: "demo-member-arjun", email: "arjun@example.com", fullName: "Arjun Sharma" };
  throw new Response("Authentication required", { status: 401 });
}
