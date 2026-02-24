import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { safeLogAudit } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth-utils";

const stockItemCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z
    .enum([
      "CABLE",
      "ADAPTER",
      "TONER",
      "PERIPHERAL",
      "COMPONENT",
      "TOOL",
      "OTHER",
    ])
    .default("OTHER"),
  description: z.string().optional(),
  sku: z.string().optional(),
  quantity: z.number().int().min(0).default(0),
  minStock: z.number().int().min(0).default(0),
  location: z.string().optional(),
  unitPrice: z.number().min(0).optional(),
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
  const category = searchParams.get("category");
  const lowStock = searchParams.get("lowStock") === "true";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    isActive: true,
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { sku: { contains: search, mode: "insensitive" as const } },
        { description: { contains: search, mode: "insensitive" as const } },
        { location: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(category && { category }),
  };

  const items = await prisma.stockItem.findMany({
    where,
    include: {
      _count: { select: { movements: true } },
    },
    orderBy: { name: "asc" },
  });

  // Prisma lacks cross-column comparison, filter post-query
  const filtered = lowStock
    ? items.filter((item) => item.quantity <= item.minStock)
    : items;

  return NextResponse.json(filtered);
}

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = stockItemCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const item = await prisma.stockItem.create({
    data: parsed.data,
  });

  safeLogAudit({
    entityType: "StockItem",
    entityId: item.id,
    action: "CREATE",
    userId: user.id,
  });

  return NextResponse.json(item, { status: 201 });
}
