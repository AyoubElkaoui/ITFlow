import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recurringTicketUpdateSchema } from "@/lib/validations";
import { safeLogAudit, diffChanges } from "@/lib/audit";
import { getSessionUser, requireAdmin } from "@/lib/auth-utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const recurringTicket = await prisma.recurringTicket.findUnique({
    where: { id },
    include: {
      company: { select: { id: true, name: true, shortName: true } },
    },
  });

  if (!recurringTicket) {
    return NextResponse.json(
      { error: "Recurring ticket not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(recurringTicket);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let user;
  try {
    user = await requireAdmin();
  } catch (err) {
    if (err instanceof Error && err.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const body = await request.json();
  const parsed = recurringTicketUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const oldRecurring = await prisma.recurringTicket.findUnique({
    where: { id },
  });

  if (!oldRecurring) {
    return NextResponse.json(
      { error: "Recurring ticket not found" },
      { status: 404 },
    );
  }

  const recurringTicket = await prisma.recurringTicket.update({
    where: { id },
    data: parsed.data,
    include: {
      company: { select: { id: true, name: true, shortName: true } },
    },
  });

  safeLogAudit({
    entityType: "RecurringTicket",
    entityId: id,
    action: "UPDATE",
    userId: user.id,
    changes: diffChanges(
      oldRecurring as unknown as Record<string, unknown>,
      parsed.data as Record<string, unknown>,
    ),
  });

  return NextResponse.json(recurringTicket);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let user;
  try {
    user = await requireAdmin();
  } catch (err) {
    if (err instanceof Error && err.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const recurringTicket = await prisma.recurringTicket.findUnique({
    where: { id },
  });

  if (!recurringTicket) {
    return NextResponse.json(
      { error: "Recurring ticket not found" },
      { status: 404 },
    );
  }

  await prisma.recurringTicket.delete({ where: { id } });

  safeLogAudit({
    entityType: "RecurringTicket",
    entityId: id,
    action: "DELETE",
    userId: user.id,
  });

  return NextResponse.json({ success: true });
}
