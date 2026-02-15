import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-utils";

export async function PATCH() {
  try {
    const user = await getSessionUser();

    const result = await prisma.notification.updateMany({
      where: {
        userId: user.id,
        isRead: false,
      },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to mark all notifications as read" },
      { status: 500 },
    );
  }
}
