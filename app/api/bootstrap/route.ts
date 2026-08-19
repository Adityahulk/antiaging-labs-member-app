import { getMemberAppData } from "@/lib/bootstrap";
import { getMemberIdentity } from "@/lib/member";

export async function GET() {
  return Response.json(await getMemberAppData(await getMemberIdentity()), { headers: { "Cache-Control": "no-store" } });
}
