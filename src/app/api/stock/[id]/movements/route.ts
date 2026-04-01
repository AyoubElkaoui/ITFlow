import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { safeLogAudit } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth-utils";

// Map StockCategory to AssetType
function categoryToAssetType(cat: string): string {
  const map: Record<string, string> = {
    LAPTOP: "LAPTOP",
    DESKTOP: "DESKTOP",
    PRINTER: "PRINTER",
    MONITOR: "MONITOR",
    PHONE: "PHONE",
    NETWORK_EQUIPMENT: "NETWORK",
  };
  return map[cat] || "OTHER";
}

const movementCreateSchema = z.object({
  type: z.enum(["IN", "OUT"]),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  note: z.string().optional(),
  // For OUT (uitgifte): create asset
  companyId: z.string().optional(),
  assetName: z.string().optional(),
  assignedTo: z.string().optional(),
  // For IN (inname): optionally return an asset
  returnAssetId: z.string().optional(),
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

  const { type, quantity, note, companyId, assetName, assignedTo, returnAssetId } = parsed.data;

  const current = await prisma.stockItem.findUnique({
    where: { id },
    select: { quantity: true, name: true, category: true },
  });

  if (!current) {
    return NextResponse.json(
      { error: "Stock item not found" },
      { status: 404 },
    );
  }

  if (type === "OUT") {
    // Uitgifte: decrement stock + create asset
    if (current.quantity < quantity) {
      return NextResponse.json(
        { error: "Insufficient stock" },
        { status: 400 },
      );
    }

    if (!companyId) {
      return NextResponse.json(
        { error: "Company is required for uitgifte" },
        { status: 400 },
      );
    }

    const assetType = categoryToAssetType(current.category);

    // Transaction: create movement + decrement stock + create asset(s)
    const results = await prisma.$transaction(async (tx) => {
      const movement = await tx.stockMovement.create({
        data: {
          stockItemId: id,
          type: "OUT",
          quantity,
          note: note || null,
          companyId,
          performedBy: user.id,
        },
        include: {
          company: { select: { id: true, name: true, shortName: true } },
        },
      });

      await tx.stockItem.update({
        where: { id },
        data: { quantity: { decrement: quantity } },
      });

      // Create one asset per unit
      const assets = [];
      for (let i = 0; i < quantity; i++) {
        const asset = await tx.asset.create({
          data: {
            name: assetName || current.name,
            type: assetType as "LAPTOP" | "DESKTOP" | "PRINTER" | "MONITOR" | "PHONE" | "NETWORK" | "OTHER",
            companyId,
            assignedTo: assignedTo || null,
            stockItemId: id,
          },
        });
        assets.push(asset);
      }

      return { movement, assets };
    });

    safeLogAudit({
      entityType: "StockMovement",
      entityId: results.movement.id,
      action: "CREATE",
      userId: user.id,
      metadata: { stockItemId: id, type: "OUT", quantity, assetsCreated: results.assets.length },
    });

    return NextResponse.json(results.movement, { status: 201 });
  } else {
    // Inname: increment stock + optionally delete returned asset
    const results = await prisma.$transaction(async (tx) => {
      const movement = await tx.stockMovement.create({
        data: {
          stockItemId: id,
          type: "IN",
          quantity,
          note: note || null,
          companyId: companyId || null,
          performedBy: user.id,
        },
        include: {
          company: { select: { id: true, name: true, shortName: true } },
        },
      });

      await tx.stockItem.update({
        where: { id },
        data: { quantity: { increment: quantity } },
      });

      if (returnAssetId) {
        await tx.asset.delete({ where: { id: returnAssetId } });
      }

      return { movement };
    });

    safeLogAudit({
      entityType: "StockMovement",
      entityId: results.movement.id,
      action: "CREATE",
      userId: user.id,
      metadata: { stockItemId: id, type: "IN", quantity, returnedAssetId: returnAssetId },
    });

    return NextResponse.json(results.movement, { status: 201 });
  }
}
