import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slaPolicyUpdateSchema } from "@/lib/validations";
import { safeLogAudit, diffChanges } from "@/lib/audit";
import { getSessionUser, requireAdmin } from "@/lib/auth-utils";
import { asPriority } from "@/lib/form-utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await getSessionUser();

  const policy = await prisma.slaPolicy.findUnique({
    where: { id },
  });

  if (!policy) {
    return NextResponse.json(
      { error: "SLA policy not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(policy);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requireAdmin();

  const body = await request.json();
  const parsed = slaPolicyUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const oldPolicy = await prisma.slaPolicy.findUnique({
    where: { id },
  });

  if (!oldPolicy) {
    return NextResponse.json(
      { error: "SLA policy not found" },
      { status: 404 },
    );
  }

  // If priority is being changed, check for conflicts
  if (parsed.data.priority && parsed.data.priority !== oldPolicy.priority) {
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
  }

  const policy = await prisma.slaPolicy.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.priority !== undefined && {
        priority: asPriority(parsed.data.priority),
      }),
      ...(parsed.data.responseTimeHours !== undefined && {
        responseTimeHours: parsed.data.responseTimeHours,
      }),
      ...(parsed.data.resolveTimeHours !== undefined && {
        resolveTimeHours: parsed.data.resolveTimeHours,
      }),
    },
  });

  safeLogAudit({
    entityType: "SlaPolicy",
    entityId: id,
    action: "UPDATE",
    userId: user.id,
    changes: diffChanges(
      oldPolicy as unknown as Record<string, unknown>,
      parsed.data as Record<string, unknown>,
    ),
  });

  return NextResponse.json(policy);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requireAdmin();

  const policy = await prisma.slaPolicy.findUnique({
    where: { id },
  });

  if (!policy) {
    return NextResponse.json(
      { error: "SLA policy not found" },
      { status: 404 },
    );
  }

  await prisma.slaPolicy.delete({ where: { id } });

  safeLogAudit({
    entityType: "SlaPolicy",
    entityId: id,
    action: "DELETE",
    userId: user.id,
  });

  return NextResponse.json({ success: true });
}
