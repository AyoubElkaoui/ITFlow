import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // Disable in dev — test PWA only via `next build && next start`
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  ...(process.env.DOCKER_BUILD === "1" && { output: "standalone" as const }),
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-XSS-Protection", value: "1; mode=block" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Permissions-Policy",
          // Allow camera for ticket photo upload
          value: "camera=(self), microphone=(), geolocation=()",
        },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ],
    },
    {
      source: "/manifest.webmanifest",
      headers: [
        { key: "Cache-Control", value: "public, max-age=3600" },
      ],
    },
  ],
};

const withNextIntl = createNextIntlPlugin();
export default withSerwist(withNextIntl(nextConfig));
