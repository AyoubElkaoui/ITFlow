# Maandrapportage per mail (Fedora, systemd --user)

Een `systemd --user` timer die **dagelijks om 20:00** de ITFlow-app aanstoot. De app
verstuurt de maandrapportage **alleen op de laatste dag van de maand** (de 30e/31e/28e/29e)
naar het administratie-adres. De rapportage bevat per klant: gewerkte tickets, dagen,
uren (totaal + factureerbaar) en gekoppelde assets.

Deze bestanden draaien op je Fedora-werkstation, **buiten** de Next.js-deploy — net als
`deploy/dagafsluiting`.

## Werking

- `monthly-report.timer` vuurt elke dag om 20:00.
- `monthly-report.service` draait `monthly-report.sh`.
- Het script doet een `POST` naar `/api/reports/monthly-email` met de cron-secret.
- Zónder `?force=1` verstuurt het endpoint alléén op de laatste dag van de maand; op alle
  andere dagen antwoordt het `{ skipped: true }` en gebeurt er niets.

## Vereisten

- `curl` (standaard aanwezig).
- De app draait met in de app-`.env`:
  - `RESEND_API_KEY` (voor verzending)
  - `REPORT_CRON_SECRET` (gedeeld geheim, zelfde waarde als hieronder)
  - `REPORT_MAIL_TO` (ontvanger; valt terug op `ORDER_MAIL_TO`, standaard `administratie@itfin.nl`)

## Installatie

```bash
# 1. Vanuit deze map (deploy/monthly-report):

# Script naar ~/.local/bin en uitvoerbaar maken
mkdir -p ~/.local/bin
install -m 755 monthly-report.sh ~/.local/bin/monthly-report.sh

# Unit-files naar de --user systemd map
mkdir -p ~/.config/systemd/user
install -m 644 monthly-report.service ~/.config/systemd/user/monthly-report.service
install -m 644 monthly-report.timer   ~/.config/systemd/user/monthly-report.timer

# 2. Config: URL + secret instellen
cat > ~/.config/itflow-monthly-report.env <<'EOF'
ITFLOW_URL=https://itflow.intern
REPORT_CRON_SECRET=zet-hier-hetzelfde-geheim-als-in-de-app-env
EOF
chmod 600 ~/.config/itflow-monthly-report.env

# 3. Timer activeren
systemctl --user daemon-reload
systemctl --user enable --now monthly-report.timer

# 4. Zorg dat user-services blijven draaien als je niet ingelogd bent
sudo loginctl enable-linger "$USER"
```

## Controleren / testen

```bash
# Wanneer vuurt de timer de volgende keer?
systemctl --user list-timers monthly-report.timer

# NU een rapport forceren en versturen (negeert de laatste-dag-check):
~/.local/bin/monthly-report.sh force

# Normale run (verstuurt alleen als vandaag de laatste dag is):
systemctl --user start monthly-report.service

# Logs
journalctl --user -u monthly-report.service -n 50
```

## Aanpassen

- **Ander tijdstip**: pas `OnCalendar=` aan in `monthly-report.timer`, daarna
  `systemctl --user daemon-reload && systemctl --user restart monthly-report.timer`.
- **Andere ontvanger**: `REPORT_MAIL_TO` in de app-`.env` (niet hier).

## Verwijderen

```bash
systemctl --user disable --now monthly-report.timer
rm ~/.config/systemd/user/monthly-report.{service,timer}
rm ~/.local/bin/monthly-report.sh
systemctl --user daemon-reload
```
