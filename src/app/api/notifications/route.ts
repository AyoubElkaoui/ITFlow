import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-utils";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const { searchParams } = request.nextUrl;
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const notifications = await prisma.notification.findMany({
      where: {
        userId: user.id,
        ...(unreadOnly && { isRead: false }),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(notifications);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 },
    );
  }
}
