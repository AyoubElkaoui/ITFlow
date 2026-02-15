import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-utils";
import { verifyToken } from "@/lib/totp";
import { safeLogAudit } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const body = await request.json();
    const { token } = body as { token: string };

    if (!token || token.length !== 6) {
      return NextResponse.json(
        { error: "A valid 6-digit code is required" },
        { status: 400 },
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { twoFactorSecret: true },
    });

    if (!dbUser?.twoFactorSecret) {
      return NextResponse.json(
        { error: "2FA setup has not been initiated" },
        { status: 400 },
      );
    }

    const isValid = verifyToken(dbUser.twoFactorSecret, token);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: true },
    });

    await safeLogAudit({
      entityType: "User",
      entityId: user.id,
      action: "UPDATE",
      userId: user.id,
      metadata: { event: "2FA_ENABLED" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to verify 2FA" },
      { status: 500 },
    );
  }
}
