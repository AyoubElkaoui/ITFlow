import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePortalSession } from "@/lib/portal-auth";
import { notifyAdmins } from "@/lib/notifications";

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

  // Verify ticket belongs to this contact (op naam gezet of zelf aangemaakt)
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: { contactId: true },
  });

  if (!ticket || ticket.contactId !== session.contactId) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  // Alleen niet-interne notities; herleid een nette afzender voor de klant.
  const notes = await prisma.ticketNote.findMany({
    where: { ticketId: id, isInternal: false },
    include: {
      user: { select: { id: true, name: true } },
      authorContact: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const shaped = notes.map((note) => ({
    id: note.id,
    content: note.content,
    createdAt: note.createdAt,
    // Eigen bericht (door dit contact via het portaal) vs. reactie van support.
    isMine: note.authorContactId === session.contactId,
    authorName: note.authorContact?.name ?? note.user.name,
  }));

  return NextResponse.json(shaped);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let session;
  try {
    session = await requirePortalSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ticket belongs to this contact (op naam gezet of zelf aangemaakt)
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: { contactId: true, subject: true },
  });

  if (!ticket || ticket.contactId !== session.contactId) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  const body = await request.json();
  const content = body.content;

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  // Find admin user to attribute the note (portal notes are logged under an admin)
  const adminUser = await prisma.user.findFirst({
    where: { role: "ADMIN", isActive: true },
    select: { id: true },
  });

  if (!adminUser) {
    return NextResponse.json(
      { error: "System configuration error" },
      { status: 500 },
    );
  }

  const note = await prisma.ticketNote.create({
    data: {
      ticketId: id,
      // userId is technisch verplicht (FK naar User); we hangen de notitie aan
      // een systeem-admin, maar de echte herkomst is het contact hieronder.
      userId: adminUser.id,
      authorContactId: session.contactId,
      content: content.trim(),
      isInternal: false,
    },
    include: {
      user: { select: { id: true, name: true } },
    },
  });

  // Notify admins about new portal message
  await notifyAdmins({
    type: "ticket_note",
    title: `Nieuw bericht op: ${ticket.subject}`,
    message: `${session.contactName} (${session.companyName}) stuurde een bericht`,
    link: `/tickets/${id}`,
  }).catch(() => {});

  return NextResponse.json(note, { status: 201 });
}
