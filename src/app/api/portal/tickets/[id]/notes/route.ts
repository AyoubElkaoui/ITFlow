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

  // Verify ticket belongs to the contact's company
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: { companyId: true },
  });

  if (!ticket || ticket.companyId !== session.companyId) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  // Only return non-internal notes
  const notes = await prisma.ticketNote.findMany({
    where: { ticketId: id, isInternal: false },
    include: {
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(notes);
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

  // Verify ticket belongs to the contact's company
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: { companyId: true, subject: true },
  });

  if (!ticket || ticket.companyId !== session.companyId) {
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
      userId: adminUser.id,
      content: `[${session.contactName}]: ${content.trim()}`,
      isInternal: false,
    },
    include: {
      user: { select: { id: true, name: true } },
    },
  });

  // Notify admins about new portal message
  notifyAdmins({
    type: "ticket_note",
    title: `Portal message on: ${ticket.subject}`,
    message: `${session.contactName} (${session.companyName}) added a message`,
    link: `/tickets/${id}`,
  }).catch(() => {});

  return NextResponse.json(note, { status: 201 });
}
