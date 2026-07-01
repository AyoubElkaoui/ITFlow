import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { safeLogAudit } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth-utils";

// Map StockCategory to AssetType (alleen voor UITGIFTE).
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
  type: z.enum(["IN", "OUT"]).optional(),
  quantity: z.number().int().min(1).optional(),
  // Voor CORRECTIE: absoluut doel-aantal (delta = target - currentQty).
  targetQty: z.number().int().optional(),
  reason: z.enum(["INKOOP", "UITGIFTE", "TICKET", "CORRECTIE"]).optional(),
  note: z.string().optional(),
  // Alleen voor UITGIFTE (asset aanmaken):
  companyId: z.string().optional(),
  assetName: z.string().optional(),
  assignedTo: z.string().optional(),
  // Voor inname (IN): optioneel een teruggebracht asset verwijderen.
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
      ticket: { select: { id: true, ticketNumber: true, subject: true } },
      user: { select: { id: true, name: true } },
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

  const current = await prisma.stockItem.findUnique({
    where: { id },
    select: { quantity: true, name: true, category: true },
  });
  if (!current) {
    return NextResponse.json({ error: "Stock item not found" }, { status: 404 });
  }

  const {
    note,
    companyId,
    assetName,
    assignedTo,
    returnAssetId,
    targetQty,
  } = parsed.data;

  // --- Bepaal type, quantity en reason ---
  let type: "IN" | "OUT";
  let quantity: number;
  let reason = parsed.data.reason;

  if (reason === "CORRECTIE") {
    if (targetQty === undefined) {
      return NextResponse.json(
        { error: "targetQty is required for CORRECTIE" },
        { status: 400 },
      );
    }
    const delta = targetQty - current.quantity;
    if (delta === 0) {
      return NextResponse.json(
        { error: "Geen wijziging (doel = huidig aantal)" },
        { status: 400 },
      );
    }
    type = delta > 0 ? "IN" : "OUT";
    quantity = Math.abs(delta);
  } else {
    if (!parsed.data.type || !parsed.data.quantity) {
      return NextResponse.json(
        { error: "type and quantity are required" },
        { status: 400 },
      );
    }
    type = parsed.data.type;
    quantity = parsed.data.quantity;
    // Default reason afgeleid van type (backward compat met de bestaande dialog).
    reason = reason ?? (type === "IN" ? "INKOOP" : "UITGIFTE");
  }

  const isUitgifte = reason === "UITGIFTE" && type === "OUT";
  const signedDelta = type === "IN" ? quantity : -quantity;

  // UITGIFTE = huidig /stock-gedrag: bedrijf verplicht, blokkeer bij te weinig, maak asset.
  if (isUitgifte) {
    if (!companyId) {
      return NextResponse.json(
        { error: "Company is required for uitgifte" },
        { status: 400 },
      );
    }
    if (current.quantity < quantity) {
      return NextResponse.json({ error: "Insufficient stock" }, { status: 400 });
    }
  }

  const assetType = categoryToAssetType(current.category);

  const movement = await prisma.$transaction(async (tx) => {
    const mv = await tx.stockMovement.create({
      data: {
        stockItemId: id,
        type,
        quantity,
        reason,
        note: note || null,
        companyId: isUitgifte ? companyId : companyId || null,
        userId: user.id,
        performedBy: user.id,
      },
      include: {
        company: { select: { id: true, name: true, shortName: true } },
        ticket: { select: { id: true, ticketNumber: true, subject: true } },
        user: { select: { id: true, name: true } },
      },
    });

    // currentQty in dezelfde tx bijwerken (negatief toegestaan buiten UITGIFTE).
    await tx.stockItem.update({
      where: { id },
      data: { quantity: { increment: signedDelta } },
    });

    // Asset ALLEEN bij UITGIFTE.
    if (isUitgifte) {
      for (let i = 0; i < quantity; i++) {
        await tx.asset.create({
          data: {
            name: assetName || current.name,
            type: assetType as
              | "LAPTOP"
              | "DESKTOP"
              | "PRINTER"
              | "MONITOR"
              | "PHONE"
              | "NETWORK"
              | "OTHER",
            companyId: companyId!,
            assignedTo: assignedTo || null,
            stockItemId: id,
          },
        });
      }
    }

    // Inname: optioneel teruggebracht asset verwijderen.
    if (returnAssetId) {
      await tx.asset.delete({ where: { id: returnAssetId } });
    }

    return mv;
  });

  safeLogAudit({
    entityType: "StockMovement",
    entityId: movement.id,
    action: "CREATE",
    userId: user.id,
    metadata: { stockItemId: id, type, quantity, reason },
  });

  return NextResponse.json(movement, { status: 201 });
}
