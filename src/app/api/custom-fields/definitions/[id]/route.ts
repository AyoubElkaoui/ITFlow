import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { customFieldDefinitionUpdateSchema } from "@/lib/validations";
import { safeLogAudit, diffChanges } from "@/lib/audit";
import { getSessionUser, requireAdmin } from "@/lib/auth-utils";
import type { CustomFieldEntity } from "@/generated/prisma/client";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await getSessionUser();

  const definition = await prisma.customFieldDefinition.findUnique({
    where: { id },
  });

  if (!definition) {
    return NextResponse.json(
      { error: "Custom field definition not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(definition);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requireAdmin();

  const body = await request.json();
  const parsed = customFieldDefinitionUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const oldDefinition = await prisma.customFieldDefinition.findUnique({
    where: { id },
  });

  if (!oldDefinition) {
    return NextResponse.json(
      { error: "Custom field definition not found" },
      { status: 404 },
    );
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.entityType) {
    updateData.entityType = parsed.data.entityType as CustomFieldEntity;
  }
  if (parsed.data.options !== undefined) {
    updateData.options = parsed.data.options ?? undefined;
  }

  const definition = await prisma.customFieldDefinition.update({
    where: { id },
    data: updateData,
  });

  safeLogAudit({
    entityType: "CustomFieldDefinition",
    entityId: id,
    action: "UPDATE",
    userId: user.id,
    changes: diffChanges(
      oldDefinition as unknown as Record<string, unknown>,
      parsed.data as Record<string, unknown>,
    ),
  });

  return NextResponse.json(definition);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requireAdmin();

  const definition = await prisma.customFieldDefinition.findUnique({
    where: { id },
  });

  if (!definition) {
    return NextResponse.json(
      { error: "Custom field definition not found" },
      { status: 404 },
    );
  }

  await prisma.customFieldDefinition.delete({ where: { id } });

  safeLogAudit({
    entityType: "CustomFieldDefinition",
    entityId: id,
    action: "DELETE",
    userId: user.id,
  });

  return NextResponse.json({ success: true });
}
