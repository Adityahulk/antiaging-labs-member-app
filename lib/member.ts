import { getChatGPTUser } from "@/app/chatgpt-auth";

export type MemberIdentity = { id: string; email: string; fullName: string };

export async function getMemberIdentity(): Promise<MemberIdentity> {
  const signedIn = await getChatGPTUser();
  if (signedIn) return { id: signedIn.userId, email: signedIn.email, fullName: signedIn.fullName ?? signedIn.displayName };

  // Local development uses one stable synthetic member. Production is deployed privately,
  // where Sites supplies authenticated user headers before requests reach the app.
  return { id: "demo-member-arjun", email: "arjun@example.com", fullName: "Arjun Sharma" };
}
