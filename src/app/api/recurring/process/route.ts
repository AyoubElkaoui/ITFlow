import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeLogAudit } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth-utils";
import type { RecurringFrequency } from "@/generated/prisma/enums";

function calculateNextRunAt(
  current: Date,
  frequency: RecurringFrequency,
): Date {
  const next = new Date(current);

  switch (frequency) {
    case "DAILY":
      next.setDate(next.getDate() + 1);
      break;
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;
    case "BIWEEKLY":
      next.setDate(next.getDate() + 14);
      break;
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1);
      break;
    case "QUARTERLY":
      next.setMonth(next.getMonth() + 3);
      break;
    case "YEARLY":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }

  return next;
}

export async function POST() {
  const user = await getSessionUser();
  const now = new Date();

  const dueRecurring = await prisma.recurringTicket.findMany({
    where: {
      isActive: true,
      nextRunAt: { lte: now },
    },
  });

  const results: { ticketId: string; recurringId: string }[] = [];

  for (const recurring of dueRecurring) {
    const ticket = await prisma.ticket.create({
      data: {
        companyId: recurring.companyId,
        subject: recurring.subject,
        description: recurring.description,
        priority: recurring.priority,
        category: recurring.category,
        createdById: user.id,
      },
    });

    const nextRunAt = calculateNextRunAt(
      recurring.nextRunAt,
      recurring.frequency,
    );

    await prisma.recurringTicket.update({
      where: { id: recurring.id },
      data: {
        lastRunAt: now,
        nextRunAt,
      },
    });

    safeLogAudit({
      entityType: "Ticket",
      entityId: ticket.id,
      action: "CREATE",
      userId: user.id,
      metadata: { source: "recurring", recurringTicketId: recurring.id },
    });

    results.push({ ticketId: ticket.id, recurringId: recurring.id });
  }

  return NextResponse.json({
    processed: results.length,
    results,
  });
}
