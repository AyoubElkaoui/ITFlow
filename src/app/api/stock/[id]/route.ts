import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { safeLogAudit, diffChanges } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth-utils";

const stockItemUpdateSchema = z
  .object({
    name: z.string().min(1),
    category: z.enum([
      "CABLE",
      "ADAPTER",
      "TONER",
      "PERIPHERAL",
      "COMPONENT",
      "TOOL",
      "OTHER",
    ]),
    description: z.string().optional(),
    sku: z.string().optional(),
    minStock: z.number().int().min(0),
    location: z.string().optional(),
    unitPrice: z.number().min(0).optional(),
    notes: z.string().optional(),
  })
  .partial();

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
  const item = await prisma.stockItem.findUnique({
    where: { id },
    include: {
      movements: {
        include: {
          company: { select: { id: true, name: true, shortName: true } },
          ticket: { select: { id: true, ticketNumber: true, subject: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });

  if (!item) {
    return NextResponse.json(
      { error: "Stock item not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(item);
}

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
  const parsed = stockItemUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const oldItem = await prisma.stockItem.findUnique({ where: { id } });

  const item = await prisma.stockItem.update({
    where: { id },
    data: parsed.data,
  });

  safeLogAudit({
    entityType: "StockItem",
    entityId: id,
    action: "UPDATE",
    userId: user.id,
    changes: oldItem
      ? diffChanges(
          oldItem as unknown as Record<string, unknown>,
          parsed.data as Record<string, unknown>,
        )
      : undefined,
  });

  return NextResponse.json(item);
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
  await prisma.stockItem.update({
    where: { id },
    data: { isActive: false },
  });

  safeLogAudit({
    entityType: "StockItem",
    entityId: id,
    action: "DELETE",
    userId: user.id,
  });

  return NextResponse.json({ success: true });
}
