import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { requirePortalSession } from "@/lib/portal-auth";

const ALLOWED = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "application/pdf",
];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

// Controleer dat het ticket bij het bedrijf van de ingelogde portal-gebruiker hoort.
async function assertOwnedTicket(id: string, companyId: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: { id: true, companyId: true },
  });
  if (!ticket || ticket.companyId !== companyId) return null;
  return ticket;
}

// GET: bijlagen van een eigen ticket.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let session;
  try {
    session = await requirePortalSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!(await assertOwnedTicket(id, session.companyId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const attachments = await prisma.ticketAttachment.findMany({
    where: { ticketId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(attachments);
}

// POST: bijlage uploaden bij een eigen ticket.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let session;
  try {
    session = await requirePortalSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!(await assertOwnedTicket(id, session.companyId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Bestand te groot (max 10MB)" }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
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
      // Portal-gebruikers zijn Contacts, geen Users; uploadedById is geen FK,
      // dus we bewaren de contactId als herkomst.
      uploadedById: session.contactId,
    },
  });

  return NextResponse.json(attachment, { status: 201 });
}
