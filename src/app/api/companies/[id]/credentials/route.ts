import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-utils";
import { encrypt, decrypt } from "@/lib/crypto";
import { z } from "zod/v4";

const schema = z.object({
  label: z.string().min(1),
  username: z.string().optional().nullable(),
  password: z.string().min(1),
  url: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let user;
  try { user = await getSessionUser(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const credentials = await prisma.credential.findMany({
    where: { companyId: id },
    orderBy: { label: "asc" },
    select: { id: true, label: true, username: true, password: true, url: true, notes: true, createdAt: true, createdBy: { select: { name: true } } },
  });

  // Decrypt passwords
  const result = credentials.map((c) => {
    try {
      return { ...c, password: decrypt(c.password) };
    } catch {
      return { ...c, password: "⚠ Decryptie mislukt" };
    }
  });

  // Audit log elke keer dat wachtwoorden worden bekeken
  await prisma.auditLog.create({
    data: { entityType: "Credentials", entityId: id, action: "VIEW", userId: user.id },
  }).catch(() => {});

  return NextResponse.json(result);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let user;
  try { user = await getSessionUser(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });

  const encryptedPassword = encrypt(parsed.data.password);

  const credential = await prisma.credential.create({
    data: {
      companyId: id,
      label: parsed.data.label,
      username: parsed.data.username || null,
      password: encryptedPassword,
      url: parsed.data.url || null,
      notes: parsed.data.notes || null,
      createdById: user.id,
    },
  });

  return NextResponse.json({ ...credential, password: parsed.data.password }, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try { await getSessionUser(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { credentialId } = await request.json();

  const cred = await prisma.credential.findUnique({ where: { id: credentialId } });
  if (!cred || cred.companyId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.credential.delete({ where: { id: credentialId } });
  return NextResponse.json({ success: true });
}
