import { cookies } from "next/headers";
import { APP_SESSION_COOKIE, clearSessionCookie } from "@/lib/app-auth";
import { getDatabase } from "@/lib/database";

export async function GET() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(APP_SESSION_COOKIE)?.value;
  if (sessionId) await (await getDatabase()).prepare("DELETE FROM auth_sessions WHERE id=?").bind(sessionId).run();
  const headers = new Headers({ Location: "/" });
  clearSessionCookie(headers);
  return new Response(null, { status: 303, headers });
}
