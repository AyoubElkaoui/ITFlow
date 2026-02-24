import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ticketCreateSchema } from "@/lib/validations";
import { safeLogAudit } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth-utils";
import { createNotification, notifyAdmins } from "@/lib/notifications";

export async function GET(request: NextRequest) {
  try {
    await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const companyId = searchParams.get("companyId");
  const assignedToId = searchParams.get("assignedToId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = Math.min(Number(searchParams.get("pageSize")) || 20, 5000);

  const where = {
    ...(search && {
      OR: [
        { subject: { contains: search, mode: "insensitive" as const } },
        { description: { contains: search, mode: "insensitive" as const } },
        { tasksPerformed: { contains: search, mode: "insensitive" as const } },
        { pcName: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(status && {
      status: status as
        | "OPEN"
        | "IN_PROGRESS"
        | "WAITING"
        | "RESOLVED"
        | "CLOSED",
    }),
    ...(priority && {
      priority: priority as "LOW" | "NORMAL" | "HIGH" | "URGENT",
    }),
    ...(companyId && { companyId }),
    ...(assignedToId && { assignedToId }),
    ...(from || to
      ? {
          createdAt: {
            ...(from && { gte: new Date(from) }),
            ...(to && { lte: new Date(`${to}T23:59:59.999Z`) }),
          },
        }
      : {}),
  };

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      include: {
        company: { select: { id: true, name: true, shortName: true } },
        contact: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { timeEntries: true } },
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
  let user;
  try {
    user = await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = ticketCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  // Validate contact belongs to the selected company
  if (parsed.data.contactId) {
    const contact = await prisma.contact.findUnique({
      where: { id: parsed.data.contactId },
      select: { companyId: true },
    });
    if (!contact || contact.companyId !== parsed.data.companyId) {
      return NextResponse.json(
        { error: "Contact does not belong to the selected company" },
        { status: 400 },
      );
    }
  }

  const ticket = await prisma.ticket.create({
    data: {
      ...parsed.data,
      createdById: user.id,
      assignedToId: parsed.data.assignedToId || user.id,
    },
    include: {
      company: { select: { id: true, name: true, shortName: true } },
      contact: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  safeLogAudit({
    entityType: "Ticket",
    entityId: ticket.id,
    action: "CREATE",
    userId: user.id,
  });

  // Notify assigned user (if different from creator)
  if (ticket.assignedToId && ticket.assignedToId !== user.id) {
    createNotification({
      userId: ticket.assignedToId,
      type: "ticket",
      title: `New ticket assigned: ${ticket.subject}`,
      message: `${ticket.company?.shortName} - ${ticket.priority}`,
      link: `/tickets/${ticket.id}`,
    }).catch(() => {});
  }

  // Notify admins about new ticket
  notifyAdmins({
    type: "ticket",
    title: `New ticket: ${ticket.subject}`,
    message: `Created by ${user.name} for ${ticket.company?.shortName}`,
    link: `/tickets/${ticket.id}`,
  }).catch(() => {});

  return NextResponse.json(ticket, { status: 201 });
}
