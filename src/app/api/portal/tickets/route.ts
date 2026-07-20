import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePortalSession } from "@/lib/portal-auth";
import { notifyAdmins } from "@/lib/notifications";
import { resolveStaffOwnerId } from "@/lib/portal-attribution";

export async function GET(request: NextRequest) {
  let session;
  try {
    session = await requirePortalSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = Math.min(Number(searchParams.get("pageSize")) || 20, 100);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    // Een portal-gebruiker ziet ALLEEN tickets die aan hém/haar als contact
    // gekoppeld zijn: door ons op hun naam gezet, of door henzelf via het
    // portaal aangemaakt (die krijgen bij aanmaken automatisch contactId = hijzelf).
    // Bewust NIET op companyId filteren — dat zou álle bedrijfstickets tonen.
    contactId: session.contactId,
    ...(status && {
      status: status as
        | "OPEN"
        | "IN_PROGRESS"
        | "WAITING"
        | "RESOLVED"
        | "CLOSED"
        | "BILLABLE",
    }),
  };

  if (search) {
    const searchConditions: Record<string, unknown>[] = [
      { subject: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
    if (!isNaN(Number(search))) {
      searchConditions.push({ ticketNumber: Number(search) });
    }
    where.OR = searchConditions;
  }

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      select: {
        id: true,
        ticketNumber: true,
        subject: true,
        status: true,
        priority: true,
        category: true,
        createdAt: true,
        updatedAt: true,
        contact: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.ticket.count({ where }),
  ]);

  // Ongelezen-indicator: tel per ticket de support-reacties (niet-intern, niet
  // door de klant zelf) die nieuwer zijn dan het moment waarop de klant het
  // ticket voor het laatst opende.
  const ticketIds = tickets.map((t) => t.id);
  let unreadByTicket: Record<string, number> = {};
  if (ticketIds.length > 0) {
    const [reads, replyNotes] = await Promise.all([
      prisma.portalTicketRead.findMany({
        where: { contactId: session.contactId, ticketId: { in: ticketIds } },
        select: { ticketId: true, lastReadAt: true },
      }),
      prisma.ticketNote.findMany({
        where: {
          ticketId: { in: ticketIds },
          isInternal: false,
          authorContactId: null, // reacties van support, niet de eigen berichten
        },
        select: { ticketId: true, createdAt: true },
      }),
    ]);
    const lastReadByTicket = new Map(reads.map((r) => [r.ticketId, r.lastReadAt]));
    unreadByTicket = replyNotes.reduce<Record<string, number>>((acc, n) => {
      const lastRead = lastReadByTicket.get(n.ticketId);
      if (!lastRead || n.createdAt > lastRead) {
        acc[n.ticketId] = (acc[n.ticketId] || 0) + 1;
      }
      return acc;
    }, {});
  }

  const data = tickets.map((t) => ({
    ...t,
    unreadCount: unreadByTicket[t.id] || 0,
  }));

  return NextResponse.json({ data, total, page, pageSize });
}

export async function POST(request: NextRequest) {
  let session;
  try {
    session = await requirePortalSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { subject, description, priority, category } = body;

  if (!subject || typeof subject !== "string" || subject.trim().length === 0) {
    return NextResponse.json({ error: "Subject is required" }, { status: 400 });
  }

  // Technische aanmaker (verplichte FK) = de hoofdgebruiker van ITFlow (oudste
  // admin), niet zomaar een willekeurige admin. De klant zelf staat als contact
  // op het ticket en source=PORTAL maakt duidelijk dat het uit het portaal komt.
  const ownerId = await resolveStaffOwnerId();

  if (!ownerId) {
    return NextResponse.json(
      { error: "System configuration error" },
      { status: 500 },
    );
  }

  const ticket = await prisma.ticket.create({
    data: {
      companyId: session.companyId,
      contactId: session.contactId,
      subject: subject.trim(),
      description: description?.trim() || null,
      priority: ["LOW", "NORMAL", "HIGH", "URGENT"].includes(priority)
        ? priority
        : "NORMAL",
      category: [
        "HARDWARE",
        "SOFTWARE",
        "NETWORK",
        "ACCOUNT",
        "OTHER",
      ].includes(category)
        ? category
        : null,
      status: "OPEN",
      source: "PORTAL", // door de klant zelf aangemaakt — herkenbaar in de staff-UI
      createdById: ownerId,
    },
    select: {
      id: true,
      ticketNumber: true,
      subject: true,
      status: true,
      priority: true,
      category: true,
      createdAt: true,
    },
  });

  // Notify admins about new portal ticket
  await notifyAdmins({
    type: "ticket",
    title: `Nieuw portaalticket: ${ticket.subject}`,
    message: `Aangemaakt door ${session.contactName} (${session.companyName})`,
    link: `/tickets/${ticket.id}`,
  }).catch(() => {});

  return NextResponse.json(ticket, { status: 201 });
}
