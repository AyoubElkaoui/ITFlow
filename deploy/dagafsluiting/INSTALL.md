# Dagafsluiting-herinnering (Fedora, systemd --user)

Een `systemd --user` timer die op **werkdagen om 17:00** een desktop-notificatie
stuurt. Klik je op **Openen**, dan opent de ITFlow dagafsluiting-pagina in je
browser. `Persistent=true` zorgt dat de herinnering alsnog komt als je machine om
17:00 uit stond.

Deze bestanden staan bewust **buiten de app** — ze draaien op je Fedora-werkstation,
niet in de Next.js-deploy.

## Bestanden

| Bestand                     | Doel                                              |
| --------------------------- | ------------------------------------------------- |
| `dagafsluiting-notify.sh`   | Stuurt de notificatie en opent de pagina bij klik |
| `dagafsluiting.service`     | Oneshot service die het script draait             |
| `dagafsluiting.timer`       | Triggert de service Mon..Fri om 17:00             |

## Vereisten

- `libnotify` **0.8+** (voor `notify-send --action`); klikbare actie.
  Check: `notify-send --version`
- `xdg-utils` (`xdg-open`) om de browser te openen.

```bash
sudo dnf install libnotify xdg-utils
```

## Installatie

```bash
# 1. Vanuit deze map (deploy/dagafsluiting):

# Script naar ~/.local/bin en uitvoerbaar maken
mkdir -p ~/.local/bin
install -m 755 dagafsluiting-notify.sh ~/.local/bin/dagafsluiting-notify.sh

# Unit-files naar de --user systemd map
mkdir -p ~/.config/systemd/user
install -m 644 dagafsluiting.service ~/.config/systemd/user/dagafsluiting.service
install -m 644 dagafsluiting.timer   ~/.config/systemd/user/dagafsluiting.timer

# 2. (optioneel) URL instellen als ITFlow niet op localhost:3000 draait:
echo 'ITFLOW_URL=https://itflow.intern/nl/dagafsluiting' > ~/.config/itflow-dagafsluiting.env

# 3. Timer activeren
systemctl --user daemon-reload
systemctl --user enable --now dagafsluiting.timer

# 4. Zorg dat user-services blijven draaien als je niet ingelogd bent
#    (anders draait de --user manager alleen tijdens een actieve sessie):
sudo loginctl enable-linger "$USER"
```

## Controleren

```bash
# Wanneer vuurt de timer de volgende keer?
systemctl --user list-timers dagafsluiting.timer

# Notificatie meteen testen (zonder te wachten tot 17:00):
systemctl --user start dagafsluiting.service

# Of het script direct:
~/.local/bin/dagafsluiting-notify.sh

# Logs bekijken
journalctl --user -u dagafsluiting.service -n 50
```

## Aanpassen

- **Ander tijdstip / andere dagen**: pas `OnCalendar=` aan in `dagafsluiting.timer`,
  daarna `systemctl --user daemon-reload && systemctl --user restart dagafsluiting.timer`.
  Bv. `OnCalendar=Mon..Fri 16:30`.
- **Andere URL**: zet `ITFLOW_URL` in `~/.config/itflow-dagafsluiting.env`.

## Verwijderen

```bash
systemctl --user disable --now dagafsluiting.timer
rm ~/.config/systemd/user/dagafsluiting.{service,timer}
rm ~/.local/bin/dagafsluiting-notify.sh
systemctl --user daemon-reload
```
