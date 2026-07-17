import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";

export async function createNotification(params: {
  userId: string;
  type: string;
  title: string;
  message?: string;
  link?: string;
}) {
  const notification = await prisma.notification.create({ data: params });

  // Push naar telefoon/desktop van de gebruiker — fire-and-forget zodat een
  // trage of falende push nooit de aanmaak van de melding blokkeert.
  void sendPushToUser(params.userId, {
    title: params.title,
    body: params.message,
    url: params.link,
    tag: notification.id,
  }).catch((err) => console.error("[push] sendPushToUser mislukt:", err));

  return notification;
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
