import { redirect } from "next/navigation";

/** `/outcomes` was the original name for this screen. It is kept as a redirect
 *  so older links and bookmarks land on `/learnings` rather than a second,
 *  separately-maintained copy of the same report. */
export default function OutcomesPage() {
  redirect("/learnings");
}
