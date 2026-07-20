import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePortalSession } from "@/lib/portal-auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let session;
  try {
    session = await requirePortalSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: {
      id: true,
      ticketNumber: true,
      subject: true,
      description: true,
      status: true,
      priority: true,
      category: true,
      companyId: true,
      contactId: true,
      createdAt: true,
      updatedAt: true,
      resolvedAt: true,
      closedAt: true,
      contact: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
      attachments: {
        select: { id: true, url: true, name: true, mimeType: true, size: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  // Alleen eigen tickets: gekoppeld aan dit contact (op naam gezet of zelf aangemaakt).
  if (!ticket || ticket.contactId !== session.contactId) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  // Ticket geopend -> markeer als gelezen (voor de ongelezen-indicator in de lijst).
  try {
    await prisma.portalTicketRead.upsert({
      where: {
        contactId_ticketId: {
          contactId: session.contactId,
          ticketId: id,
        },
      },
      create: { contactId: session.contactId, ticketId: id },
      update: { lastReadAt: new Date() },
    });
  } catch {
    // Leesstatus is niet kritiek voor het tonen van het ticket.
  }

  return NextResponse.json(ticket);
}
