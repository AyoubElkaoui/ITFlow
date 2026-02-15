import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { contactCreateSchema } from "@/lib/validations";
import { safeLogAudit } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth-utils";

export async function GET(request: NextRequest) {
  try {
    await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const companyId = searchParams.get("companyId");
  const search = searchParams.get("search");

  const contacts = await prisma.contact.findMany({
    where: {
      ...(companyId && { companyId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
          { phone: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      isActive: true,
    },
    include: {
      company: { select: { id: true, name: true, shortName: true } },
    },
    orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
  });

  return NextResponse.json(contacts);
}

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = contactCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const contact = await prisma.contact.create({
    data: {
      ...parsed.data,
      email: parsed.data.email || undefined,
    },
  });

  safeLogAudit({
    entityType: "Contact",
    entityId: contact.id,
    action: "CREATE",
    userId: user.id,
  });

  return NextResponse.json(contact, { status: 201 });
}
