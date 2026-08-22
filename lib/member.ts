import { getAppAuthIdentity } from "./app-auth";
import { runtimeConfig } from "./integrations";

export type MemberIdentity = { id: string; email: string; fullName: string };

export async function getMemberIdentity(): Promise<MemberIdentity> {
  const signedIn = await getAppAuthIdentity();
  if (signedIn) return signedIn;

  if (runtimeConfig().ALLOW_DEMO_AUTH === "true") return { id: "demo-member-arjun", email: "arjun@example.com", fullName: "Arjun Sharma" };
  throw new Response("Authentication required", { status: 401 });
}
