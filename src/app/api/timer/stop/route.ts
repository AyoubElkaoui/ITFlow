import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-utils";
import { safeLogAudit } from "@/lib/audit";

export async function POST() {
  try {
    const user = await getSessionUser();

    const timer = await prisma.activeTimer.findUnique({
      where: { userId: user.id },
    });

    if (!timer) {
      return NextResponse.json(
        { error: "No active timer found" },
        { status: 404 },
      );
    }

    // Calculate elapsed hours
    const now = new Date();
    const elapsedMs = now.getTime() - new Date(timer.startedAt).getTime();
    const elapsedHours = Math.round((elapsedMs / 3600000) * 100) / 100; // Round to 2 decimal places

    // Create time entry and delete timer in a transaction
    const [timeEntry] = await prisma.$transaction([
      prisma.timeEntry.create({
        data: {
          ticketId: timer.ticketId,
          companyId: timer.companyId,
          userId: user.id,
          date: now,
          hours: elapsedHours > 0 ? elapsedHours : 0.01,
          description: timer.description,
          billable: true,
        },
        include: {
          company: { select: { id: true, name: true, shortName: true } },
          ticket: { select: { id: true, ticketNumber: true, subject: true } },
          user: { select: { id: true, name: true } },
        },
      }),
      prisma.activeTimer.delete({
        where: { id: timer.id },
      }),
    ]);

    safeLogAudit({
      entityType: "TimeEntry",
      entityId: timeEntry.id,
      action: "CREATE",
      userId: user.id,
      metadata: { source: "timer", timerId: timer.id },
    });

    return NextResponse.json(timeEntry);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to stop timer" },
      { status: 500 },
    );
  }
}
