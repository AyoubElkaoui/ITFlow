import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createPortalToken, setPortalCookie } from "@/lib/portal-auth";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 },
    );
  }

  const contact = await prisma.contact.findFirst({
    where: {
      email: email.toLowerCase().trim(),
      portalEnabled: true,
      isActive: true,
    },
    include: {
      company: { select: { id: true, name: true } },
    },
  });

  if (!contact || !contact.password) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 },
    );
  }

  const isValid = await compare(password, contact.password);
  if (!isValid) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 },
    );
  }

  const token = await createPortalToken({
    contactId: contact.id,
    companyId: contact.companyId,
    companyName: contact.company.name,
    contactName: contact.name,
    email: contact.email!,
  });

  await setPortalCookie(token);

  return NextResponse.json({
    contactName: contact.name,
    companyName: contact.company.name,
  });
}
