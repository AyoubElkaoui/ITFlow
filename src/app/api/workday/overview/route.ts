import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-utils";
import {
  aggregateOverview,
  monthRange,
  weekRange,
  ymd,
} from "@/lib/workday-overview";

const companySelect = {
  id: true,
  shortName: true,
  name: true,
  clockwiseCode: true,
} as const;

/**
 * GET /api/workday/overview?period=month|week&anchor=YYYY-MM-DD
 * Aggregeert de dagafsluitingen server-side: per klant totalen + dagverdeling,
 * OPEN/CLOSED-telling en een sanity-check (som klant-uren == som netto-dagtotalen).
 */
export async function GET(request: NextRequest) {
  let user;
  try {
    user = await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const period = sp.get("period") === "week" ? "week" : "month";
  const anchorParam = sp.get("anchor");
  if (!anchorParam || !/^\d{4}-\d{2}-\d{2}$/.test(anchorParam)) {
    return NextResponse.json(
      { error: "Query param 'anchor' (YYYY-MM-DD) is required" },
      { status: 400 },
    );
  }

  const anchor = new Date(`${anchorParam}T00:00:00Z`);
  const { from, to } =
    period === "week" ? weekRange(anchor) : monthRange(anchor);

  const workDays = await prisma.workDay.findMany({
    where: { userId: user.id, date: { gte: from, lte: to } },
    include: {
      allocations: {
        include: { company: { select: companySelect } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { date: "asc" },
  });

  const result = aggregateOverview(workDays);

  return NextResponse.json({
    period,
    anchor: anchorParam,
    from: ymd(from),
    to: ymd(to),
    ...result,
  });
}
