import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-utils";

// Openstaande OPDRACHT-tickets = mijn "ga doen"-lijst.
// Niet af = status OPEN/IN_PROGRESS/WAITING (RESOLVED/CLOSED/BILLABLE = klaar),
// en niet gearchiveerd. Gesorteerd op geplande datum (gepland eerst, nulls last).
export async function GET(request: NextRequest) {
  try {
    await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const assignedToId = request.nextUrl.searchParams.get("assignedToId");

  const tickets = await prisma.ticket.findMany({
    where: {
      source: "OPDRACHT",
      archivedAt: null,
      status: { in: ["OPEN", "IN_PROGRESS", "WAITING"] },
      ...(assignedToId ? { assignedToId } : {}),
    },
    include: {
      company: { select: { id: true, name: true, shortName: true } },
      assignedTo: { select: { id: true, name: true } },
    },
    orderBy: [
      { plannedFor: { sort: "asc", nulls: "last" } },
      { createdAt: "asc" },
    ],
    take: 500,
  });

  return NextResponse.json(tickets);
}
