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

const materialUpdateSchema = z.object({
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  note: z.string().nullable().optional(),
});

/**
 * PATCH /api/tickets/[id]/materials/[movementId]
 * Verbruikt aantal aanpassen -> herbereken currentQty in dezelfde tx.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; movementId: string }> },
) {
  let user;
  try {
    user = await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, movementId } = await params;
  const existing = await prisma.stockMovement.findUnique({
    where: { id: movementId },
  });
  if (!existing || existing.ticketId !== id || existing.reason !== "TICKET") {
    return NextResponse.json({ error: "Material line not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = materialUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { quantity, note } = parsed.data;
  // Verbruik ging van oldQty -> newQty; extra verbruik = newQty - oldQty,
  // dus voorraad verandert met (oldQty - newQty).
  const stockDelta = existing.quantity - quantity;

  const movement = await prisma.$transaction(async (tx) => {
    const mv = await tx.stockMovement.update({
      where: { id: movementId },
      data: {
        quantity,
        ...(note !== undefined ? { note: note || null } : {}),
      },
      include: {
        stockItem: { select: stockItemSelect },
        user: { select: { id: true, name: true } },
      },
    });
    await tx.stockItem.update({
      where: { id: existing.stockItemId },
      data: { quantity: { increment: stockDelta } },
    });
    return mv;
  });

  safeLogAudit({
    entityType: "StockMovement",
    entityId: movementId,
    action: "UPDATE",
    userId: user.id,
    metadata: { ticketId: id, from: existing.quantity, to: quantity },
  });

  return NextResponse.json(movement);
}

/**
 * DELETE /api/tickets/[id]/materials/[movementId]
 * Materiaalregel verwijderen -> voorraad teruggeven in dezelfde tx.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; movementId: string }> },
) {
  let user;
  try {
    user = await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, movementId } = await params;
  const existing = await prisma.stockMovement.findUnique({
    where: { id: movementId },
  });
  if (!existing || existing.ticketId !== id || existing.reason !== "TICKET") {
    return NextResponse.json({ error: "Material line not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.stockMovement.delete({ where: { id: movementId } });
    // Was een OUT (verbruik) -> voorraad weer bijboeken.
    await tx.stockItem.update({
      where: { id: existing.stockItemId },
      data: { quantity: { increment: existing.quantity } },
    });
  });

  safeLogAudit({
    entityType: "StockMovement",
    entityId: movementId,
    action: "DELETE",
    userId: user.id,
    metadata: { ticketId: id, restoredQty: existing.quantity },
  });

  return NextResponse.json({ success: true });
}
