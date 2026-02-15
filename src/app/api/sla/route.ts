import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slaPolicyCreateSchema } from "@/lib/validations";
import { safeLogAudit } from "@/lib/audit";
import { getSessionUser, requireAdmin } from "@/lib/auth-utils";
import { asPriority } from "@/lib/form-utils";

export async function GET() {
  try {
    await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const policies = await prisma.slaPolicy.findMany({
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(policies);
}

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await requireAdmin();
  } catch (err) {
    if (err instanceof Error && err.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = slaPolicyCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  // Check if a policy already exists for this priority
  const existing = await prisma.slaPolicy.findUnique({
    where: { priority: asPriority(parsed.data.priority) },
  });

  if (existing) {
    return NextResponse.json(
      {
        error: `An SLA policy already exists for priority ${parsed.data.priority}`,
      },
      { status: 409 },
    );
  }

  const policy = await prisma.slaPolicy.create({
    data: {
      name: parsed.data.name,
      priority: asPriority(parsed.data.priority),
      responseTimeHours: parsed.data.responseTimeHours,
      resolveTimeHours: parsed.data.resolveTimeHours,
    },
  });

  safeLogAudit({
    entityType: "SlaPolicy",
    entityId: policy.id,
    action: "CREATE",
    userId: user.id,
  });

  return NextResponse.json(policy, { status: 201 });
}
