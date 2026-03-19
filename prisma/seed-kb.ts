import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

function createClient() {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;
  if (!dbUrl) throw new Error("DATABASE_URL not set");
  const url = new URL(dbUrl);
  const pool = new Pool({
    host: url.hostname,
    port: Number(url.port) || 5432,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
    ssl: url.searchParams.get("sslmode") === "require" ? { rejectUnauthorized: false } : undefined,
  });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

const prisma = createClient();

async function main() {
  // Get the first admin user to be the author
  const user = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!user) {
    console.error("No admin user found. Create a user first.");
    process.exit(1);
  }

  // Create KB category
  const category = await prisma.kbCategory.upsert({
    where: { slug: "handleidingen" },
    update: {},
    create: {
      name: "Handleidingen",
      slug: "handleidingen",
      icon: "BookOpen",
      sortOrder: 0,
    },
  });

  const articles = [
    {
      title: "Hoe werkt het Voorraadsysteem",
      slug: "hoe-werkt-het-voorraadsysteem",
      content: `# Voorraadsysteem

Het voorraadsysteem houdt al je IT-materialen bij: kabels, adapters, laptops, monitors, netwerkapparatuur en meer.

## Categorieën

Elk voorraaditem heeft een categorie:
- **Kabel** — HDMI, USB, netwerk, stroomkabels
- **Adapter** — USB-C, Dell, HP adapters
- **Toner** — Printer toners
- **Randapparatuur** — Muizen, toetsenborden, headsets
- **Component** — RAM, SSD, harde schijven
- **Gereedschap** — Schroevendraaiers, deursloten
- **Laptop** — Alle laptops op voorraad
- **Desktop** — Desktop computers
- **Printer** — Printers
- **Monitor** — Beeldschermen
- **Telefoon** — Telefoons en smartphones
- **Netwerkapparatuur** — Switches, routers, access points
- **Overig** — Alles wat niet in bovenstaande past

## Voorraad toevoegen

1. Ga naar **Voorraad** in het menu
2. Klik op **Artikel toevoegen**
3. Vul naam, categorie, aantal en locatie in
4. Stel optioneel een **minimum voorraad** in om meldingen te krijgen

## Mutaties (In/Uit/Correctie)

Gebruik mutaties om voorraadwijzigingen bij te houden:

- **Inkomend** — Nieuwe voorraad ontvangen (aantal gaat omhoog)
- **Uitgaand** — Voorraad uitgifte (aantal gaat omlaag)
- **Correctie** — Handmatige aanpassing na telling

Bij elke mutatie kun je optioneel een **bedrijf**, **ticket** of **asset** koppelen. Zo weet je precies waar materiaal naartoe is gegaan.

## Lage voorraad

Als het aantal onder het minimum komt, verschijnt een waarschuwingsteken. Gebruik de filter "Lage voorraad" om snel te zien welke items bijbesteld moeten worden.
`,
    },
    {
      title: "Hoe werken Assets",
      slug: "hoe-werken-assets",
      content: `# Assets

Assets zijn de IT-apparaten die je beheert voor je klanten: laptops, desktops, printers, monitors, telefoons en netwerkapparatuur.

## Asset aanmaken

1. Ga naar **Assets** in het menu
2. Klik op **Asset toevoegen**
3. Selecteer het **bedrijf** waar het asset bij hoort
4. Vul type, merk, model, serienummer en asset tag in
5. Stel de **status** in

## Statussen

- **Uitgegeven** — In gebruik bij de klant
- **Op voorraad** — In het magazijn
- **In reparatie** — Momenteel in reparatie
- **Afgevoerd** — Niet meer in gebruik

## Assets koppelen aan tickets

Wanneer je aan een ticket werkt dat betrekking heeft op een specifiek apparaat:
1. Open het ticket
2. Ga naar **Gekoppelde assets**
3. Klik op **Asset koppelen** en zoek het juiste asset
4. Voeg optioneel een notitie toe

## Voorraadkoppeling

Via het voorraadsysteem kun je bij een **mutatie** (bijv. uitgaand) ook een asset selecteren. Zo kun je bijhouden welke kabels, adapters of andere materialen bij een specifiek asset zijn gebruikt.
`,
    },
    {
      title: "Hoe werken Bedrijven en Contacten",
      slug: "hoe-werken-bedrijven-en-contacten",
      content: `# Bedrijven en Contacten

## Bedrijven

Bedrijven zijn je klanten. Elk bedrijf heeft:
- **Naam** en **korte naam** (bijv. "ZVOS")
- Adres, telefoon, e-mail, website
- Contactpersoon
- Uurtarief (optioneel)
- Notities

### Bedrijf aanmaken
1. Ga naar **Bedrijven** in het menu
2. Klik op **Bedrijf toevoegen**
3. Vul de gegevens in

### Bedrijf verwijderen
1. Open het bedrijf
2. Klik op het **prullenbak icoon** (rood)
3. Bevestig de verwijdering

**Let op:** Bij het verwijderen van een bedrijf worden ook alle gerelateerde tickets, contacten, uurregistraties en assets verwijderd!

## Contacten

Contacten zijn de mensen bij je klanten. Elk contact hoort bij een bedrijf.

### Contact aanmaken
1. Ga naar **Contacten** in het menu
2. Klik op **Contact toevoegen**
3. Selecteer het bedrijf en vul naam, e-mail, telefoon en functie in
4. Markeer optioneel als **primair contact**

### Portaal toegang
Contacten kunnen toegang krijgen tot het klantenportaal:
1. Open een contact
2. Klik op het slotje icoon
3. Schakel portaal toegang in
4. Het contact kan nu zelf tickets inzien en aanmaken
`,
    },
    {
      title: "Hoe werkt het Ticketsysteem",
      slug: "hoe-werkt-het-ticketsysteem",
      content: `# Ticketsysteem

Tickets zijn de kern van ITFlow. Gebruik ze om ondersteuningsverzoeken, storingen en taken bij te houden.

## Ticket aanmaken

1. Klik op **Nieuw ticket** (dashboard of ticketoverzicht)
2. Selecteer **bedrijf** en optioneel een **contactpersoon**
3. Vul het onderwerp en een beschrijving in
4. Stel prioriteit en categorie in
5. Vul optioneel het **IT Snippet** in (PC-naam, serienummer, etc.)

## Statussen

- **Open** — Nieuw ticket
- **In behandeling** — Wordt aan gewerkt
- **Wachtend** — Wacht op reactie klant
- **Opgelost** — Probleem is verholpen
- **Gesloten** — Ticket is afgesloten
- **Te factureren** — Klaar voor facturatie

## Bordweergave

Gebruik het **Bord** voor een visuele Kanban-weergave. Sleep tickets tussen kolommen om de status te wijzigen.

## Uren loggen

Bij elk ticket kun je uren registreren:
1. Open het ticket
2. Klik op **Uren loggen**
3. Vul datum, uren en beschrijving in

## SLA

Als er SLA-beleid is ingesteld, zie je bij elk ticket de respons- en oplostijden. Gele waarschuwingen betekenen risico, rode betekenen overschrijding.
`,
    },
    {
      title: "Hoe werken Uren en Rapportages",
      slug: "hoe-werken-uren-en-rapportages",
      content: `# Uren en Rapportages

## Uren registreren

Er zijn meerdere manieren om uren te loggen:

### Via het urenoverzicht
1. Ga naar **Uren** in het menu
2. Klik op **Uren loggen**
3. Selecteer bedrijf, optioneel een ticket
4. Vul datum, uren en beschrijving in

### Via een ticket
1. Open het ticket
2. Klik op **Uren loggen**

### Via de timer
1. Klik op het timer-icoon (rechtsboven)
2. Selecteer bedrijf en start de timer
3. Stop de timer wanneer je klaar bent — de uren worden automatisch opgeslagen

## Rapportages

Ga naar **Rapportages** voor overzichten:

- **Totaal tickets** — Hoeveel tickets in de periode
- **Totaal uren** — Gewerkte uren
- **Uren per bedrijf** — Grafiek met verdeling
- **Ticketstatus verdeling** — Grafiek met statussen
- **Overzicht per bedrijf** — Tabel met details

### Filteren
- Selecteer een datumbereik
- Filter op bedrijf of medewerker

### Exporteren
Gebruik de **Excel** of **PDF** knop om rapportages te exporteren.
`,
    },
  ];

  for (const article of articles) {
    await prisma.kbArticle.upsert({
      where: { slug: article.slug },
      update: {
        title: article.title,
        content: article.content,
        categoryId: category.id,
        isPublished: true,
      },
      create: {
        title: article.title,
        slug: article.slug,
        content: article.content,
        categoryId: category.id,
        authorId: user.id,
        isPublished: true,
      },
    });
    console.log(`✓ ${article.title}`);
  }

  console.log("\nKennisbank artikelen aangemaakt!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
