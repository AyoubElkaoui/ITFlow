import { after } from "next/server";
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

  const deliverPush = () =>
    sendPushToUser(params.userId, {
      title: params.title,
      body: params.message,
      url: params.link,
      tag: notification.id,
    }).catch((err) => console.error("[push] sendPushToUser mislukt:", err));

  // BELANGRIJK: op Vercel (serverless) wordt de functie meteen na het antwoord
  // bevroren. Een niet-awaited `void deliverPush()` zou dan afgekapt worden vóór
  // Apple/FCM de push ontvangt. `after()` houdt de functie levend tot de push
  // verstuurd is, zónder het antwoord te vertragen. Buiten request-context
  // (bijv. een script) valt het terug op direct awaiten.
  try {
    after(deliverPush);
  } catch {
    await deliverPush();
  }

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
