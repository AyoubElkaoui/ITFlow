import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-utils";

// Overzicht van alle klant-conversaties: één rij per ticket dat minstens één
// niet-interne notitie heeft, met het laatste bericht. Zo hoeft de medewerker
// niet eerst een ticket te openen en dan het notitie-tabblad te zoeken.
export async function GET() {
  try {
    await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Haal de recentste niet-interne notities op en dedupliceer naar één rij per
  // ticket (de nieuwste = het laatste bericht in de conversatie).
  const notes = await prisma.ticketNote.findMany({
    where: { isInternal: false },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      content: true,
      createdAt: true,
      authorContactId: true,
      user: { select: { name: true } },
      authorContact: { select: { name: true } },
      ticket: {
        select: {
          id: true,
          ticketNumber: true,
          subject: true,
          status: true,
          company: { select: { name: true } },
          contact: { select: { name: true } },
        },
      },
    },
  });

  const seen = new Set<string>();
  const conversations = [];
  for (const n of notes) {
    if (seen.has(n.ticket.id)) continue;
    seen.add(n.ticket.id);
    const fromClient = n.authorContactId !== null;
    conversations.push({
      ticketId: n.ticket.id,
      ticketNumber: n.ticket.ticketNumber,
      subject: n.ticket.subject,
      status: n.ticket.status,
      companyName: n.ticket.company.name,
      contactName: n.ticket.contact?.name ?? n.ticket.company.name,
      lastMessage: n.content,
      lastMessageAt: n.createdAt,
      lastFromClient: fromClient,
      lastAuthorName: fromClient
        ? (n.authorContact?.name ?? n.ticket.contact?.name ?? "Klant")
        : n.user.name,
    });
  }

  return NextResponse.json(conversations);
}
