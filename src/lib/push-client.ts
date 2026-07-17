// Browser-helpers voor web push. Alleen te gebruiken in client components.

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  // Backed by a concrete ArrayBuffer zodat het type BufferSource-compatibel is.
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

/** Is dit apparaat momenteel geabonneerd op push? */
export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

/**
 * Vraag toestemming, abonneer dit apparaat en registreer bij de server.
 * Gooit een Error met leesbare boodschap bij weigering/fout.
 */
export async function enablePush(): Promise<void> {
  if (!isPushSupported()) {
    throw new Error("Dit apparaat/browser ondersteunt geen push-notificaties.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Toestemming voor meldingen geweigerd.");
  }

  const keyRes = await fetch("/api/push/public-key");
  const { key } = (await keyRes.json()) as { key: string | null };
  if (!key) {
    throw new Error("Push is niet geconfigureerd op de server (VAPID ontbreekt).");
  }

  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    }));

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub.toJSON()),
  });
  if (!res.ok) {
    throw new Error("Kon abonnement niet opslaan op de server.");
  }
}

/** Zeg dit apparaat af en verwijder het abonnement op de server. */
export async function disablePush(): Promise<void> {
  const sub = await getPushSubscription();
  if (!sub) return;

  await fetch("/api/push/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  }).catch(() => {});

  await sub.unsubscribe().catch(() => {});
}
