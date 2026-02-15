import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-utils";
import { safeLogAudit } from "@/lib/audit";
import type { TicketStatus } from "@/generated/prisma/client";

const VALID_STATUSES: TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING",
  "RESOLVED",
  "CLOSED",
];

const reorderSchema = z.object({
  ticketId: z.string(),
  newStatus: z.enum(VALID_STATUSES as [TicketStatus, ...TicketStatus[]]),
  newOrder: z.number().int().min(0),
  affectedTickets: z.array(
    z.object({
      id: z.string(),
      kanbanOrder: z.number().int().min(0),
    }),
  ),
});

export async function PATCH(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const body = await request.json();
    const parsed = reorderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { ticketId, newStatus, newOrder, affectedTickets } = parsed.data;

    // Fetch current ticket to capture old values for audit
    const currentTicket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { status: true, kanbanOrder: true },
    });

    if (!currentTicket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Build all update operations in a transaction
    const operations = [
      // Update the dragged ticket's status and order
      prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: newStatus,
          kanbanOrder: newOrder,
          // Set resolvedAt / closedAt timestamps when status changes
          ...(newStatus === "RESOLVED" && currentTicket.status !== "RESOLVED"
            ? { resolvedAt: new Date() }
            : {}),
          ...(newStatus === "CLOSED" && currentTicket.status !== "CLOSED"
            ? { closedAt: new Date() }
            : {}),
          // Clear timestamps if moving away from resolved/closed
          ...(newStatus !== "RESOLVED" && currentTicket.status === "RESOLVED"
            ? { resolvedAt: null }
            : {}),
          ...(newStatus !== "CLOSED" && currentTicket.status === "CLOSED"
            ? { closedAt: null }
            : {}),
        },
      }),
      // Update all affected tickets' kanbanOrder
      ...affectedTickets.map((t) =>
        prisma.ticket.update({
          where: { id: t.id },
          data: { kanbanOrder: t.kanbanOrder },
        }),
      ),
    ];

    await prisma.$transaction(operations);

    // Audit log for the status/order change
    const changes: Record<string, { old: unknown; new: unknown }> = {};
    if (currentTicket.status !== newStatus) {
      changes.status = { old: currentTicket.status, new: newStatus };
    }
    if (currentTicket.kanbanOrder !== newOrder) {
      changes.kanbanOrder = {
        old: currentTicket.kanbanOrder,
        new: newOrder,
      };
    }

    if (Object.keys(changes).length > 0) {
      safeLogAudit({
        entityType: "Ticket",
        entityId: ticketId,
        action: "UPDATE",
        changes,
        userId: user.id,
        metadata: {
          source: "kanban",
          affectedCount: affectedTickets.length,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
