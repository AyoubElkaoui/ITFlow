import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { companyCreateSchema } from "@/lib/validations";
import { safeLogAudit } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth-utils";

export async function GET(request: NextRequest) {
  try {
    await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search") || "";
  const active = searchParams.get("active");

  const where = {
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { shortName: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(active !== null && active !== "" && { isActive: active === "true" }),
  };

  const companies = await prisma.company.findMany({
    where,
    include: {
      _count: {
        select: {
          tickets: true,
          timeEntries: true,
          contacts: true,
          assets: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(companies);
}

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = companyCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const company = await prisma.company.create({
    data: {
      ...parsed.data,
      hourlyRate: parsed.data.hourlyRate ?? undefined,
      email: parsed.data.email || undefined,
      contactEmail: parsed.data.contactEmail || undefined,
    },
  });

  safeLogAudit({
    entityType: "Company",
    entityId: company.id,
    action: "CREATE",
    userId: user.id,
  });

  return NextResponse.json(company, { status: 201 });
}
