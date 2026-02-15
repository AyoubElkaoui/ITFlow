import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-utils";
import { safeLogAudit, diffChanges } from "@/lib/audit";
import { userUpdateSchema } from "@/lib/validations";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
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
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const body = await request.json();
    const parsed = userUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    // Prevent self-deactivation
    if (id === admin.id && parsed.data.isActive === false) {
      return NextResponse.json(
        { error: "You cannot deactivate your own account" },
        { status: 400 },
      );
    }

    // Prevent self-role-change
    if (
      id === admin.id &&
      parsed.data.role &&
      parsed.data.role !== admin.role
    ) {
      return NextResponse.json(
        { error: "You cannot change your own role" },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check email uniqueness if changing email
    if (parsed.data.email && parsed.data.email !== existing.email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email: parsed.data.email },
      });
      if (emailTaken) {
        return NextResponse.json(
          { error: "A user with this email already exists" },
          { status: 409 },
        );
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: parsed.data,
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

    const changes = diffChanges(
      existing as unknown as Record<string, unknown>,
      parsed.data as unknown as Record<string, unknown>,
    );

    await safeLogAudit({
      entityType: "User",
      entityId: user.id,
      action: "UPDATE",
      changes,
      userId: admin.id,
    });

    return NextResponse.json(user);
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
