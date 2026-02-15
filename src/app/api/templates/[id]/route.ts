import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { templateUpdateSchema } from "@/lib/validations";
import { safeLogAudit, diffChanges } from "@/lib/audit";
import { getSessionUser, requireAdmin } from "@/lib/auth-utils";

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

  const template = await prisma.ticketTemplate.findUnique({
    where: { id },
  });

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json(template);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let user;
  try {
    user = await requireAdmin();
  } catch (err) {
    if (err instanceof Error && err.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const body = await request.json();
  const parsed = templateUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const oldTemplate = await prisma.ticketTemplate.findUnique({
    where: { id },
  });

  if (!oldTemplate) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const template = await prisma.ticketTemplate.update({
    where: { id },
    data: parsed.data,
  });

  safeLogAudit({
    entityType: "TicketTemplate",
    entityId: id,
    action: "UPDATE",
    userId: user.id,
    changes: diffChanges(
      oldTemplate as unknown as Record<string, unknown>,
      parsed.data as Record<string, unknown>,
    ),
  });

  return NextResponse.json(template);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let user;
  try {
    user = await requireAdmin();
  } catch (err) {
    if (err instanceof Error && err.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const template = await prisma.ticketTemplate.findUnique({
    where: { id },
  });

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  await prisma.ticketTemplate.delete({ where: { id } });

  safeLogAudit({
    entityType: "TicketTemplate",
    entityId: id,
    action: "DELETE",
    userId: user.id,
  });

  return NextResponse.json({ success: true });
}
