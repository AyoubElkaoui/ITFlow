import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createPortalToken } from "@/lib/portal-auth";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const identifier =
    typeof body.identifier === "string"
      ? body.identifier
      : typeof body.email === "string"
        ? body.email
        : "";
  const { password } = body;
  const normalizedIdentifier = identifier.trim().toLowerCase();

  if (!normalizedIdentifier || !password) {
    return NextResponse.json(
      { error: "Email/username and password are required" },
      { status: 400 },
    );
  }

  const contact = await prisma.contact.findFirst({
    where: {
      portalEnabled: true,
      isActive: true,
      OR: [
        { email: normalizedIdentifier },
        { portalUsername: normalizedIdentifier },
      ],
    },
    include: {
      company: { select: { id: true, name: true } },
    },
  });

  if (!contact || !contact.password) {
    return NextResponse.json(
      { error: "Invalid credentials" },
      { status: 401 },
    );
  }

  const isValid = await compare(password, contact.password);
  if (!isValid) {
    return NextResponse.json(
      { error: "Invalid credentials" },
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

  const response = NextResponse.json({
    contactName: contact.name,
    companyName: contact.company.name,
  });

  // Zet cookie expliciet via Set-Cookie header
  const cookieValue = [
    `portal-token=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${7 * 24 * 60 * 60}`, // 7 days
  ].join("; ");

  response.headers.set("Set-Cookie", cookieValue);

  return response;
}
