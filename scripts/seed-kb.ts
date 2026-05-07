/**
 * Seed kennisbank met handleidingen per pagina.
 * Bestaande artikelen worden NIET aangeraakt.
 * Run: npx tsx scripts/seed-kb.ts
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require("../src/generated/prisma");

const prisma = new PrismaClient();

async function main() {
  // Haal de eerste admin user op
  const user = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!user) throw new Error("Geen admin gebruiker gevonden");

  // Maak categorieën aan (of gebruik bestaande)
  async function getOrCreateCategory(name: string) {
    const existing = await prisma.kbCategory.findFirst({ where: { name } });
    if (existing) return existing;
    return prisma.kbCategory.create({
      data: { name, slug: name.toLowerCase().replace(/\s+/g, "-"), sortOrder: 0 },
    });
  }

  const catHandleidingen = await getOrCreateCategory("Handleidingen");
  const catTickets = await getOrCreateCategory("Tickets");
  const catAdministratie = await getOrCreateCategory("Administratie");
  const catApparatuur = await getOrCreateCategory("Apparatuur");

  // Helper: maak artikel aan als het nog niet bestaat op basis van slug
  async function createArticle(data: {
    title: string;
    content: string;
    categoryId: string;
    isPublished?: boolean;
  }) {
    const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const existing = await prisma.kbArticle.findUnique({ where: { slug } });
    if (existing) {
      console.log(`  ⏭ Overgeslagen (bestaat al): ${data.title}`);
      return;
    }
    await prisma.kbArticle.create({
      data: { ...data, slug, authorId: user.id, isPublished: data.isPublished ?? true },
    });
    console.log(`  ✅ Aangemaakt: ${data.title}`);
  }

  console.log("\n📚 Kennisbank artikelen aanmaken...\n");

  // ── HANDLEIDINGEN ─────────────────────────────────────────────────────────
  await createArticle({
    title: "Hoe gebruik je ITFlow",
    categoryId: catHandleidingen.id,
    content: `<h2>Welkom bij ITFlow</h2>
<p>ITFlow is het interne beheerplatform van ITFin. Hierin beheert u tickets, uren, assets, voorraad en projecten.</p>

<h2>Navigatie</h2>
<p>Via de linkerzijbalk navigeer je naar de verschillende onderdelen:</p>
<ul>
<li><strong>Dashboard</strong> — Overzicht van open tickets, gelogde uren en recente activiteit</li>
<li><strong>Tickets</strong> — Alle support- en werktickets</li>
<li><strong>Bord</strong> — Kanban weergave van tickets per status</li>
<li><strong>Uren</strong> — Uurregistraties per medewerker en bedrijf</li>
<li><strong>Bedrijven</strong> — Klantenbeheer</li>
<li><strong>Contacten</strong> — Contactpersonen per bedrijf</li>
<li><strong>Assets</strong> — Uitgegeven apparatuur</li>
<li><strong>Voorraad</strong> — Magazijnbeheer</li>
<li><strong>Projecten</strong> — Lopende IT-projecten</li>
<li><strong>Rapportages</strong> — Overzichten en exports</li>
<li><strong>Kennisbank</strong> — Handleidingen en procedures (dit onderdeel)</li>
</ul>

<h2>Mobiel gebruik</h2>
<p>ITFlow is ook beschikbaar als app op je telefoon. Voeg de website toe aan je beginscherm via Safari (iOS) of Chrome (Android) voor een volledige app-ervaring.</p>`,
  });

  // ── TICKETS ───────────────────────────────────────────────────────────────
  await createArticle({
    title: "Nieuw ticket aanmaken",
    categoryId: catTickets.id,
    content: `<h2>Ticket aanmaken</h2>
<p>Een ticket maak je aan voor elke werkzaamheid bij een klant — van kleine vragen tot grote installaties.</p>

<h3>Stap 1: Klik op "Nieuw ticket"</h3>
<p>Via de knop rechtsboven op de Tickets pagina, of via het + knopje in de mobiele navigatiebalk onderaan.</p>

<h3>Stap 2: Vul de basisgegevens in</h3>
<ul>
<li><strong>Bedrijf</strong> — Kies de klant (verplicht)</li>
<li><strong>Contact</strong> — Kies de contactpersoon (optioneel)</li>
<li><strong>Onderwerp</strong> — Korte beschrijving van het probleem</li>
<li><strong>Omschrijving</strong> — Uitgebreide toelichting</li>
</ul>

<h3>Stap 3: Classificatie</h3>
<ul>
<li><strong>Prioriteit</strong> — Laag / Normaal / Hoog / Urgent</li>
<li><strong>Categorie</strong> — Hardware / Software / Netwerk / Account / Overig</li>
<li><strong>Status</strong> — Standaard: Open</li>
</ul>

<h3>Stap 4: IT Snippet (optioneel)</h3>
<p>Vul hier technische details in: uitgevoerde taken, PC-naam, serienummer, Office-licentie, openstaande taken en meegenomen apparatuur.</p>

<h3>Stap 5: Uren registreren</h3>
<p>Standaard wordt 1 uur geregistreerd bij aanmaken. Pas dit aan of zet het uit als je nog geen uren wil loggen.</p>

<h3>Statusflow</h3>
<p><strong>Open</strong> → <strong>In behandeling</strong> → <strong>Wachtend</strong> → <strong>Opgelost</strong> → <strong>Te factureren</strong> → <strong>Gesloten</strong></p>`,
  });

  await createArticle({
    title: "Ticket statussen uitgelegd",
    categoryId: catTickets.id,
    content: `<h2>Ticket statussen</h2>
<p>Elke ticket heeft een status die aangeeft in welke fase het werk zich bevindt.</p>

<ul>
<li><strong>Open</strong> — Nieuw ticket, nog niet opgepakt</li>
<li><strong>In behandeling</strong> — Medewerker is actief bezig</li>
<li><strong>Wachtend</strong> — Wacht op reactie klant of onderdeel</li>
<li><strong>Opgelost</strong> — Probleem is opgelost, klant moet bevestigen</li>
<li><strong>Te factureren</strong> — Klaar voor facturatie aan klant</li>
<li><strong>Gesloten</strong> — Ticket volledig afgehandeld</li>
</ul>

<h2>Status wijzigen</h2>
<p>Open het ticket en gebruik het dropdown-menu rechtsboven om de status te wijzigen. Dit wordt automatisch opgeslagen en gelogd.</p>

<h2>Bord (Kanban)</h2>
<p>Via het Bord kun je tickets visueel per status beheren. Sleep een ticket van de ene kolom naar de andere om de status te wijzigen.</p>`,
  });

  // ── ADMINISTRATIE ─────────────────────────────────────────────────────────
  await createArticle({
    title: "Uren registreren",
    categoryId: catAdministratie.id,
    content: `<h2>Uren registreren</h2>
<p>Registreer je gewerkte uren per klant en koppel ze optioneel aan een ticket.</p>

<h3>Via de Uren pagina</h3>
<ol>
<li>Ga naar <strong>Uren</strong> in de navigatie</li>
<li>Klik op <strong>Uren loggen</strong></li>
<li>Kies een bedrijf en optioneel een ticket</li>
<li>Vul de <strong>starttijd</strong> in (bijv. 09:00)</li>
<li>Vul het <strong>aantal uren</strong> in (bijv. 1.5 = 1 uur 30 min)</li>
<li>De <strong>eindtijd</strong> wordt automatisch berekend</li>
<li>Voeg een omschrijving toe en klik op <strong>Alles opslaan</strong></li>
</ol>

<h3>Via een ticket</h3>
<p>Op de detailpagina van een ticket kun je direct uren loggen via het formulier onderaan bij "Uurregistraties".</p>

<h3>Kwartierstappen</h3>
<p>Uren worden geregistreerd in stappen van 15 minuten (0.25 uur). Voorbeelden:</p>
<ul>
<li>0.25 = 15 minuten</li>
<li>0.5 = 30 minuten</li>
<li>0.75 = 45 minuten</li>
<li>1.5 = 1 uur 30 minuten</li>
</ul>`,
  });

  await createArticle({
    title: "Rapportages maken en exporteren",
    categoryId: catAdministratie.id,
    content: `<h2>Rapportages</h2>
<p>Onder Rapportages vind je een overzicht van alle geregistreerde uren en tickets per periode.</p>

<h3>Filters</h3>
<ul>
<li><strong>Periode</strong> — Kies van- en tot-datum</li>
<li><strong>Bedrijf</strong> — Filter op specifieke klant</li>
<li><strong>Medewerker</strong> — Filter op specifieke medewerker</li>
</ul>

<h3>Exporteren</h3>
<ul>
<li><strong>Excel</strong> — Exporteert alle data naar een .xlsx bestand met meerdere tabbladen: samenvatting, tickets, uurregistraties, per bedrijf, per medewerker</li>
<li><strong>PDF</strong> — Exporteert een overzichtsrapport als PDF</li>
</ul>

<h3>Overzichten</h3>
<ul>
<li><strong>Per bedrijf</strong> — Tickets, uren en factureerbare uren per klant</li>
<li><strong>Per medewerker</strong> — Inzet per teamlid</li>
<li><strong>Ticketstatus</strong> — Verdeling van open/gesloten tickets</li>
</ul>`,
  });

  // ── APPARATUUR ────────────────────────────────────────────────────────────
  await createArticle({
    title: "Assets beheren",
    categoryId: catApparatuur.id,
    content: `<h2>Assets (Apparatuur)</h2>
<p>Onder Assets beheer je alle apparatuur die bij klanten in gebruik is: laptops, desktops, telefoons, printers, monitoren en netwerkapparatuur.</p>

<h3>Asset aanmaken</h3>
<ol>
<li>Ga naar <strong>Assets</strong></li>
<li>Klik op <strong>Asset toevoegen</strong></li>
<li>Kies type, naam, bedrijf en contactpersoon</li>
</ol>

<h3>Asset koppelen aan ticket</h3>
<p>Bij het aanmaken van een ticket kun je direct een asset koppelen. De asset wordt dan zichtbaar op de ticket detailpagina onder "Gekoppelde assets".</p>

<h3>Vanuit voorraad</h3>
<p>Wanneer je een artikel uit de voorraad uitgeeft (uitgifte), wordt er automatisch een asset aangemaakt voor de klant.</p>`,
  });

  await createArticle({
    title: "Voorraad beheren",
    categoryId: catApparatuur.id,
    content: `<h2>Voorraad</h2>
<p>De voorraadpagina geeft inzicht in alle items in het magazijn: kabels, adapters, toners, randapparatuur, laptops, etc.</p>

<h3>Artikel toevoegen</h3>
<ol>
<li>Ga naar <strong>Voorraad</strong></li>
<li>Klik op <strong>Artikel toevoegen</strong></li>
<li>Vul naam, categorie, huidige voorraad en minimumvoorraad in</li>
</ol>

<h3>Uitgifte (item gaat naar klant)</h3>
<ol>
<li>Klik op het <strong>↑↓ icoon</strong> naast het artikel</li>
<li>Kies het tabblad <strong>Uitgifte</strong></li>
<li>Kies het bedrijf en de contactpersoon</li>
<li>Voer de hoeveelheid in en klik Opslaan</li>
<li>Er wordt automatisch een asset aangemaakt voor die klant</li>
</ol>

<h3>Inname (item komt terug)</h3>
<ol>
<li>Klik op het ↑↓ icoon</li>
<li>Kies tabblad <strong>Inname</strong></li>
<li>Vul de hoeveelheid in — de voorraad wordt verhoogd</li>
</ol>

<h3>Lage voorraad</h3>
<p>Items worden rood gemarkeerd wanneer de huidige voorraad gelijk of lager is dan de minimumvoorraad. Gebruik de filter <strong>Lage voorraad</strong> voor een snel overzicht.</p>`,
  });

  console.log("\n✅ Klaar!\n");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
