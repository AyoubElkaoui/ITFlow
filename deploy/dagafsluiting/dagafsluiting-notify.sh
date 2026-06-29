#!/usr/bin/env bash
#
# Stuurt een desktop-notificatie die bij klik de ITFlow dagafsluiting-pagina opent.
# Bedoeld om door de systemd --user service (dagafsluiting.service) aangeroepen te
# worden op werkdagen om 17:00.
#
# URL is configureerbaar via de omgevingsvariabele ITFLOW_URL, of via het bestand
# ~/.config/itflow-dagafsluiting.env (KEY=VALUE). Default = lokale dev-server.

set -euo pipefail

# Optionele config inladen (bv. ITFLOW_URL=https://itflow.intern/nl/dagafsluiting)
CONFIG="${XDG_CONFIG_HOME:-$HOME/.config}/itflow-dagafsluiting.env"
if [ -f "$CONFIG" ]; then
  # shellcheck disable=SC1090
  . "$CONFIG"
fi

URL="${ITFLOW_URL:-http://localhost:3000/nl/dagafsluiting}"

# notify-send 0.8+ ondersteunt --action; de gekozen action-key wordt op stdout
# geprint zodra de gebruiker erop klikt (notify-send blokkeert tot dan).
ACTION="$(notify-send \
  --app-name="ITFlow" \
  --icon="appointment-soon" \
  --urgency=normal \
  --action=open="Openen" \
  "Dagafsluiting" \
  "Tijd om je dag af te sluiten en je uren naar Clockwise te plakken." \
  2>/dev/null || true)"

if [ "$ACTION" = "open" ]; then
  xdg-open "$URL" >/dev/null 2>&1 || true
fi
