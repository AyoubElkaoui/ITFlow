import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { checkRateLimit, getClientIp, API_RATE_LIMITS } from "@/lib/rate-limit";

const intlMiddleware = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files
  if (pathname.startsWith("/_next") || pathname === "/favicon.ico") {
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

    const result = checkRateLimit(
      `${ip}:${isAuthRoute ? "auth" : "api"}`,
      config,
    );

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
