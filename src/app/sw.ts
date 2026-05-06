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
