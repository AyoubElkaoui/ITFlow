import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { safeLogAudit } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth-utils";

const linkAssetSchema = z.object({
  assetId: z.string().min(1, "Asset is required"),
  note: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  const assetLinks = await prisma.assetTicket.findMany({
    where: { ticketId: id },
    include: {
      asset: {
        include: {
          company: { select: { shortName: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(assetLinks);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = linkAssetSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  let user;
  try {
    user = await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  // Check for duplicate link
  const existing = await prisma.assetTicket.findUnique({
    where: {
      assetId_ticketId: {
        assetId: parsed.data.assetId,
        ticketId: id,
      },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Asset is already linked to this ticket" },
      { status: 409 },
    );
  }

  const link = await prisma.assetTicket.create({
    data: {
      assetId: parsed.data.assetId,
      ticketId: id,
      note: parsed.data.note,
    },
    include: {
      asset: {
        include: {
          company: { select: { shortName: true } },
        },
      },
    },
  });

  safeLogAudit({
    entityType: "AssetTicket",
    entityId: link.id,
    action: "CREATE",
    userId: user.id,
    metadata: {
      ticketId: id,
      assetId: parsed.data.assetId,
    },
  });

  return NextResponse.json(link, { status: 201 });
}
