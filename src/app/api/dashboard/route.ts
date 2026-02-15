import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-utils";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

export async function GET() {
  try {
    await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [
    openTickets,
    weekEntries,
    monthEntries,
    pendingTasks,
    recentTickets,
    hoursBreakdownWeek,
    hoursBreakdownMonth,
  ] = await Promise.all([
    // Open tickets count
    prisma.ticket.count({
      where: { status: { in: ["OPEN", "IN_PROGRESS", "WAITING"] } },
    }),
    // Hours this week
    prisma.timeEntry.aggregate({
      _sum: { hours: true },
      where: { date: { gte: weekStart, lte: weekEnd } },
    }),
    // Hours this month
    prisma.timeEntry.aggregate({
      _sum: { hours: true },
      where: { date: { gte: monthStart, lte: monthEnd } },
    }),
    // Pending tasks (tickets with pendingTasks filled)
    prisma.ticket.count({
      where: {
        pendingTasks: { not: null },
        status: { not: "CLOSED" },
      },
    }),
    // Recent tickets
    prisma.ticket.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        company: { select: { id: true, name: true, shortName: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    }),
    // Hours breakdown per company (this week)
    prisma.timeEntry.groupBy({
      by: ["companyId"],
      _sum: { hours: true },
      where: { date: { gte: weekStart, lte: weekEnd } },
    }),
    // Hours breakdown per company (this month)
    prisma.timeEntry.groupBy({
      by: ["companyId"],
      _sum: { hours: true },
      where: { date: { gte: monthStart, lte: monthEnd } },
    }),
  ]);

  // Fetch company names for breakdowns
  const companyIds = [
    ...new Set([
      ...hoursBreakdownWeek.map((h) => h.companyId),
      ...hoursBreakdownMonth.map((h) => h.companyId),
    ]),
  ];

  const companies = await prisma.company.findMany({
    where: { id: { in: companyIds } },
    select: { id: true, name: true, shortName: true },
  });

  const companyMap = new Map(companies.map((c) => [c.id, c]));

  return NextResponse.json({
    stats: {
      openTickets,
      hoursThisWeek: Number(weekEntries._sum.hours || 0),
      hoursThisMonth: Number(monthEntries._sum.hours || 0),
      pendingTasks,
    },
    recentTickets,
    hoursBreakdown: {
      week: hoursBreakdownWeek.map((h) => ({
        companyName: companyMap.get(h.companyId)?.name || "Unknown",
        companyShortName: companyMap.get(h.companyId)?.shortName || "?",
        hours: Number(h._sum.hours || 0),
      })),
      month: hoursBreakdownMonth.map((h) => ({
        companyName: companyMap.get(h.companyId)?.name || "Unknown",
        companyShortName: companyMap.get(h.companyId)?.shortName || "?",
        hours: Number(h._sum.hours || 0),
      })),
    },
  });
}
