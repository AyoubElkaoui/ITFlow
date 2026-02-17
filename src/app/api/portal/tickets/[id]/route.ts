import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePortalSession } from "@/lib/portal-auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let session;
  try {
    session = await requirePortalSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: {
      id: true,
      ticketNumber: true,
      subject: true,
      description: true,
      status: true,
      priority: true,
      category: true,
      companyId: true,
      createdAt: true,
      updatedAt: true,
      resolvedAt: true,
      closedAt: true,
      contact: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
    },
  });

  if (!ticket || ticket.companyId !== session.companyId) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  return NextResponse.json(ticket);
}
