import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { safeLogAudit } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth-utils";

const bulkActionSchema = z.object({
  ticketIds: z.array(z.string()).min(1, "At least one ticket is required"),
  action: z.enum(["updateStatus", "updatePriority", "assign", "delete"]),
  value: z.string().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const body = await request.json();
    const parsed = bulkActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { ticketIds, action, value } = parsed.data;

    let count = 0;

    switch (action) {
      case "updateStatus": {
        if (!value) {
          return NextResponse.json(
            { error: "Value is required for updateStatus" },
            { status: 400 },
          );
        }

        const statusValue = value as
          | "OPEN"
          | "IN_PROGRESS"
          | "WAITING"
          | "RESOLVED"
          | "CLOSED";

        const data: Record<string, unknown> = { status: statusValue };
        if (statusValue === "RESOLVED") {
          data.resolvedAt = new Date();
        }
        if (statusValue === "CLOSED") {
          data.closedAt = new Date();
        }

        const result = await prisma.ticket.updateMany({
          where: { id: { in: ticketIds } },
          data,
        });
        count = result.count;

        for (const id of ticketIds) {
          safeLogAudit({
            entityType: "Ticket",
            entityId: id,
            action: "UPDATE",
            userId: user.id,
            changes: { status: { old: null, new: statusValue } },
            metadata: { bulkAction: true },
          });
        }
        break;
      }

      case "updatePriority": {
        if (!value) {
          return NextResponse.json(
            { error: "Value is required for updatePriority" },
            { status: 400 },
          );
        }

        const priorityValue = value as "LOW" | "NORMAL" | "HIGH" | "URGENT";

        const result = await prisma.ticket.updateMany({
          where: { id: { in: ticketIds } },
          data: { priority: priorityValue },
        });
        count = result.count;

        for (const id of ticketIds) {
          safeLogAudit({
            entityType: "Ticket",
            entityId: id,
            action: "UPDATE",
            userId: user.id,
            changes: { priority: { old: null, new: priorityValue } },
            metadata: { bulkAction: true },
          });
        }
        break;
      }

      case "assign": {
        if (!value) {
          return NextResponse.json(
            { error: "Value is required for assign" },
            { status: 400 },
          );
        }

        const result = await prisma.ticket.updateMany({
          where: { id: { in: ticketIds } },
          data: { assignedToId: value },
        });
        count = result.count;

        for (const id of ticketIds) {
          safeLogAudit({
            entityType: "Ticket",
            entityId: id,
            action: "UPDATE",
            userId: user.id,
            changes: { assignedToId: { old: null, new: value } },
            metadata: { bulkAction: true },
          });
        }
        break;
      }

      case "delete": {
        const result = await prisma.ticket.deleteMany({
          where: { id: { in: ticketIds } },
        });
        count = result.count;

        for (const id of ticketIds) {
          safeLogAudit({
            entityType: "Ticket",
            entityId: id,
            action: "DELETE",
            userId: user.id,
            metadata: { bulkAction: true },
          });
        }
        break;
      }
    }

    return NextResponse.json({ count });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
