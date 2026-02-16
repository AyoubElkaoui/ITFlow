import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { timeEntryCreateSchema } from "@/lib/validations";
import { safeLogAudit } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth-utils";

export async function GET(request: NextRequest) {
  try {
    await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const companyId = searchParams.get("companyId");
  const ticketId = searchParams.get("ticketId");
  const userId = searchParams.get("userId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = Math.min(Number(searchParams.get("pageSize")) || 50, 100);

  const where = {
    ...(companyId && { companyId }),
    ...(ticketId && { ticketId }),
    ...(userId && { userId }),
    ...(from || to
      ? {
          date: {
            ...(from && { gte: new Date(from) }),
            ...(to && { lte: new Date(to) }),
          },
        }
      : {}),
  };

  const [entries, total, allEntries] = await Promise.all([
    prisma.timeEntry.findMany({
      where,
      include: {
        company: {
          select: { id: true, name: true, shortName: true, hourlyRate: true },
        },
        ticket: { select: { id: true, ticketNumber: true, subject: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.timeEntry.count({ where }),
    prisma.timeEntry.findMany({
      where,
      select: {
        hours: true,
        billable: true,
        company: { select: { hourlyRate: true } },
      },
    }),
  ]);

  let totalHours = 0;
  let billableHours = 0;
  let totalAmount = 0;
  for (const e of allEntries) {
    const hours = Number(e.hours);
    totalHours += hours;
    if (e.billable) {
      billableHours += hours;
      const rate = e.company.hourlyRate ? Number(e.company.hourlyRate) : 0;
      totalAmount += hours * rate;
    }
  }

  return NextResponse.json({
    data: entries,
    total,
    page,
    pageSize,
    summary: { totalHours, billableHours, totalAmount, count: total },
  });
}

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = timeEntryCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const entry = await prisma.timeEntry.create({
    data: {
      ...parsed.data,
      userId: user.id,
    },
    include: {
      company: { select: { id: true, name: true, shortName: true } },
      ticket: { select: { id: true, ticketNumber: true, subject: true } },
      user: { select: { id: true, name: true } },
    },
  });

  safeLogAudit({
    entityType: "TimeEntry",
    entityId: entry.id,
    action: "CREATE",
    userId: user.id,
  });

  return NextResponse.json(entry, { status: 201 });
}
