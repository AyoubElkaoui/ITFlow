import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { projectUpdateSchema } from "@/lib/validations";
import { safeLogAudit } from "@/lib/audit";
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
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      company: { select: { id: true, name: true, shortName: true } },
      tasks: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(project);
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
  const parsed = projectUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const data: Record<string, unknown> = { ...parsed.data };
  const newStatus = parsed.data.status as string | undefined;
  if (newStatus === "COMPLETED") {
    data.completedAt = new Date();
  } else if (newStatus) {
    data.completedAt = null;
  }

  const project = await prisma.project.update({
    where: { id },
    data,
    include: {
      company: { select: { id: true, name: true, shortName: true } },
      tasks: { orderBy: { sortOrder: "asc" } },
    },
  });

  safeLogAudit({
    entityType: "Project",
    entityId: project.id,
    action: "UPDATE",
    userId: user.id,
  });

  return NextResponse.json(project);
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

  await prisma.project.delete({ where: { id } });

  safeLogAudit({
    entityType: "Project",
    entityId: id,
    action: "DELETE",
    userId: user.id,
  });

  return NextResponse.json({ success: true });
}
