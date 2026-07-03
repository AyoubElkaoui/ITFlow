import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ticketTimeLogCreateSchema } from "@/lib/validations";
import { safeLogAudit } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth-utils";
import { syncTimeEntryFromLog } from "@/lib/time-sync";

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
 * GET /api/tickets/[id]/time-logs
 * Alle werk-tijd logs van dit ticket (alle users), nieuwste eerst.
 */
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
  const logs = await prisma.ticketTimeLog.findMany({
    where: { ticketId: id },
    select: logSelect,
    orderBy: { startedAt: "desc" },
  });

  return NextResponse.json(logs);
}

/**
 * POST /api/tickets/[id]/time-logs
 *  - { mode: "start" }  -> start een lopende log (stopt eerst mijn andere lopende
 *                          log op elk ticket) en zet dit ticket op IN_PROGRESS.
 *  - anders (manual)    -> { startedAt, minutes, note } handmatige log.
 */
export async function POST(
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
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));

  // --- Start een lopende log ---
  if (body?.mode === "start") {
    const now = new Date();
    const log = await prisma.$transaction(async (tx) => {
      // Stop elke andere lopende log van mij (max één tegelijk).
      const running = await tx.ticketTimeLog.findMany({
        where: { userId: user.id, endedAt: null },
      });
      for (const r of running) {
        const mins = Math.max(
          1,
          Math.round((now.getTime() - new Date(r.startedAt).getTime()) / 60000),
        );
        await tx.ticketTimeLog.update({
          where: { id: r.id },
          data: { endedAt: now, minutes: mins },
        });
        // Gestopte log is nu definitief -> spiegel naar een facturabele TimeEntry.
        await syncTimeEntryFromLog(tx, { ...r, minutes: mins });
      }

      // Zet dit ticket op in-progress (mijn werk-status).
      await tx.ticket.update({
        where: { id },
        data: { status: "IN_PROGRESS" },
      });

      return tx.ticketTimeLog.create({
        data: { ticketId: id, userId: user.id, startedAt: now },
        select: logSelect,
      });
    });

    safeLogAudit({
      entityType: "TicketTimeLog",
      entityId: log.id,
      action: "CREATE",
      userId: user.id,
      metadata: { mode: "start", ticketId: id },
    });

    return NextResponse.json(log, { status: 201 });
  }

  // --- Handmatige log ---
  const parsed = ticketTimeLogCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { startedAt, minutes, note } = parsed.data;
  const log = await prisma.$transaction(async (tx) => {
    const created = await tx.ticketTimeLog.create({
      data: {
        ticketId: id,
        userId: user.id,
        startedAt,
        endedAt: new Date(startedAt.getTime() + minutes * 60000),
        minutes,
        note: note || null,
      },
      select: logSelect,
    });
    // Handmatige log is meteen definitief -> spiegel naar een facturabele TimeEntry.
    await syncTimeEntryFromLog(tx, created);
    return created;
  });

  safeLogAudit({
    entityType: "TicketTimeLog",
    entityId: log.id,
    action: "CREATE",
    userId: user.id,
    metadata: { mode: "manual", ticketId: id },
  });

  return NextResponse.json(log, { status: 201 });
}
