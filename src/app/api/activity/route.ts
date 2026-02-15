import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-utils";

export async function GET(request: NextRequest) {
  try {
    await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");
  const pageSize = Math.min(Number(searchParams.get("pageSize")) || 20, 100);

  const where = {
    ...(entityType && { entityType }),
    ...(entityId && { entityId }),
  };

  const logs = await prisma.auditLog.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: pageSize,
  });

  return NextResponse.json(logs);
}
