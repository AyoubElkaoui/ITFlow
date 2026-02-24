import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { projectCreateSchema } from "@/lib/validations";
import { safeLogAudit } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth-utils";

export async function GET(request: NextRequest) {
  try {
    await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const companyId = searchParams.get("companyId");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (companyId) where.companyId = companyId;

  const projects = await prisma.project.findMany({
    where,
    include: {
      company: { select: { id: true, name: true, shortName: true } },
      tasks: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(projects);
}

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = projectCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const project = await prisma.project.create({
    data: {
      ...parsed.data,
      companyId: parsed.data.companyId || null,
    },
    include: {
      company: { select: { id: true, name: true, shortName: true } },
      tasks: true,
    },
  });

  safeLogAudit({
    entityType: "Project",
    entityId: project.id,
    action: "CREATE",
    userId: user.id,
  });

  return NextResponse.json(project, { status: 201 });
}
