import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { safeLogAudit, diffChanges } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth-utils";

const assetUpdateSchema = z
  .object({
    companyId: z.string().min(1, "Company is required"),
    type: z.enum([
      "LAPTOP",
      "DESKTOP",
      "PRINTER",
      "MONITOR",
      "PHONE",
      "NETWORK",
      "OTHER",
    ]),
    brand: z.string().optional(),
    model: z.string().optional(),
    name: z.string().optional(),
    serialNumber: z.string().optional(),
    purchaseDate: z.coerce.date().optional(),
    warrantyEnd: z.coerce.date().optional(),
    assignedTo: z.string().optional(),
    status: z.enum(["ACTIVE", "IN_REPAIR", "STORED", "RETIRED"]),
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
  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      company: true,
    },
  });

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  return NextResponse.json(asset);
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
  const parsed = assetUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }
  const oldAsset = await prisma.asset.findUnique({ where: { id } });

  const asset = await prisma.asset.update({
    where: { id },
    data: parsed.data,
    include: {
      company: { select: { id: true, name: true, shortName: true } },
    },
  });

  safeLogAudit({
    entityType: "Asset",
    entityId: id,
    action: "UPDATE",
    userId: user.id,
    changes: oldAsset
      ? diffChanges(
          oldAsset as unknown as Record<string, unknown>,
          parsed.data as Record<string, unknown>,
        )
      : undefined,
  });

  return NextResponse.json(asset);
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
  await prisma.asset.delete({ where: { id } });

  safeLogAudit({
    entityType: "Asset",
    entityId: id,
    action: "DELETE",
    userId: user.id,
  });

  return NextResponse.json({ success: true });
}
