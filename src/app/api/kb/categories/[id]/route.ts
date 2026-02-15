import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { kbCategoryUpdateSchema } from "@/lib/validations";
import { safeLogAudit, diffChanges } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth-utils";

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

  const category = await prisma.kbCategory.findUnique({
    where: { id },
    include: {
      articles: {
        include: {
          author: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  return NextResponse.json(category);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getSessionUser();

  const body = await request.json();
  const parsed = kbCategoryUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const oldCategory = await prisma.kbCategory.findUnique({ where: { id } });

  if (!oldCategory) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const category = await prisma.kbCategory.update({
    where: { id },
    data: parsed.data,
    include: {
      _count: { select: { articles: true } },
    },
  });

  safeLogAudit({
    entityType: "KbCategory",
    entityId: id,
    action: "UPDATE",
    userId: user.id,
    changes: diffChanges(
      oldCategory as unknown as Record<string, unknown>,
      parsed.data as Record<string, unknown>,
    ),
  });

  return NextResponse.json(category);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getSessionUser();

  const category = await prisma.kbCategory.findUnique({
    where: { id },
    include: { _count: { select: { articles: true } } },
  });

  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  if (category._count.articles > 0) {
    return NextResponse.json(
      {
        error:
          "Cannot delete category with existing articles. Remove or reassign articles first.",
      },
      { status: 400 },
    );
  }

  await prisma.kbCategory.delete({ where: { id } });

  safeLogAudit({
    entityType: "KbCategory",
    entityId: id,
    action: "DELETE",
    userId: user.id,
  });

  return NextResponse.json({ success: true });
}
