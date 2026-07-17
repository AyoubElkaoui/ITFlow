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
  return NextResponse.json({ key });
}
