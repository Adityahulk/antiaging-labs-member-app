import { requireRole } from "@/lib/authz";

export async function POST() {
  await requireRole(["admin", "practitioner"]);
  return Response.json(
    {
      error:
        "Automated lab submission is disabled. Use the concierge fulfillment editor to record the vendor booking, status, reference, appointment, tracking link, instructions, and ETA.",
    },
    { status: 409 },
  );
}
