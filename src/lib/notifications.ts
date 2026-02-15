import { prisma } from "@/lib/prisma";

export async function createNotification(params: {
  userId: string;
  type: string;
  title: string;
  message?: string;
  link?: string;
}) {
  return prisma.notification.create({ data: params });
}

// Helper to notify all admins
export async function notifyAdmins(params: {
  type: string;
  title: string;
  message?: string;
  link?: string;
}) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true },
    select: { id: true },
  });
  return Promise.all(
    admins.map((admin) =>
      createNotification({ ...params, userId: admin.id })
    )
  );
}
