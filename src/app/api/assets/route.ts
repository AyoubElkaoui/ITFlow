import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { safeLogAudit } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth-utils";

const assetCreateSchema = z.object({
  companyId: z.string().min(1, "Company is required"),
  type: z
    .enum([
      "LAPTOP",
      "DESKTOP",
      "PRINTER",
      "MONITOR",
      "PHONE",
      "NETWORK",
      "OTHER",
    ])
    .default("OTHER"),
  brand: z.string().optional(),
  model: z.string().optional(),
  name: z.string().optional(),
  assetTag: z.string().optional(),
  serialNumber: z.string().optional(),
  purchaseDate: z.coerce.date().optional(),
  warrantyEnd: z.coerce.date().optional(),
  assignedTo: z.string().optional(),
  status: z
    .enum(["ACTIVE", "IN_REPAIR", "STORED", "RETIRED"])
    .default("ACTIVE"),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search") || "";
  const companyId = searchParams.get("companyId");
  const status = searchParams.get("status");
  const type = searchParams.get("type");

  const where = {
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { assetTag: { contains: search, mode: "insensitive" as const } },
        { brand: { contains: search, mode: "insensitive" as const } },
        { model: { contains: search, mode: "insensitive" as const } },
        { serialNumber: { contains: search, mode: "insensitive" as const } },
        { assignedTo: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(companyId && { companyId }),
    ...(status && {
      status: status as "ACTIVE" | "IN_REPAIR" | "STORED" | "RETIRED",
    }),
    ...(type && {
      type: type as
        | "LAPTOP"
        | "DESKTOP"
        | "PRINTER"
        | "MONITOR"
        | "PHONE"
        | "NETWORK"
        | "OTHER",
    }),
  };

  const assets = await prisma.asset.findMany({
    where,
    include: {
      company: { select: { id: true, name: true, shortName: true } },
      _count: { select: { ticketLinks: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(assets);
}

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = assetCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const asset = await prisma.asset.create({
    data: parsed.data,
    include: {
      company: { select: { id: true, name: true, shortName: true } },
    },
  });

  safeLogAudit({
    entityType: "Asset",
    entityId: asset.id,
    action: "CREATE",
    userId: user.id,
  });

  return NextResponse.json(asset, { status: 201 });
}
