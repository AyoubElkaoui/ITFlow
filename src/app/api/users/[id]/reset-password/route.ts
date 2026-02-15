import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-utils";
import { safeLogAudit } from "@/lib/audit";
import { resetPasswordSchema } from "@/lib/validations";
import { hash } from "bcryptjs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const hashedPassword = await hash(parsed.data.password, 12);

    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    await safeLogAudit({
      entityType: "User",
      entityId: id,
      action: "UPDATE",
      userId: admin.id,
      metadata: { action: "password_reset", targetEmail: user.email },
    });

    return NextResponse.json({ message: "Password reset successfully" });
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
