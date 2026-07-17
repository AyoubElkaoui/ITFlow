import "server-only";
import webpush from "web-push";
import { prisma } from "@/lib/prisma";

// VAPID-config wordt lazy geïnitialiseerd zodat een ontbrekende sleutel de
// hele app niet laat crashen — push valt dan simpelweg stil terug.
let configured: boolean | null = null;

function ensureConfigured(): boolean {
  if (configured !== null) return configured;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:administratie@itfin.nl";

  if (!publicKey || !privateKey) {
    console.warn("[push] VAPID keys ontbreken — push-notificaties uitgeschakeld");
    configured = false;
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
}

/**
 * Stuur een push-notificatie naar alle geregistreerde apparaten van een
 * gebruiker. Verlopen abonnementen (HTTP 404/410) worden opgeruimd.
 * Faalt nooit hard: fouten worden gelogd, niet gegooid.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<void> {
  if (!ensureConfigured()) return;

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return;

  const body = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
        );
      } catch (err: unknown) {
        const statusCode =
          typeof err === "object" && err !== null && "statusCode" in err
            ? (err as { statusCode?: number }).statusCode
            : undefined;
        // 404 Not Found / 410 Gone -> abonnement is verlopen, opruimen
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription
            .delete({ where: { id: sub.id } })
            .catch(() => {});
        } else {
          console.error("[push] versturen mislukt:", statusCode ?? err);
        }
      }
    }),
  );
}
