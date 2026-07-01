import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ticketTimeLogUpdateSchema } from "@/lib/validations";
import { safeLogAudit } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth-utils";

const logSelect = {
  id: true,
  ticketId: true,
  userId: true,
  startedAt: true,
  endedAt: true,
  minutes: true,
  note: true,
  user: { select: { id: true, name: true } },
} as const;

/**
 * PATCH /api/tickets/[id]/time-logs/[logId]
 *  - { stop: true } -> stopt een lopende log (endedAt=now, minutes berekend).
 *  - anders          -> handmatig aanpassen: { startedAt?, minutes?, note? }.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; logId: string }> },
) {
  let user;
  try {
    user = await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { logId } = await params;
  const existing = await prisma.ticketTimeLog.findUnique({
    where: { id: logId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Time log not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));

  // --- Stop een lopende log ---
  if (body?.stop === true) {
    const now = new Date();
    const minutes = Math.max(
      1,
      Math.round((now.getTime() - new Date(existing.startedAt).getTime()) / 60000),
    );
    const log = await prisma.ticketTimeLog.update({
      where: { id: logId },
      data: { endedAt: now, minutes },
      select: logSelect,
    });
    safeLogAudit({
      entityType: "TicketTimeLog",
      entityId: log.id,
      action: "UPDATE",
      userId: user.id,
      metadata: { action: "stop" },
    });
    return NextResponse.json(log);
  }

  // --- Handmatig aanpassen ---
  const parsed = ticketTimeLogUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.startedAt !== undefined) data.startedAt = parsed.data.startedAt;
  if (parsed.data.minutes !== undefined) data.minutes = parsed.data.minutes;
  if (parsed.data.note !== undefined) data.note = parsed.data.note || null;

  // Houd endedAt consistent als startedAt/minutes handmatig wijzigen op een
  // afgeronde log (rauwe minuten blijven leidend).
  const startedAt = (data.startedAt as Date) ?? existing.startedAt;
  const minutes = (data.minutes as number) ?? existing.minutes;
  if (existing.endedAt && minutes != null) {
    data.endedAt = new Date(new Date(startedAt).getTime() + minutes * 60000);
  }

  const log = await prisma.ticketTimeLog.update({
    where: { id: logId },
    data,
    select: logSelect,
  });

  safeLogAudit({
    entityType: "TicketTimeLog",
    entityId: log.id,
    action: "UPDATE",
    userId: user.id,
  });

  return NextResponse.json(log);
}

/**
 * DELETE /api/tickets/[id]/time-logs/[logId]
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; logId: string }> },
) {
  let user;
  try {
    user = await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { logId } = await params;
  const existing = await prisma.ticketTimeLog.findUnique({
    where: { id: logId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Time log not found" }, { status: 404 });
  }

  await prisma.ticketTimeLog.delete({ where: { id: logId } });

  safeLogAudit({
    entityType: "TicketTimeLog",
    entityId: logId,
    action: "DELETE",
    userId: user.id,
  });

  return NextResponse.json({ success: true });
}
