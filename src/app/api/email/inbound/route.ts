import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyAdmins } from "@/lib/notifications";

/**
 * Inbound email webhook endpoint.
 * Accepts POST requests with email data and creates tickets automatically.
 *
 * Expected JSON body:
 * {
 *   from: "sender@example.com",
 *   subject: "Issue description",
 *   body: "Full email body text",
 *   html?: "HTML email body (optional)",
 *   secret: "INBOUND_EMAIL_SECRET env var for auth"
 * }
 *
 * How it works:
 * 1. Validates the secret token
 * 2. Looks up the sender email in contacts (with portalEnabled)
 * 3. If found: creates a ticket for that contact's company
 * 4. If not found but email matches a company contactEmail: creates ticket for that company
 * 5. Otherwise: creates ticket under a default/catch-all or returns 404
 */
export async function POST(request: NextRequest) {
  const secret = process.env.INBOUND_EMAIL_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Inbound email not configured" },
      { status: 503 },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.secret !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { from, subject, body: emailBody } = body;

  if (!from || !subject) {
    return NextResponse.json(
      { error: "Missing required fields: from, subject" },
      { status: 400 },
    );
  }

  // Extract email address from "Name <email>" format
  const emailMatch = from.match(/<([^>]+)>/) || [null, from.trim()];
  const senderEmail = (emailMatch[1] || from).toLowerCase().trim();

  // 1. Try to find a portal contact with this email
  const contact = await prisma.contact.findFirst({
    where: {
      email: { equals: senderEmail, mode: "insensitive" },
      isActive: true,
    },
    include: {
      company: { select: { id: true, name: true } },
    },
  });

  let companyId: string;
  let contactId: string | null = null;
  let companyName: string;

  if (contact) {
    companyId = contact.companyId;
    contactId = contact.id;
    companyName = contact.company.name;
  } else {
    // 2. Try to find a company with this contactEmail
    const company = await prisma.company.findFirst({
      where: {
        OR: [
          { contactEmail: { equals: senderEmail, mode: "insensitive" } },
          { email: { equals: senderEmail, mode: "insensitive" } },
        ],
        isActive: true,
      },
    });

    if (company) {
      companyId = company.id;
      companyName = company.name;
    } else {
      return NextResponse.json(
        { error: "No matching contact or company found for sender" },
        { status: 404 },
      );
    }
  }

  // Find default admin user for assignment
  const adminUser = await prisma.user.findFirst({
    where: { role: "ADMIN", isActive: true },
    select: { id: true },
  });

  if (!adminUser) {
    return NextResponse.json(
      { error: "No admin user available" },
      { status: 500 },
    );
  }

  // Create the ticket
  const ticket = await prisma.ticket.create({
    data: {
      companyId,
      contactId,
      subject: subject.substring(0, 255),
      description: emailBody || subject,
      status: "OPEN",
      priority: "NORMAL",
      assignedToId: adminUser.id,
      createdById: adminUser.id,
    },
  });

  // Notify admins
  await notifyAdmins({
    type: "ticket",
    title: `Nieuw ticket via e-mail: ${subject.substring(0, 100)}`,
    message: `${companyName} - ${senderEmail}`,
    link: `/tickets/${ticket.id}`,
  });

  return NextResponse.json(
    {
      success: true,
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      company: companyName,
    },
    { status: 201 },
  );
}
