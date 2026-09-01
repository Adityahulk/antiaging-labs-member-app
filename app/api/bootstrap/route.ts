import { getMemberAppData } from "@/lib/bootstrap";
import { getAppAuthIdentity } from "@/lib/app-auth";
import { ensureBetaAccess } from "@/lib/beta-access";
import { runtimeConfig } from "@/lib/integrations";

export async function GET() {
  const signedIn = await getAppAuthIdentity();
  const identity = signedIn ?? (runtimeConfig().ALLOW_DEMO_AUTH === "true" ? { id: "demo-member-arjun", email: "arjun@example.com", fullName: "Arjun Sharma" } : null);
  if (!identity) return Response.json({ error: "Authentication required" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const beta = await ensureBetaAccess(identity);
  if (String(beta?.status) !== "approved") return Response.json({ error: "Founding beta approval required", betaStatus: String(beta?.status ?? "pending") }, { status: 403, headers: { "Cache-Control": "no-store" } });
  return Response.json(await getMemberAppData(identity), { headers: { "Cache-Control": "private, no-store" } });
}
