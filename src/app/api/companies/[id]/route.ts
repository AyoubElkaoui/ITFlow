import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { companyUpdateSchema } from "@/lib/validations";
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
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      contacts: { orderBy: { isPrimary: "desc" } },
      _count: {
        select: {
          tickets: true,
          timeEntries: true,
          assets: true,
          contacts: true,
        },
      },
    },
  });

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  return NextResponse.json(company);
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
  const parsed = companyUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }
  const oldCompany = await prisma.company.findUnique({ where: { id } });

  const company = await prisma.company.update({
    where: { id },
    data: {
      ...parsed.data,
      email: parsed.data.email || null,
      contactEmail: parsed.data.contactEmail || null,
    },
  });

  safeLogAudit({
    entityType: "Company",
    entityId: id,
    action: "UPDATE",
    userId: user.id,
    changes: oldCompany
      ? diffChanges(
          oldCompany as unknown as Record<string, unknown>,
          parsed.data as Record<string, unknown>,
        )
      : undefined,
  });

  return NextResponse.json(company);
}
