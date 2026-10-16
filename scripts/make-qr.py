"""Erzeugt die QR-Codes für die Bierdeckel (ein Code pro Fahrzeug).

Jeder Code zeigt auf den Kurzlink <domain>/q/<qr> aus data/site.json und data/fahrzeuge.json.
Ausgabe in qr-codes/: SVG und PDF (Vektor, für den Druck) sowie PNG (zur Ansicht).

Aufruf (im Projektordner):  python scripts/make-qr.py
Benötigt:                   pip install segno
"""
import json
from pathlib import Path

import segno

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "qr-codes"
OUT.mkdir(exist_ok=True)

site = json.loads((ROOT / "data" / "site.json").read_text(encoding="utf-8"))
cars = json.loads((ROOT / "data" / "fahrzeuge.json").read_text(encoding="utf-8"))["cars"]
domain = site["domain"].rstrip("/")

for car in cars:
    url = f"{domain}/q/{car['qr']}"
    # Fehlerkorrektur "Q": bleibt lesbar, auch wenn ca. 25 % verdeckt sind (Bierflecken, Knicke)
    qr = segno.make(url, error="q", micro=False)
    name = car["slug"]
    qr.save(OUT / f"{name}.svg", scale=10, border=4, dark="#000000", light="#ffffff")
    qr.save(OUT / f"{name}.pdf", scale=10, border=4, dark="#000000", light="#ffffff")
    qr.save(OUT / f"{name}.png", scale=30, border=4, dark="#000000", light="#ffffff")
    print(f"{name}: {url}  (Version {qr.version}, {qr.symbol_size(border=0)[0]} x {qr.symbol_size(border=0)[0]} Module)")
