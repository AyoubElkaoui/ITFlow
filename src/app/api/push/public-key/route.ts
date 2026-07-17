import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-utils";

// GET: geef de publieke VAPID-sleutel aan de client. Via een route (i.p.v.
// NEXT_PUBLIC_) zodat een sleutelwissel geen rebuild vereist.
export async function GET() {
  try {
    await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = process.env.VAPID_PUBLIC_KEY ?? null;
  // Diagnose (geen geheimen): laat zien of de server-side sleutels aanwezig zijn.
  // Zonder VAPID_PRIVATE_KEY kan de server geen push versturen (subscribe lukt wel).
  return NextResponse.json({
    key,
    diag: {
      hasPublic: !!process.env.VAPID_PUBLIC_KEY,
      hasPrivate: !!process.env.VAPID_PRIVATE_KEY,
      subject: process.env.VAPID_SUBJECT ?? null,
      publicKeyPrefix: key ? key.slice(0, 12) : null,
    },
  });
}
