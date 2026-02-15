import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { customFieldDefinitionCreateSchema } from "@/lib/validations";
import { safeLogAudit } from "@/lib/audit";
import { getSessionUser, requireAdmin } from "@/lib/auth-utils";
import type { CustomFieldEntity } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  try {
    await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entityType") as CustomFieldEntity | null;

  const where = entityType ? { entityType } : {};

  const definitions = await prisma.customFieldDefinition.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(definitions);
}

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await requireAdmin();
  } catch (err) {
    if (err instanceof Error && err.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = customFieldDefinitionCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const definition = await prisma.customFieldDefinition.create({
    data: {
      entityType: parsed.data.entityType as CustomFieldEntity,
      name: parsed.data.name,
      label: parsed.data.label,
      fieldType: parsed.data.fieldType,
      options: parsed.data.options ?? undefined,
      required: parsed.data.required,
      sortOrder: parsed.data.sortOrder,
    },
  });

  safeLogAudit({
    entityType: "CustomFieldDefinition",
    entityId: definition.id,
    action: "CREATE",
    userId: user.id,
  });

  return NextResponse.json(definition, { status: 201 });
}
