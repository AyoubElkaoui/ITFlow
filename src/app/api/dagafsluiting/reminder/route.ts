import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-utils";
import { createNotification } from "@/lib/notifications";
import { APP_TIME_ZONE } from "@/lib/tz";

// Dagelijkse reminder om de dagafsluiting niet te vergeten. Bedoeld voor een
// Vercel Cron op werkdagen ~17:00 NL (zie vercel.json).
//  - Cron/geautoriseerd: verstuurt een melding als de dag van vandaag nog niet
//    is afgesloten. Alleen op werkdagen, tenzij ?force=1.
//  - Zonder autorisatie: sessie-beveiligde preview (verstuurt niets).
//
// De dagafsluiting is één-gebruiker (WorkDay.date is uniek). De reminder gaat
// naar de eigenaar; standaard ayoub@itfin.nl, override via DAGAFSLUITING_USER_EMAIL.

// YYYY-MM-DD van vandaag in NL-tijd.
function todayYmdNL(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: APP_TIME_ZONE });
}

// 1 = maandag … 7 = zondag, in NL-tijd.
function weekdayNL(): number {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    weekday: "short",
  }).format(new Date());
  return { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[wd] ?? 0;
}

export async function GET(request: NextRequest) {
  const secret = process.env.REPORT_CRON_SECRET;
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const provided =
    bearer ||
    request.headers.get("x-cron-secret") ||
    request.nextUrl.searchParams.get("secret");
  const isVercelCron = request.headers.get("x-vercel-cron") !== null;
  const authorized = isVercelCron || (!!secret && provided === secret);

  if (!authorized) {
    // Handmatige preview vereist een ingelogde gebruiker; verstuurt niets.
    try {
      await getSessionUser();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const force = request.nextUrl.searchParams.get("force") === "1";

  // Alleen op werkdagen (ma–vr), tenzij geforceerd.
  const weekday = weekdayNL();
  if (!force && (weekday === 6 || weekday === 7)) {
    return NextResponse.json({ skipped: "weekend" });
  }

  const ymd = todayYmdNL();
  const date = new Date(`${ymd}T00:00:00Z`);

  const workDay = await prisma.workDay.findFirst({
    where: { date },
    select: { status: true },
  });

  if (!force && workDay?.status === "CLOSED") {
    return NextResponse.json({ skipped: "already-closed", date: ymd });
  }

  const targetEmail =
    process.env.DAGAFSLUITING_USER_EMAIL || "ayoub@itfin.nl";
  const target = await prisma.user.findFirst({
    where: { email: targetEmail, isActive: true },
    select: { id: true },
  });

  if (!target) {
    return NextResponse.json(
      { error: `Geen actieve gebruiker met e-mail ${targetEmail}` },
      { status: 404 },
    );
  }

  // Preview (niet-cron, geen force): laat zien wat er zou gebeuren.
  if (!authorized) {
    return NextResponse.json({
      preview: true,
      date: ymd,
      wouldNotify: !workDay || workDay.status !== "CLOSED",
    });
  }

  await createNotification({
    userId: target.id,
    type: "reminder",
    title: "Vergeet je dagafsluiting niet",
    message: "Sluit je werkdag af zodat je uren kloppen.",
    link: "/dagafsluiting",
  });

  return NextResponse.json({ sent: true, date: ymd });
}
