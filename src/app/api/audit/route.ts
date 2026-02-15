import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-utils";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");
  const userId = searchParams.get("userId");
  const action = searchParams.get("action");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = Math.min(Number(searchParams.get("pageSize")) || 20, 100);

  const where = {
    ...(entityType && { entityType }),
    ...(entityId && { entityId }),
    ...(userId && { userId }),
    ...(action && { action }),
    ...(from || to
      ? {
          createdAt: {
            ...(from && { gte: new Date(from) }),
            ...(to && { lte: new Date(to + "T23:59:59.999Z") }),
          },
        }
      : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return NextResponse.json({ data: logs, total, page, pageSize });
}
