import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { kbArticleUpdateSchema } from "@/lib/validations";
import { safeLogAudit, diffChanges } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth-utils";

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function randomSuffix(): string {
  return Math.random().toString(36).substring(2, 8);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await getSessionUser();

  const article = await prisma.kbArticle.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  return NextResponse.json(article);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getSessionUser();

  const body = await request.json();
  const parsed = kbArticleUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const oldArticle = await prisma.kbArticle.findUnique({ where: { id } });

  if (!oldArticle) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = { ...parsed.data };

  // If title changed, regenerate slug
  if (parsed.data.title && parsed.data.title !== oldArticle.title) {
    let slug = generateSlug(parsed.data.title);
    const existing = await prisma.kbArticle.findUnique({ where: { slug } });
    if (existing && existing.id !== id) {
      slug = `${slug}-${randomSuffix()}`;
    }
    updateData.slug = slug;
  }

  const article = await prisma.kbArticle.update({
    where: { id },
    data: updateData,
    include: {
      author: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, slug: true } },
    },
  });

  safeLogAudit({
    entityType: "KbArticle",
    entityId: id,
    action: "UPDATE",
    userId: user.id,
    changes: diffChanges(
      oldArticle as unknown as Record<string, unknown>,
      parsed.data as Record<string, unknown>,
    ),
  });

  return NextResponse.json(article);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getSessionUser();

  const article = await prisma.kbArticle.findUnique({ where: { id } });

  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  await prisma.kbArticle.delete({ where: { id } });

  safeLogAudit({
    entityType: "KbArticle",
    entityId: id,
    action: "DELETE",
    userId: user.id,
  });

  return NextResponse.json({ success: true });
}
