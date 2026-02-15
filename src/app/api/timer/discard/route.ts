import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-utils";
import { safeLogAudit } from "@/lib/audit";

export async function POST() {
  try {
    const user = await getSessionUser();

    const timer = await prisma.activeTimer.findUnique({
      where: { userId: user.id },
    });

    if (!timer) {
      return NextResponse.json(
        { error: "No active timer found" },
        { status: 404 },
      );
    }

    await prisma.activeTimer.delete({
      where: { userId: user.id },
    });

    safeLogAudit({
      entityType: "ActiveTimer",
      entityId: timer.id,
      action: "DELETE",
      userId: user.id,
      metadata: { discarded: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to discard timer" },
      { status: 500 },
    );
  }
}
