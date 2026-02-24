import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { projectTaskCreateSchema } from "@/lib/validations";
import { getSessionUser } from "@/lib/auth-utils";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = projectTaskCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const maxOrder = await prisma.projectTask.aggregate({
    where: { projectId: id },
    _max: { sortOrder: true },
  });

  const task = await prisma.projectTask.create({
    data: {
      projectId: id,
      title: parsed.data.title,
      completed: parsed.data.completed,
      sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
    },
  });

  return NextResponse.json(task, { status: 201 });
}
