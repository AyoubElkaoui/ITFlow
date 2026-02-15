import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-utils";
import { safeLogAudit } from "@/lib/audit";
import { userCreateSchema } from "@/lib/validations";
import { hash } from "bcryptjs";

export async function GET() {
  try {
    const admin = await requireAdmin();

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            createdTickets: true,
            timeEntries: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(users);
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();

    const body = await request.json();
    const parsed = userCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    // Check email uniqueness
    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 },
      );
    }

    const hashedPassword = await hash(parsed.data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        name: parsed.data.name,
        password: hashedPassword,
        role: parsed.data.role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await safeLogAudit({
      entityType: "User",
      entityId: user.id,
      action: "CREATE",
      userId: admin.id,
      metadata: { email: user.email, role: user.role },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
