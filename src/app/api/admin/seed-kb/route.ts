import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-utils";

export async function POST() {
  try {
    const user = await requireAdmin();

    async function cat(name: string) {
      const slug = name.toLowerCase().replace(/\s+/g, "-");
      const existing = await prisma.kbCategory.findFirst({ where: { name } });
      if (existing) return existing;
      return prisma.kbCategory.create({ data: { name, slug, sortOrder: 0 } });
    }

    async function article(data: { title: string; content: string; categoryId: string }) {
      const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const existing = await prisma.kbArticle.findUnique({ where: { slug } });
      if (existing) return null;
      return prisma.kbArticle.create({ data: { ...data, slug, authorId: user.id, isPublished: true } });
    }

    const cHandl = await cat("Handleidingen");
    const cTicket = await cat("Tickets");
    const cAdmin = await cat("Administratie");
    const cAppar = await cat("Apparatuur");

    const results = await Promise.all([
      article({
        title: "Hoe gebruik je ITFlow",
        categoryId: cHandl.id,
        content: `<h2>Welkom bij ITFlow</h2><p>ITFlow is het interne beheerplatform voor ITFin. Hierin beheert u tickets, uren, assets, voorraad en projecten.</p><h2>Navigatie</h2><ul><li><strong>Dashboard</strong> — Overzicht open tickets, uren en recente activiteit</li><li><strong>Tickets</strong> — Alle support- en werktickets</li><li><strong>Bord</strong> — Kanban weergave per status, versleep tickets</li><li><strong>Uren</strong> — Uurregistraties per medewerker en bedrijf</li><li><strong>Bedrijven</strong> — Klantenbeheer</li><li><strong>Contacten</strong> — Contactpersonen per bedrijf</li><li><strong>Assets</strong> — Uitgegeven apparatuur per klant</li><li><strong>Voorraad</strong> — Magazijnbeheer met uitgifte en inname</li><li><strong>Projecten</strong> — Lopende IT-projecten per fase</li><li><strong>Rapportages</strong> — Overzichten, uren en exports</li><li><strong>Kennisbank</strong> — Handleidingen en procedures</li></ul><h2>Mobiel</h2><p>Voeg ITFlow toe aan je beginscherm via Safari (iOS) of Chrome (Android) voor een app-ervaring zonder browser-balk.</p>`,
      }),
      article({
        title: "Nieuw ticket aanmaken",
        categoryId: cTicket.id,
        content: `<h2>Ticket aanmaken</h2><p>Maak een ticket aan voor elke werkzaamheid bij een klant.</p><h3>Stappen</h3><ol><li>Klik op <strong>Nieuw ticket</strong> (rechtsboven of + knop mobiel)</li><li>Kies het <strong>bedrijf</strong> en optioneel de contactpersoon</li><li>Vul een duidelijk <strong>onderwerp</strong> in</li><li>Kies <strong>prioriteit</strong>, <strong>categorie</strong> en <strong>status</strong></li><li>Vul het <strong>IT Snippet</strong> in: uitgevoerde taken, PC-naam, serienummer</li><li>Koppel een <strong>asset</strong> als het om specifieke apparatuur gaat</li><li>Pas de <strong>uren</strong> aan (standaard 1 uur) of zet registratie uit</li></ol><h3>Statusflow</h3><p>Open → In behandeling → Wachtend → Opgelost → Te factureren → Gesloten</p>`,
      }),
      article({
        title: "Ticket statussen uitgelegd",
        categoryId: cTicket.id,
        content: `<h2>Statussen</h2><ul><li><strong>Open</strong> — Nieuw, nog niet opgepakt</li><li><strong>In behandeling</strong> — Actief mee bezig</li><li><strong>Wachtend</strong> — Wacht op klant of onderdeel</li><li><strong>Opgelost</strong> — Klaar, wacht op bevestiging klant</li><li><strong>Te factureren</strong> — Klaar voor facturatie</li><li><strong>Gesloten</strong> — Volledig afgehandeld</li></ul><h2>Status wijzigen</h2><p>Open het ticket en gebruik het dropdown rechtsboven. Wordt automatisch gelogd.</p><h2>Bord (Kanban)</h2><p>Via het Bord sleep je tickets visueel van kolom naar kolom om de status te wijzigen. Maximaal 15 tickets per kolom zichtbaar.</p>`,
      }),
      article({
        title: "Uren registreren",
        categoryId: cAdmin.id,
        content: `<h2>Uren registreren</h2><p>Registreer gewerkte uren per klant, gekoppeld aan een ticket.</p><h3>Via Uren pagina</h3><ol><li>Ga naar <strong>Uren</strong> en klik op <strong>Uren loggen</strong></li><li>Kies bedrijf en optioneel ticket</li><li>Vul <strong>starttijd</strong> in (bijv. 09:00)</li><li>Vul <strong>uren</strong> in (bijv. 1.5 = 1u 30min) — eindtijd berekent automatisch</li><li>Voeg omschrijving toe en klik opslaan</li></ol><h3>Kwartierstappen</h3><ul><li>0.25 = 15 min</li><li>0.5 = 30 min</li><li>0.75 = 45 min</li><li>1.5 = 1 uur 30 min</li></ul><h3>Via ticket</h3><p>Op de detailpagina van een ticket staat onderaan een formulier om direct uren te loggen.</p>`,
      }),
      article({
        title: "Rapportages exporteren",
        categoryId: cAdmin.id,
        content: `<h2>Rapportages</h2><p>Overzicht van uren en tickets per periode, bedrijf en medewerker.</p><h3>Filters</h3><ul><li><strong>Periode</strong> — Van/tot datum</li><li><strong>Bedrijf</strong> — Specifieke klant</li><li><strong>Medewerker</strong> — Specifiek teamlid</li></ul><h3>Exporteren</h3><ul><li><strong>Excel</strong> — .xlsx met tabbladen: samenvatting, tickets, uren, per bedrijf, per medewerker</li><li><strong>PDF</strong> — Overzichtsrapport</li></ul><h3>Overzichten</h3><ul><li>Per bedrijf: tickets, uren, factureerbare uren</li><li>Per medewerker: inzet per teamlid</li><li>Ticketstatus: verdeling open/gesloten</li></ul>`,
      }),
      article({
        title: "Assets beheren",
        categoryId: cAppar.id,
        content: `<h2>Assets</h2><p>Assets zijn alle apparatuur bij klanten in gebruik: laptops, desktops, telefoons, printers, monitoren, netwerk.</p><h3>Asset toevoegen</h3><ol><li>Ga naar <strong>Assets</strong> en klik op <strong>Asset toevoegen</strong></li><li>Kies type, naam, bedrijf en contactpersoon</li></ol><h3>Koppelen aan ticket</h3><p>Bij nieuw ticket of op de detailpagina onder "Gekoppelde assets" — gebruik <strong>Asset koppelen</strong>.</p><h3>Vanuit voorraad</h3><p>Bij uitgifte uit de voorraad wordt automatisch een asset aangemaakt voor die klant.</p>`,
      }),
      article({
        title: "Voorraad beheren",
        categoryId: cAppar.id,
        content: `<h2>Voorraad</h2><p>Overzicht van alle items in het magazijn. Rood = lage voorraad.</p><h3>Uitgifte (naar klant)</h3><ol><li>Klik het <strong>↑↓ icoon</strong> naast het artikel</li><li>Kies <strong>Uitgifte</strong>, kies bedrijf en hoeveelheid</li><li>Er wordt automatisch een asset aangemaakt voor die klant</li></ol><h3>Inname (terug in magazijn)</h3><ol><li>Klik het ↑↓ icoon, kies <strong>Inname</strong></li><li>Voer hoeveelheid in — voorraad wordt verhoogd</li></ol><h3>Hoeveelheid aanpassen</h3><p>Via het potlood-icoon kun je de huidige voorraad direct aanpassen (bijv. na telling).</p><h3>Lage voorraad</h3><p>Gebruik de filter <strong>Lage voorraad</strong> bovenaan voor een snel overzicht van wat bijbesteld moet worden.</p>`,
      }),
    ]);

    const created = results.filter(Boolean).length;
    return NextResponse.json({ success: true, created, skipped: results.length - created });
  } catch (err) {
    if (err instanceof Error && err.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
