import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-utils";
import type { TicketStatus } from "@/generated/prisma/client";

const KANBAN_STATUSES: TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING",
  "RESOLVED",
  "CLOSED",
];

export async function GET() {
  try {
    await getSessionUser();

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const tickets = await prisma.ticket.findMany({
      where: {
        OR: [
          { status: { in: ["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED"] } },
          { status: "CLOSED", closedAt: { gte: oneWeekAgo } },
          { status: "CLOSED", closedAt: null, updatedAt: { gte: oneWeekAgo } },
        ],
      },
      include: {
        company: { select: { id: true, name: true, shortName: true } },
        assignedTo: { select: { id: true, name: true, avatar: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: [{ kanbanOrder: "asc" }, { createdAt: "desc" }],
    });

    // Group tickets by status
    const columns: Record<string, typeof tickets> = {};
    for (const status of KANBAN_STATUSES) {
      columns[status] = [];
    }
    for (const ticket of tickets) {
      columns[ticket.status].push(ticket);
    }

    return NextResponse.json({ columns });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
