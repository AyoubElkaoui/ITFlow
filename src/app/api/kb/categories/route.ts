import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { kbCategoryCreateSchema } from "@/lib/validations";
import { safeLogAudit } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth-utils";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function randomSuffix(): string {
  return Math.random().toString(36).substring(2, 8);
}

export async function GET() {
  try {
    await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const categories = await prisma.kbCategory.findMany({
    include: {
      _count: { select: { articles: true } },
    },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(categories);
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();

  const body = await request.json();
  const parsed = kbCategoryCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  let slug = generateSlug(parsed.data.name);

  const existing = await prisma.kbCategory.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${randomSuffix()}`;
  }

  const category = await prisma.kbCategory.create({
    data: {
      ...parsed.data,
      slug,
    },
    include: {
      _count: { select: { articles: true } },
    },
  });

  safeLogAudit({
    entityType: "KbCategory",
    entityId: category.id,
    action: "CREATE",
    userId: user.id,
  });

  return NextResponse.json(category, { status: 201 });
}
