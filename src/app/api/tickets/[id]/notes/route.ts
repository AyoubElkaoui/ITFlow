import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-utils";
import { safeLogAudit } from "@/lib/audit";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notes = await prisma.ticketNote.findMany({
    where: { ticketId: id },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(notes);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let user;
  try {
    user = await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const content = body.content;

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const isInternal =
    typeof body.isInternal === "boolean" ? body.isInternal : true;

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  const note = await prisma.ticketNote.create({
    data: {
      ticketId: id,
      userId: user.id,
      content: content.trim(),
      isInternal,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  safeLogAudit({
    entityType: "TicketNote",
    entityId: note.id,
    action: "CREATE",
    userId: user.id,
    metadata: { ticketId: id, isInternal },
  });

  return NextResponse.json(note, { status: 201 });
}
