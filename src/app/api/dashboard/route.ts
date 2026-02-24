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
    hoursBreakdownMonth,
    totalAssets,
    ticketsByStatus,
    recentActivity,
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
    // Hours breakdown per company (this month)
    prisma.timeEntry.groupBy({
      by: ["companyId"],
      _sum: { hours: true },
      where: { date: { gte: monthStart, lte: monthEnd } },
    }),
    // Total active assets
    prisma.asset.count({
      where: { status: "ACTIVE" },
    }),
    // Tickets grouped by status
    prisma.ticket.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    // Recent activity: last 5 time entries
    prisma.timeEntry.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        company: { select: { shortName: true } },
      },
    }),
  ]);

  // Fetch company names for breakdowns
  const companyIds = hoursBreakdownMonth.map((h) => h.companyId);

  const companies = await prisma.company.findMany({
    where: { id: { in: companyIds } },
    select: { id: true, name: true, shortName: true },
  });

  const companyMap = new Map(companies.map((c) => [c.id, c]));

  // Format tickets by status
  const ticketsByStatusMap: Record<string, number> = {};
  for (const group of ticketsByStatus) {
    ticketsByStatusMap[group.status] = group._count._all;
  }

  // Format recent activity
  const formattedRecentActivity = recentActivity.map((entry) => ({
    id: entry.id,
    companyShortName: entry.company.shortName,
    hours: Number(entry.hours),
    description: entry.description,
    date: entry.date,
    billable: entry.billable,
  }));

  return NextResponse.json({
    stats: {
      openTickets,
      hoursThisWeek: Number(weekEntries._sum.hours || 0),
      hoursThisMonth: Number(monthEntries._sum.hours || 0),
      totalAssets,
      pendingTasks,
    },
    ticketsByStatus: ticketsByStatusMap,
    recentTickets,
    recentActivity: formattedRecentActivity,
    hoursBreakdown: {
      month: hoursBreakdownMonth.map((h) => ({
        companyName: companyMap.get(h.companyId)?.name || "Unknown",
        companyShortName: companyMap.get(h.companyId)?.shortName || "?",
        hours: Number(h._sum.hours || 0),
      })),
    },
  });
}
