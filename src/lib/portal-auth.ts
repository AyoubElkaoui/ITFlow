import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "portal-token";
const SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "fallback-secret-change-me",
);

export interface PortalSession {
  contactId: string;
  companyId: string;
  companyName: string;
  contactName: string;
  email: string;
}

export async function createPortalToken(
  payload: PortalSession,
): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function getPortalSession(): Promise<PortalSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      contactId: payload.contactId as string,
      companyId: payload.companyId as string,
      companyName: payload.companyName as string,
      contactName: payload.contactName as string,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}

export async function setPortalCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    priority: "high",
  });
}

export async function clearPortalCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function requirePortalSession(): Promise<PortalSession> {
  const session = await getPortalSession();
  if (!session) {
    throw new Error("Portal: Unauthorized");
  }
  return session;
}
