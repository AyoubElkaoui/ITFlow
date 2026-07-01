import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { safeLogAudit } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth-utils";

const stockItemSelect = {
  id: true,
  name: true,
  unit: true,
  quantity: true,
  minStock: true,
} as const;

const materialCreateSchema = z.object({
  stockItemId: z.string().min(1, "Stock item is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  note: z.string().optional(),
});

/**
 * GET /api/tickets/[id]/materials
 * Materiaal-regels van dit ticket = de TICKET-movements.
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
  const materials = await prisma.stockMovement.findMany({
    where: { ticketId: id, reason: "TICKET" },
    include: {
      stockItem: { select: stockItemSelect },
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(materials);
}

/**
 * POST /api/tickets/[id]/materials
 * Verbruik materiaal op dit ticket -> StockMovement OUT/TICKET, currentQty daalt
 * (zelfde tx), GEEN asset. Negatieve voorraad toegestaan.
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

  const body = await request.json();
  const parsed = materialCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { stockItemId, quantity, note } = parsed.data;
  const item = await prisma.stockItem.findUnique({
    where: { id: stockItemId },
    select: { id: true },
  });
  if (!item) {
    return NextResponse.json({ error: "Stock item not found" }, { status: 404 });
  }

  const movement = await prisma.$transaction(async (tx) => {
    const mv = await tx.stockMovement.create({
      data: {
        stockItemId,
        type: "OUT",
        quantity,
        reason: "TICKET",
        ticketId: id,
        userId: user.id,
        performedBy: user.id,
        note: note || null,
      },
      include: {
        stockItem: { select: stockItemSelect },
        user: { select: { id: true, name: true } },
      },
    });
    // currentQty daalt in dezelfde tx; negatief toegestaan.
    await tx.stockItem.update({
      where: { id: stockItemId },
      data: { quantity: { decrement: quantity } },
    });
    return mv;
  });

  safeLogAudit({
    entityType: "StockMovement",
    entityId: movement.id,
    action: "CREATE",
    userId: user.id,
    metadata: { ticketId: id, stockItemId, quantity, reason: "TICKET" },
  });

  return NextResponse.json(movement, { status: 201 });
}
