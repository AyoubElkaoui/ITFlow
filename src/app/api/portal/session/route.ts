import { NextResponse } from "next/server";
import { getPortalSession } from "@/lib/portal-auth";

// Lichtgewicht sessie-info voor de client (header/begroeting). Bron van waarheid
// is de httpOnly-cookie; dit endpoint leest die server-side uit. Zo blijft de
// naam kloppen ook na het sluiten/heropenen van de browser (de cookie leeft 7
// dagen, terwijl sessionStorage bij het sluiten verdwijnt).
export async function GET() {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json(null);
  }
  return NextResponse.json({
    contactName: session.contactName,
    companyName: session.companyName,
  });
}
