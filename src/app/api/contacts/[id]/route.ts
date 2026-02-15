import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { contactUpdateSchema } from "@/lib/validations";
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
  const contact = await prisma.contact.findUnique({
    where: { id },
    include: {
      company: { select: { id: true, name: true, shortName: true } },
    },
  });

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  return NextResponse.json(contact);
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
  const parsed = contactUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }
  const oldContact = await prisma.contact.findUnique({ where: { id } });

  const contact = await prisma.contact.update({
    where: { id },
    data: {
      ...parsed.data,
      email: parsed.data.email || undefined,
    },
    include: {
      company: { select: { id: true, name: true, shortName: true } },
    },
  });

  safeLogAudit({
    entityType: "Contact",
    entityId: id,
    action: "UPDATE",
    userId: user.id,
    changes: oldContact
      ? diffChanges(
          oldContact as unknown as Record<string, unknown>,
          parsed.data as Record<string, unknown>,
        )
      : undefined,
  });

  return NextResponse.json(contact);
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
  await prisma.contact.delete({ where: { id } });

  safeLogAudit({
    entityType: "Contact",
    entityId: id,
    action: "DELETE",
    userId: user.id,
  });

  return NextResponse.json({ success: true });
}
