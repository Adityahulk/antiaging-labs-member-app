import { redirect } from "next/navigation";

/** Preserve old plan bookmarks while keeping one canonical member surface. */
export default function ProtocolPage() {
  redirect("/plan");
}
