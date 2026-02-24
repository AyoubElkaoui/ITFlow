import { NextRequest, NextResponse } from "next/server";
import { hash, compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requirePortalSession } from "@/lib/portal-auth";

// GET: Get current contact profile
export async function GET() {
  let session;
  try {
    session = await requirePortalSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contact = await prisma.contact.findUnique({
    where: { id: session.contactId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      function: true,
      company: { select: { name: true } },
    },
  });

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  return NextResponse.json(contact);
}

// PATCH: Update profile (name, phone) + optionally change password
export async function PATCH(request: NextRequest) {
  let session;
  try {
    session = await requirePortalSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, phone, currentPassword, newPassword } = body;

  const contact = await prisma.contact.findUnique({
    where: { id: session.contactId },
    select: { id: true, password: true },
  });

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  // Build update data
  const updateData: Record<string, unknown> = {};

  if (name && typeof name === "string" && name.trim().length > 0) {
    updateData.name = name.trim();
  }

  if (phone !== undefined) {
    updateData.phone = phone?.trim() || null;
  }

  // Password change
  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json(
        { error: "Current password is required" },
        { status: 400 },
      );
    }

    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters" },
        { status: 400 },
      );
    }

    if (!contact.password) {
      return NextResponse.json(
        { error: "No password set" },
        { status: 400 },
      );
    }

    const isValid = await compare(currentPassword, contact.password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 },
      );
    }

    updateData.password = await hash(newPassword, 10);
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: "No changes provided" },
      { status: 400 },
    );
  }

  const updated = await prisma.contact.update({
    where: { id: session.contactId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      function: true,
    },
  });

  return NextResponse.json(updated);
}
