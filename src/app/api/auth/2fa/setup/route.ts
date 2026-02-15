import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-utils";
import { generateSecret } from "@/lib/totp";
import { safeLogAudit } from "@/lib/audit";

export async function POST() {
  try {
    const user = await getSessionUser();

    const { secret, uri } = generateSecret(user.email);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorSecret: secret,
        twoFactorEnabled: false,
      },
    });

    const qrDataUrl = await QRCode.toDataURL(uri);

    await safeLogAudit({
      entityType: "User",
      entityId: user.id,
      action: "UPDATE",
      userId: user.id,
      metadata: { event: "2FA_SETUP_INITIATED" },
    });

    return NextResponse.json({ secret, qrCode: qrDataUrl });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to setup 2FA" }, { status: 500 });
  }
}
