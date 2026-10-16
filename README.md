# Bierdeckel-Website

Statische Fahrzeugseiten, die über die QR-Codes auf den Bierdeckeln von Studio Wanderer aufgerufen werden.
Eine Seite pro Fahrzeug, nur mit den Fahrzeuginformationen (ohne Bilder).
Planung und Entscheidungen stehen in `PLANUNG.md` (nur lokal, nicht im Repository).

## Veröffentlichung

Jede Änderung auf dem Branch `main` wird automatisch gebaut und auf GitHub Pages veröffentlicht
(`.github/workflows/pages.yml`). Solange `"noindex": true` in `data/site.json` steht, tauchen die Seiten nicht in Suchmaschinen auf.

## Ordner

| Ordner/Datei | Inhalt |
|---|---|
| `data/fahrzeuge.json` | die Fahrzeuge: Texte, Kennzahlen, technische Daten, Farben, QR-Kürzel |
| `data/site.json` | Domain, Betreiber (Impressum), Hosting (Datenschutz), Suchmaschinen-Sperre |
| `src/styles.css` | Gestaltung aller Seiten |
| `src/fonts/` | Schrift Archivo (selbst gehostet, Lizenz OFL) |
| `build.mjs` | erzeugt die fertige Website |
| `dist/` | **die fertige Website**: Dieser Ordner wird beim Hosting ausgeliefert |

## Befehle

```bash
npm run build      # Website neu erzeugen (dist/)
npm run preview    # Vorschau unter http://localhost:4173/id-polo/
```

Benötigt nur Node.js.

## Seiten

| Adresse | Inhalt |
|---|---|
| `/id-polo/` | VW ID. Polo |
| `/a2-e-tron/` | Audi A2 e-tron |
| `/enyaq/` | Škoda Enyaq |
| `/impressum/`, `/datenschutz/` | Rechtliches (Betreiber: Studio Wanderer) |

Alle anderen Adressen (auch die Startseite `/`) zeigen eine kurze „Seite nicht gefunden“-Seite mit Links zu den drei Fahrzeugen.

## QR-Codes

Jeder Bierdeckel bekommt einen Kurzlink, der auf die Fahrzeugseite weiterleitet (Datei `dist/_redirects`, funktioniert bei Cloudflare, nicht bei GitHub Pages):

| Kurzlink | Ziel |
|---|---|
| `/q/polo` | `/id-polo/` |
| `/q/a2` | `/a2-e-tron/` |
| `/q/enyaq` | `/enyaq/` |

Die fertigen QR-Codes liegen in `qr-codes/` (SVG und PDF für den Druck, PNG zur Ansicht). Sie zeigen auf `https://studiowanderer.com/q/…`
(Domain in `data/site.json`). Neu erzeugen mit `pip install segno` und `python scripts/make-qr.py`.
**Vor dem Druck jeden Code mit dem Handy testen**, sobald die Domain läuft.

Weiterleitungen sind bewusst `302` (vorübergehend), damit sich das Ziel später noch ändern lässt.

## Neues Fahrzeug anlegen

1. In `data/fahrzeuge.json` einen Eintrag kopieren und `slug`, `qr`, Texte, Kennzahlen (`facts`), technische Daten (`specs`) und Farben (`theme`) anpassen.
2. `npm run build`.
