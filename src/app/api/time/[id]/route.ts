import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { timeEntryUpdateSchema } from "@/lib/validations";
import { safeLogAudit, diffChanges } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth-utils";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let user;
  try {
    user = await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = timeEntryUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }
  const oldEntry = await prisma.timeEntry.findUnique({ where: { id } });

  const entry = await prisma.timeEntry.update({
    where: { id },
    data: parsed.data,
    include: {
      company: { select: { id: true, name: true, shortName: true } },
      ticket: { select: { id: true, ticketNumber: true, subject: true } },
      user: { select: { id: true, name: true } },
    },
  });

  safeLogAudit({
    entityType: "TimeEntry",
    entityId: id,
    action: "UPDATE",
    userId: user.id,
    changes: oldEntry
      ? diffChanges(
          oldEntry as unknown as Record<string, unknown>,
          parsed.data as Record<string, unknown>,
        )
      : undefined,
  });

  return NextResponse.json(entry);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let user;
  try {
    user = await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.timeEntry.delete({ where: { id } });

  safeLogAudit({
    entityType: "TimeEntry",
    entityId: id,
    action: "DELETE",
    userId: user.id,
  });

  return NextResponse.json({ success: true });
}
