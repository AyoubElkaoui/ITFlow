import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { safeLogAudit } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth-utils";

const movementCreateSchema = z.object({
  type: z.enum(["IN", "OUT", "ADJUSTMENT"]),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  note: z.string().optional(),
  companyId: z.string().optional(),
  ticketId: z.string().optional(),
});

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
  const movements = await prisma.stockMovement.findMany({
    where: { stockItemId: id },
    include: {
      company: { select: { id: true, name: true, shortName: true } },
      ticket: { select: { id: true, ticketNumber: true, subject: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(movements);
}

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
  const body = await request.json();
  const parsed = movementCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { type, quantity, note, companyId, ticketId } = parsed.data;

  const current = await prisma.stockItem.findUnique({
    where: { id },
    select: { quantity: true },
  });

  if (!current) {
    return NextResponse.json(
      { error: "Stock item not found" },
      { status: 404 },
    );
  }

  // Prevent negative stock on OUT
  if (type === "OUT" && current.quantity < quantity) {
    return NextResponse.json(
      { error: "Insufficient stock" },
      { status: 400 },
    );
  }

  // Calculate quantity delta
  let delta: number;
  if (type === "IN") {
    delta = quantity;
  } else if (type === "OUT") {
    delta = -quantity;
  } else {
    // ADJUSTMENT: quantity is the new absolute value
    delta = quantity - current.quantity;
  }

  // Transaction: create movement + update quantity
  const [movement] = await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        stockItemId: id,
        type,
        quantity,
        note: note || null,
        companyId: companyId || null,
        ticketId: ticketId || null,
        performedBy: user.id,
      },
      include: {
        company: { select: { id: true, name: true, shortName: true } },
        ticket: { select: { id: true, ticketNumber: true, subject: true } },
      },
    }),
    prisma.stockItem.update({
      where: { id },
      data: { quantity: { increment: delta } },
    }),
  ]);

  safeLogAudit({
    entityType: "StockMovement",
    entityId: movement.id,
    action: "CREATE",
    userId: user.id,
    metadata: { stockItemId: id, type, quantity, delta },
  });

  return NextResponse.json(movement, { status: 201 });
}
