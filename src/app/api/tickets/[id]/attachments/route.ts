import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-utils";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const attachments = await prisma.ticketAttachment.findMany({
    where: { ticketId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(attachments);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let user;
  try {
    user = await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Max 10MB
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Bestand te groot (max 10MB)" }, { status: 400 });
  }

  const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "Bestandstype niet toegestaan" }, { status: 400 });
  }

  const filename = `tickets/${id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  const blob = await put(filename, file, {
    access: "public",
    contentType: file.type,
  });

  const attachment = await prisma.ticketAttachment.create({
    data: {
      ticketId: id,
      url: blob.url,
      name: file.name,
      size: file.size,
      mimeType: file.type,
      uploadedById: user.id,
    },
  });

  return NextResponse.json(attachment, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { attachmentId } = await request.json();

  const attachment = await prisma.ticketAttachment.findUnique({
    where: { id: attachmentId },
  });

  if (!attachment || attachment.ticketId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await del(attachment.url);
  await prisma.ticketAttachment.delete({ where: { id: attachmentId } });

  return NextResponse.json({ success: true });
}
