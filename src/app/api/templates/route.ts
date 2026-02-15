import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { templateCreateSchema } from "@/lib/validations";
import { safeLogAudit } from "@/lib/audit";
import { getSessionUser, requireAdmin } from "@/lib/auth-utils";

export async function GET() {
  try {
    await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const templates = await prisma.ticketTemplate.findMany({
    select: {
      id: true,
      name: true,
      subject: true,
      priority: true,
      category: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(templates);
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
  const parsed = templateCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const template = await prisma.ticketTemplate.create({
    data: parsed.data,
  });

  safeLogAudit({
    entityType: "TicketTemplate",
    entityId: template.id,
    action: "CREATE",
    userId: user.id,
  });

  return NextResponse.json(template, { status: 201 });
}
