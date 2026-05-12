/**
 * Tijdelijk endpoint: toon alle ticketnotities voor handmatige review
 * GET /api/admin/check-notes
 * Alleen admins.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-utils";

export async function GET() {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const notes = await prisma.ticketNote.findMany({
    select: {
      id: true,
      content: true,
      createdAt: true,
      ticket: { select: { ticketNumber: true, subject: true, company: { select: { shortName: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(notes);
}
