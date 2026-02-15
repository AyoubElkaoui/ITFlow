import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-utils";

export async function GET() {
  try {
    const user = await getSessionUser();

    const timer = await prisma.activeTimer.findUnique({
      where: { userId: user.id },
    });

    return NextResponse.json(timer);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch timer" },
      { status: 500 },
    );
  }
}
