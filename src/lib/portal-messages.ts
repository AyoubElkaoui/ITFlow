import { prisma } from "@/lib/prisma";

export interface PortalConversation {
  ticketId: string;
  ticketNumber: number;
  subject: string;
  status: string;
  lastMessage: string;
  lastMessageAt: Date;
  lastFromClient: boolean;
  unreadCount: number;
}

// Gesprekken van één portal-contact: per eigen ticket met minstens één
// (niet-interne) bericht het laatste bericht + het aantal ongelezen
// support-reacties. Gebruikt door de Berichten-pagina en de teller in de balk.
export async function getPortalConversations(
  contactId: string,
): Promise<PortalConversation[]> {
  const notes = await prisma.ticketNote.findMany({
    where: {
      isInternal: false,
      ticket: { contactId },
    },
    orderBy: { createdAt: "desc" },
    select: {
      content: true,
      createdAt: true,
      authorContactId: true,
      ticket: {
        select: { id: true, ticketNumber: true, subject: true, status: true },
      },
    },
  });

  if (notes.length === 0) return [];

  const ticketIds = [...new Set(notes.map((n) => n.ticket.id))];
  const reads = await prisma.portalTicketRead.findMany({
    where: { contactId, ticketId: { in: ticketIds } },
    select: { ticketId: true, lastReadAt: true },
  });
  const lastReadByTicket = new Map(reads.map((r) => [r.ticketId, r.lastReadAt]));

  const byTicket = new Map<string, PortalConversation>();
  for (const n of notes) {
    const tId = n.ticket.id;
    const isReply = n.authorContactId === null; // reactie van support
    if (!byTicket.has(tId)) {
      // Eerste (= nieuwste) notitie voor dit ticket -> laatste bericht.
      byTicket.set(tId, {
        ticketId: tId,
        ticketNumber: n.ticket.ticketNumber,
        subject: n.ticket.subject,
        status: n.ticket.status,
        lastMessage: n.content,
        lastMessageAt: n.createdAt,
        lastFromClient: !isReply,
        unreadCount: 0,
      });
    }
    if (isReply) {
      const lastRead = lastReadByTicket.get(tId);
      if (!lastRead || n.createdAt > lastRead) {
        byTicket.get(tId)!.unreadCount += 1;
      }
    }
  }

  // Notities kwamen al nieuw -> oud binnen, dus de map behoudt die volgorde.
  return [...byTicket.values()];
}
