import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ticketUpdateSchema } from "@/lib/validations";
import { safeLogAudit, diffChanges } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth-utils";
import { createNotification } from "@/lib/notifications";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      company: true,
      contact: true,
      assignedTo: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      timeEntries: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { date: "desc" },
      },
    },
  });

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  return NextResponse.json(ticket);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let user;
  try {
    user = await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = ticketUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }
  const oldTicket = await prisma.ticket.findUnique({ where: { id } });

  // Handle status transitions
  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.status === "RESOLVED") {
    data.resolvedAt = new Date();
  }
  if (parsed.data.status === "CLOSED") {
    data.closedAt = new Date();
  }

  const ticket = await prisma.ticket.update({
    where: { id },
    data,
    include: {
      company: { select: { id: true, name: true, shortName: true } },
      contact: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  safeLogAudit({
    entityType: "Ticket",
    entityId: id,
    action: "UPDATE",
    userId: user.id,
    changes: oldTicket
      ? diffChanges(
          oldTicket as unknown as Record<string, unknown>,
          parsed.data as Record<string, unknown>,
        )
      : undefined,
  });

  // Notify on assignment change
  if (
    parsed.data.assignedToId &&
    parsed.data.assignedToId !== oldTicket?.assignedToId &&
    parsed.data.assignedToId !== user.id
  ) {
    createNotification({
      userId: parsed.data.assignedToId,
      type: "ticket",
      title: `Ticket assigned to you: ${ticket.subject}`,
      message: `Assigned by ${user.name}`,
      link: `/tickets/${id}`,
    }).catch(() => {});
  }

  // Notify ticket creator on status changes
  if (
    parsed.data.status &&
    parsed.data.status !== (oldTicket as Record<string, unknown>)?.status &&
    oldTicket?.createdById &&
    oldTicket.createdById !== user.id
  ) {
    createNotification({
      userId: oldTicket.createdById,
      type: "ticket",
      title: `Ticket ${parsed.data.status.toLowerCase().replace("_", " ")}: ${ticket.subject}`,
      message: `Updated by ${user.name}`,
      link: `/tickets/${id}`,
    }).catch(() => {});
  }

  return NextResponse.json(ticket);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let user;
  try {
    user = await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.ticket.delete({ where: { id } });

  safeLogAudit({
    entityType: "Ticket",
    entityId: id,
    action: "DELETE",
    userId: user.id,
  });

  return NextResponse.json({ success: true });
}
