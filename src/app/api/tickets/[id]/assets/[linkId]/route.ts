import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeLogAudit } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth-utils";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; linkId: string }> },
) {
  const { id, linkId } = await params;
  const user = await getSessionUser();

  const link = await prisma.assetTicket.findUnique({
    where: { id: linkId },
  });

  if (!link) {
    return NextResponse.json(
      { error: "Asset link not found" },
      { status: 404 },
    );
  }

  if (link.ticketId !== id) {
    return NextResponse.json(
      { error: "Asset link does not belong to this ticket" },
      { status: 400 },
    );
  }

  await prisma.assetTicket.delete({ where: { id: linkId } });

  safeLogAudit({
    entityType: "AssetTicket",
    entityId: linkId,
    action: "DELETE",
    userId: user.id,
    metadata: {
      ticketId: id,
      assetId: link.assetId,
    },
  });

  return NextResponse.json({ success: true });
}
