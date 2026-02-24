import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePortalSession } from "@/lib/portal-auth";
import { notifyAdmins } from "@/lib/notifications";

export async function GET(request: NextRequest) {
  let session;
  try {
    session = await requirePortalSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = Math.min(Number(searchParams.get("pageSize")) || 20, 100);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    companyId: session.companyId,
    ...(status && {
      status: status as
        | "OPEN"
        | "IN_PROGRESS"
        | "WAITING"
        | "RESOLVED"
        | "CLOSED"
        | "BILLABLE",
    }),
  };

  if (search) {
    const searchConditions: Record<string, unknown>[] = [
      { subject: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
    if (!isNaN(Number(search))) {
      searchConditions.push({ ticketNumber: Number(search) });
    }
    where.OR = searchConditions;
  }

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      select: {
        id: true,
        ticketNumber: true,
        subject: true,
        status: true,
        priority: true,
        category: true,
        createdAt: true,
        updatedAt: true,
        contact: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.ticket.count({ where }),
  ]);

  return NextResponse.json({ data: tickets, total, page, pageSize });
}

export async function POST(request: NextRequest) {
  let session;
  try {
    session = await requirePortalSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { subject, description, priority, category } = body;

  if (!subject || typeof subject !== "string" || subject.trim().length === 0) {
    return NextResponse.json({ error: "Subject is required" }, { status: 400 });
  }

  // Find a default admin user to set as createdBy
  const adminUser = await prisma.user.findFirst({
    where: { role: "ADMIN", isActive: true },
    select: { id: true },
  });

  if (!adminUser) {
    return NextResponse.json(
      { error: "System configuration error" },
      { status: 500 },
    );
  }

  const ticket = await prisma.ticket.create({
    data: {
      companyId: session.companyId,
      contactId: session.contactId,
      subject: subject.trim(),
      description: description?.trim() || null,
      priority: ["LOW", "NORMAL", "HIGH", "URGENT"].includes(priority)
        ? priority
        : "NORMAL",
      category: [
        "HARDWARE",
        "SOFTWARE",
        "NETWORK",
        "ACCOUNT",
        "OTHER",
      ].includes(category)
        ? category
        : null,
      status: "OPEN",
      createdById: adminUser.id,
    },
    select: {
      id: true,
      ticketNumber: true,
      subject: true,
      status: true,
      priority: true,
      category: true,
      createdAt: true,
    },
  });

  // Notify admins about new portal ticket
  notifyAdmins({
    type: "ticket",
    title: `Portal ticket: ${ticket.subject}`,
    message: `Created by ${session.contactName} (${session.companyName})`,
    link: `/tickets/${ticket.id}`,
  }).catch(() => {});

  return NextResponse.json(ticket, { status: 201 });
}
