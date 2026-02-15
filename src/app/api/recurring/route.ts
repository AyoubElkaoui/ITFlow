import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recurringTicketCreateSchema } from "@/lib/validations";
import { safeLogAudit } from "@/lib/audit";
import { getSessionUser, requireAdmin } from "@/lib/auth-utils";

export async function GET() {
  try {
    await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const recurringTickets = await prisma.recurringTicket.findMany({
    include: {
      company: { select: { id: true, name: true, shortName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(recurringTickets);
}

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await requireAdmin();
  } catch (err) {
    if (err instanceof Error && err.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = recurringTicketCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const recurringTicket = await prisma.recurringTicket.create({
    data: parsed.data,
    include: {
      company: { select: { id: true, name: true, shortName: true } },
    },
  });

  safeLogAudit({
    entityType: "RecurringTicket",
    entityId: recurringTicket.id,
    action: "CREATE",
    userId: user.id,
  });

  return NextResponse.json(recurringTicket, { status: 201 });
}
