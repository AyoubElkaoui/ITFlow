import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-utils";

export async function GET() {
  try {
    const user = await getSessionUser();

    const count = await prisma.notification.count({
      where: {
        userId: user.id,
        isRead: false,
      },
    });

    return NextResponse.json({ count });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch unread count" },
      { status: 500 },
    );
  }
}
