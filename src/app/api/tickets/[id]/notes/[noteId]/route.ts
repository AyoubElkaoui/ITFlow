import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-utils";
import { safeLogAudit } from "@/lib/audit";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> },
) {
  const { id, noteId } = await params;

  let user;
  try {
    user = await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const note = await prisma.ticketNote.findUnique({
    where: { id: noteId },
  });

  if (!note || note.ticketId !== id) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  if (note.userId !== user.id) {
    return NextResponse.json(
      { error: "Only the author can edit this note" },
      { status: 403 },
    );
  }

  const body = await request.json();
  const content = body.content;

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const updated = await prisma.ticketNote.update({
    where: { id: noteId },
    data: { content: content.trim() },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  safeLogAudit({
    entityType: "TicketNote",
    entityId: noteId,
    action: "UPDATE",
    userId: user.id,
    changes: { content: { old: note.content, new: content.trim() } },
    metadata: { ticketId: id },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> },
) {
  const { id, noteId } = await params;

  let user;
  try {
    user = await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const note = await prisma.ticketNote.findUnique({
    where: { id: noteId },
  });

  if (!note || note.ticketId !== id) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  if (note.userId !== user.id && user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only the author or an admin can delete this note" },
      { status: 403 },
    );
  }

  await prisma.ticketNote.delete({ where: { id: noteId } });

  safeLogAudit({
    entityType: "TicketNote",
    entityId: noteId,
    action: "DELETE",
    userId: user.id,
    metadata: { ticketId: id },
  });

  return NextResponse.json({ success: true });
}
