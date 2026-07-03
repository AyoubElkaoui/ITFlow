#!/usr/bin/env bash
#
# Triggert de ITFlow maandrapportage per mail. Bedoeld om dagelijks door de systemd
# --user timer (monthly-report.timer) aangeroepen te worden; het endpoint verstuurt
# ZELF alleen op de laatste dag van de maand (zonder ?force=1).
#
# Config via omgevingsvariabelen of ~/.config/itflow-monthly-report.env (KEY=VALUE):
#   ITFLOW_URL           Basis-URL van de app        (default http://localhost:3000)
#   REPORT_CRON_SECRET   Zelfde waarde als in de app-.env (verplicht)

set -euo pipefail

CONFIG="${XDG_CONFIG_HOME:-$HOME/.config}/itflow-monthly-report.env"
if [ -f "$CONFIG" ]; then
  # shellcheck disable=SC1090
  . "$CONFIG"
fi

URL="${ITFLOW_URL:-http://localhost:3000}"
SECRET="${REPORT_CRON_SECRET:-}"

if [ -z "$SECRET" ]; then
  echo "REPORT_CRON_SECRET ontbreekt (zet 'm in $CONFIG)" >&2
  exit 1
fi

# ?force=1 kan handmatig worden meegegeven als eerste argument om NU te testen:
#   ~/.local/bin/monthly-report.sh force
QUERY=""
if [ "${1:-}" = "force" ]; then
  QUERY="?force=1"
fi

curl -fsS -X POST "${URL}/api/reports/monthly-email${QUERY}" \
  -H "x-cron-secret: ${SECRET}" \
  && echo   # nieuwe regel na de JSON-respons
