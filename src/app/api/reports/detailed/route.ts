import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-utils";

export async function GET(request: NextRequest) {
  try {
    await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const companyId = searchParams.get("companyId");
  const userId = searchParams.get("userId");

  const where: Record<string, unknown> = {};
  if (from || to) {
    where.createdAt = {
      ...(from && { gte: new Date(from) }),
      // Hele einddag meenemen. `setHours()` muteert en geeft een millis-getal terug,
      // waardoor `new Date(...)` er decennia naast zat — daarom expliciete ISO-string.
      ...(to && { lte: new Date(`${to}T23:59:59.999Z`) }),
    };
  }
  if (companyId && companyId !== "all") where.companyId = companyId;
  if (userId && userId !== "all") where.assignedToId = userId;

  const tickets = await prisma.ticket.findMany({
    where,
    include: {
      company: { select: { id: true, shortName: true, hourlyRate: true } },
      contact: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      timeEntries: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { date: "asc" },
      },
      assetLinks: {
        include: { asset: { select: { id: true, name: true, type: true } } },
      },
      notes: {
        orderBy: { createdAt: "asc" },
        select: { content: true, isInternal: true, createdAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tickets);
}
