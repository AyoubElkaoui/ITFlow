import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { checkRateLimit, getClientIp, API_RATE_LIMITS } from "@/lib/rate-limit";

const intlMiddleware = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip _next én ALLE statische bestanden met een extensie (.js .svg .png .ico
  // .webmanifest .txt ...). Cruciaal: de service worker precachet publieke
  // assets (o.a. de default *.svg); haalt de auth/i18n-middleware die door de
  // login-redirect, dan faalt `cache.addAll` en installeert de SW NOOIT →
  // geen PWA en geen push. Een pad met een punt in het laatste segment = bestand.
  if (pathname.startsWith("/_next") || /\.[^/]+$/.test(pathname)) {
    return NextResponse.next();
  }

  // Rate limiting for API routes
  if (pathname.startsWith("/api")) {
    const ip = getClientIp(request);
    const method = request.method;

    // Stricter limits for auth endpoints
    const isAuthRoute =
      pathname.startsWith("/api/auth/check-2fa") ||
      pathname.startsWith("/api/auth/2fa") ||
      (pathname.startsWith("/api/auth") && pathname.includes("callback"));

    const config = isAuthRoute
      ? API_RATE_LIMITS.auth
      : method !== "GET"
        ? API_RATE_LIMITS.write
        : API_RATE_LIMITS.general;

    // Key non-auth routes per authenticated user, NOT per IP: a whole office
    // behind one NAT/proxy IP (or requests where x-forwarded-for is missing and
    // getClientIp falls back to "unknown") would otherwise share a single bucket
    // and collectively trip the limit — locking everyone out of viewing AND
    // creating tickets. Auth routes stay IP-keyed for brute-force protection.
    let identifier = `${ip}:${isAuthRoute ? "auth" : "api"}`;
    if (!isAuthRoute) {
      const rlToken = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
        cookieName:
          request.nextUrl.protocol === "https:"
            ? "__Secure-authjs.session-token"
            : "authjs.session-token",
      });
      const userId = (rlToken?.id ?? rlToken?.sub) as string | undefined;
      if (userId) identifier = `user:${userId}:api`;
    }

    const result = checkRateLimit(identifier, config);

    if (!result.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.ceil((result.resetAt - Date.now()) / 1000),
            ),
            "X-RateLimit-Limit": String(result.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(result.resetAt),
          },
        },
      );
    }

    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", String(result.limit));
    response.headers.set("X-RateLimit-Remaining", String(result.remaining));
    response.headers.set("X-RateLimit-Reset", String(result.resetAt));
    return response;
  }

  // Run intl middleware first (handles locale detection & redirects)
  const intlResponse = intlMiddleware(request);

  // Extract locale from the URL (after intl middleware may have rewritten)
  const localeMatch = pathname.match(/^\/(nl|en)(\/|$)/);
  const locale = localeMatch ? localeMatch[1] : routing.defaultLocale;

  // --- Portal routes ---
  const isPortalLogin = pathname.match(/^\/(nl|en)\/portal\/login(\/|$)/);
  const isPortalRoute = pathname.match(/^\/(nl|en)\/portal(\/|$)/);

  if (isPortalLogin) {
    return intlResponse;
  }

  if (isPortalRoute) {
    const portalToken = request.cookies.get("portal-token")?.value;
    if (!portalToken) {
      return NextResponse.redirect(
        new URL(`/${locale}/portal/login`, request.url),
      );
    }
    // Token validity is checked in the API/pages themselves
    return intlResponse;
  }

  // --- Dashboard routes ---
  // Check if this is a login page
  const isLoginPage =
    pathname.match(/^\/(nl|en)\/login(\/|$)/) || pathname === "/login";

  // Skip auth for login pages
  if (isLoginPage) {
    return intlResponse;
  }

  // Auth check for all other pages
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName:
      request.nextUrl.protocol === "https:"
        ? "__Secure-authjs.session-token"
        : "authjs.session-token",
  });

  if (!token) {
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Admin route protection
  const isAdminRoute = pathname.match(/^\/(nl|en)\/admin(\/|$)/);
  if (isAdminRoute && token.role !== "ADMIN") {
    return NextResponse.redirect(new URL(`/${locale}`, request.url));
  }

  return intlResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
