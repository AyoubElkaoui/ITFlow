/// <reference lib="webworker" />
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  Serwist,
  CacheFirst,
  NetworkFirst,
  ExpirationPlugin,
} from "serwist";

declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    // Static Next.js assets — CacheFirst, 30 dagen
    {
      matcher: /\/_next\/static\/.*/i,
      handler: new CacheFirst({
        cacheName: "next-static",
        plugins: [
          new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }),
        ],
      }),
    },
    // Google Fonts — CacheFirst, 1 jaar
    {
      matcher: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
      handler: new CacheFirst({
        cacheName: "google-fonts",
        plugins: [
          new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }),
        ],
      }),
    },
    // PWA iconen — CacheFirst, 7 dagen
    {
      matcher: /\/api\/pwa\/.*/i,
      handler: new CacheFirst({
        cacheName: "pwa-assets",
        plugins: [
          new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 7 }),
        ],
      }),
    },
    // App pagina's — NetworkFirst, offline fallback naar cache
    {
      matcher: /\/(nl|en)(\/.*)?$/i,
      handler: new NetworkFirst({
        cacheName: "app-pages",
        networkTimeoutSeconds: 5,
        plugins: [
          new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 }),
        ],
      }),
    },
    // API GET calls — NetworkFirst, 5 minuten cache als fallback
    {
      matcher: ({ request }: { request: Request }) =>
        request.method === "GET" && request.url.includes("/api/"),
      handler: new NetworkFirst({
        cacheName: "api-cache",
        networkTimeoutSeconds: 5,
        plugins: [
          new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 5 }),
        ],
      }),
    },
  ],
});

serwist.addEventListeners();

// --- Web push -------------------------------------------------------------
// Toon een notificatie wanneer de server een push stuurt.
self.addEventListener("push", (event) => {
  let data: { title?: string; body?: string; url?: string; tag?: string } = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { title: event.data?.text() };
  }

  const title = data.title || "ITFlow";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body,
      tag: data.tag,
      icon: "/api/pwa/icon?size=192",
      badge: "/api/pwa/icon?size=96",
      data: { url: data.url || "/" },
    }),
  );
});

// Open (of focus) de app op de bijbehorende link bij klik op een notificatie.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string })?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const client = clients[0] as WindowClient | undefined;
        if (client) {
          client.focus();
          client.navigate(url).catch(() => {});
          return;
        }
        return self.clients.openWindow(url);
      }),
  );
});
