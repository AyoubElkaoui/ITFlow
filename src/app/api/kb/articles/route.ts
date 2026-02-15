import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { kbArticleCreateSchema } from "@/lib/validations";
import { safeLogAudit } from "@/lib/audit";
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

export async function GET(request: NextRequest) {
  try {
    await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || undefined;
  const categoryId = searchParams.get("categoryId") || undefined;
  const published = searchParams.get("published");
  const slug = searchParams.get("slug") || undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { content: { contains: search, mode: "insensitive" } },
    ];
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (published === "true") {
    where.isPublished = true;
  } else if (published === "false") {
    where.isPublished = false;
  }

  if (slug) {
    where.slug = slug;
  }

  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = Math.min(Number(searchParams.get("pageSize")) || 20, 100);

  const [articles, total] = await Promise.all([
    prisma.kbArticle.findMany({
      where,
      include: {
        author: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.kbArticle.count({ where }),
  ]);

  return NextResponse.json({ data: articles, total, page, pageSize });
}

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = kbArticleCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  let slug = generateSlug(parsed.data.title);

  // Check if slug already exists, append random suffix if so
  const existing = await prisma.kbArticle.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${randomSuffix()}`;
  }

  const article = await prisma.kbArticle.create({
    data: {
      ...parsed.data,
      slug,
      authorId: user.id,
    },
    include: {
      author: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, slug: true } },
    },
  });

  safeLogAudit({
    entityType: "KbArticle",
    entityId: article.id,
    action: "CREATE",
    userId: user.id,
  });

  return NextResponse.json(article, { status: 201 });
}
