import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { customFieldValueSaveSchema } from "@/lib/validations";
import { getSessionUser } from "@/lib/auth-utils";

export async function GET(request: NextRequest) {
  try {
    await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");

  if (!entityType || !entityId) {
    return NextResponse.json(
      { error: "entityType and entityId are required" },
      { status: 400 },
    );
  }

  const values = await prisma.customFieldValue.findMany({
    where: { entityType, entityId },
    include: { fieldDefinition: true },
  });

  return NextResponse.json(values);
}

export async function POST(request: NextRequest) {
  try {
    await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");

  if (!entityType || !entityId) {
    return NextResponse.json(
      { error: "entityType and entityId are required as query params" },
      { status: 400 },
    );
  }

  const body = await request.json();
  const parsed = customFieldValueSaveSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const results = await Promise.all(
    parsed.data.values.map((item) =>
      prisma.customFieldValue.upsert({
        where: {
          fieldDefinitionId_entityType_entityId: {
            fieldDefinitionId: item.fieldDefinitionId,
            entityType,
            entityId,
          },
        },
        update: { value: item.value },
        create: {
          fieldDefinitionId: item.fieldDefinitionId,
          entityType,
          entityId,
          value: item.value,
        },
      }),
    ),
  );

  return NextResponse.json(results);
}
