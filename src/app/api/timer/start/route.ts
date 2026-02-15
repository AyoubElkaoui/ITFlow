import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-utils";
import { safeLogAudit } from "@/lib/audit";
import { z } from "zod/v4";

const startTimerSchema = z.object({
  companyId: z.string().min(1, "Company is required"),
  ticketId: z.string().optional(),
  description: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();

    const body = await request.json();
    const parsed = startTimerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    // Check if user already has an active timer
    const existing = await prisma.activeTimer.findUnique({
      where: { userId: user.id },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Timer already running" },
        { status: 409 },
      );
    }

    const timer = await prisma.activeTimer.create({
      data: {
        userId: user.id,
        companyId: parsed.data.companyId,
        ticketId: parsed.data.ticketId || null,
        description: parsed.data.description || null,
      },
    });

    safeLogAudit({
      entityType: "ActiveTimer",
      entityId: timer.id,
      action: "CREATE",
      userId: user.id,
    });

    return NextResponse.json(timer, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to start timer" },
      { status: 500 },
    );
  }
}
