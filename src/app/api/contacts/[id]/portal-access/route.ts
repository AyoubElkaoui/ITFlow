import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-utils";
import { safeLogAudit } from "@/lib/audit";
import { sendPortalInvite } from "@/lib/email";

function generatePassword(length = 10): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// POST: Enable portal access (set password + enable)
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
  const body = await request.json().catch(() => ({}));
  const sendEmail = body.sendEmail !== false;
  const hasUsernameField = typeof body.username === "string";
  const rawUsername =
    hasUsernameField ? body.username.trim().toLowerCase() : "";
  const portalUsername = hasUsernameField
    ? rawUsername.length > 0
      ? rawUsername
      : null
    : undefined;

  if (
    typeof portalUsername === "string" &&
    !/^[a-z0-9._-]{3,50}$/.test(portalUsername)
  ) {
    return NextResponse.json(
      {
        error:
          "Username must be 3-50 characters and contain only letters, numbers, dot, underscore or hyphen",
      },
      { status: 400 },
    );
  }

  const contact = await prisma.contact.findUnique({
    where: { id },
    include: { company: { select: { name: true } } },
  });

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  if (!contact.email) {
    return NextResponse.json(
      { error: "Contact has no email address" },
      { status: 400 },
    );
  }

  const plainPassword = body.password || generatePassword();
  const hashedPassword = await hash(plainPassword, 10);

  try {
    await prisma.contact.update({
      where: { id },
      data: {
        portalEnabled: true,
        password: hashedPassword,
        ...(portalUsername !== undefined ? { portalUsername } : {}),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "Username is already in use" },
        { status: 409 },
      );
    }
    throw error;
  }

  safeLogAudit({
    entityType: "Contact",
    entityId: id,
    action: "UPDATE",
    userId: user.id,
    changes: { portalEnabled: { old: contact.portalEnabled, new: true } },
  });

  if (sendEmail) {
    try {
      await sendPortalInvite({
        to: contact.email,
        contactName: contact.name,
        companyName: contact.company.name,
        password: plainPassword,
      });
    } catch (err) {
      console.error("Failed to send portal invite email:", err);
      return NextResponse.json({
        success: true,
        password: plainPassword,
        emailSent: false,
        emailError: "Failed to send email. Check SMTP settings.",
      });
    }
  }

  return NextResponse.json({
    success: true,
    password: plainPassword,
    emailSent: sendEmail,
  });
}

// DELETE: Disable portal access
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let user;
  try {
    user = await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const contact = await prisma.contact.findUnique({ where: { id } });
  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  await prisma.contact.update({
    where: { id },
    data: {
      portalEnabled: false,
      password: null,
    },
  });

  safeLogAudit({
    entityType: "Contact",
    entityId: id,
    action: "UPDATE",
    userId: user.id,
    changes: { portalEnabled: { old: true, new: false } },
  });

  return NextResponse.json({ success: true });
}
