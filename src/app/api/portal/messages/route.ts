import { NextResponse } from "next/server";
import { requirePortalSession } from "@/lib/portal-auth";
import { getPortalConversations } from "@/lib/portal-messages";

// Gesprekkenoverzicht voor de ingelogde klant (Berichten-pagina + balk-teller).
export async function GET() {
  let session;
  try {
    session = await requirePortalSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conversations = await getPortalConversations(session.contactId);
  return NextResponse.json(conversations);
}
