// Erzeugt die statische Website in dist/ aus den Daten in data/.
// Aufruf: node build.mjs   (oder: npm run build)

import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, "src");
const DIST = path.join(ROOT, "dist");

// Unterordner, falls die Seite einmal nicht direkt unter der Domain liegt (z. B. BASE_PATH=/test); normalerweise leer
const BASE = (process.env.BASE_PATH ?? "").replace(/\/+$/, "");
const u = (p) => `${BASE}${p}`;

// wird in build() aus site.json gesetzt: true = Suchmaschinen sollen die Seiten nicht aufnehmen
let noindex = false;

const readJson = async (file) => JSON.parse(await readFile(path.join(ROOT, "data", file), "utf8"));

const esc = (value) =>
  String(value).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const themeStyle = (theme) =>
  `--car-bg:${theme.bg};--car-fg:${theme.fg};--car-accent:${theme.accent};--car-muted:${theme.muted}`;

const NEUTRAL_THEME = { bg: "#221F1F", fg: "#FFFFFF", accent: "#FFF200", muted: "#C9C4BE", scheme: "dark" };

// ---------- Bausteine ----------

function layout({ title, description, theme, bodyClass, header = "", main, footer, script = "" }) {
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="${theme.bg}">${noindex ? `\n<meta name="robots" content="noindex">` : ""}
<link rel="preload" href="${u("/assets/fonts/archivo-latin.woff2")}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${u("/assets/styles.css")}">
<link rel="icon" href="${u("/assets/favicon.svg")}" type="image/svg+xml">
<script>document.documentElement.classList.add("js")</script>
</head>
<body class="${bodyClass}" data-scheme="${theme.scheme}" style="${themeStyle(theme)}">
<a class="skip" href="#inhalt">Zum Inhalt springen</a>
${header}<main id="inhalt">
${main}
</main>
${footer}${script}
</body>
</html>
`;
}

const footer = `<footer class="footer">
  <nav class="footer__nav" aria-label="Rechtliches">
    <a href="${u("/impressum/")}">Impressum</a>
    <a href="${u("/datenschutz/")}">Datenschutz</a>
  </nav>
</footer>`;

function modelTitle(car) {
  if (!car.modelAccent) return esc(car.model);
  return esc(car.model).replace(esc(car.modelAccent), `<span class="accent">${esc(car.modelAccent)}</span>`);
}

// ---------- Seiten ----------

function carPage(car) {
  const factCells = car.facts
    .map(
      (f) => `<div class="deckel__cell">
          <dt>${esc(f.label)}</dt>
          <dd><span class="deckel__pre">${esc(f.pre)}</span><span class="deckel__figure"><span class="deckel__value">${esc(f.value)}</span><span class="deckel__unit">${esc(f.unit)}</span></span></dd>
        </div>`,
    )
    .join("\n        ");
  const specRows = car.specs
    .map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`)
    .join("\n      ");
  // car.text enthält bewusst <strong>-Auszeichnungen aus den Kundendaten
  const paragraphs = car.text.map((p) => `<p>${p}</p>`).join("\n    ");
  const closing = car.closing ? `\n    <p class="about__closing">${esc(car.closing)}</p>` : "";

  const main = `<section class="hero" aria-labelledby="modell">
  <div class="hero__text">
    <p class="hero__brand">${esc(car.brand)}</p>
    <h1 id="modell" class="hero__title">${modelTitle(car)}</h1>
    <p class="hero__claim">${esc(car.claim)}</p>
  </div>
</section>

<section class="facts" aria-labelledby="kennzahlen">
  <div class="facts__inner">
    <h2 id="kennzahlen" class="section-title">Auf einen Blick</h2>
    <div class="deckel" data-deckel>
      <p class="deckel__head" aria-hidden="true"><span>${esc(car.model)}</span><span>${esc(car.brand)}</span></p>
      <dl class="deckel__grid">
        ${factCells}
      </dl>
    </div>
  </div>
</section>

<section class="about" aria-labelledby="ueber">
  <h2 id="ueber" class="section-title">Über den ${esc(car.model)}</h2>
  <div class="about__text">
    ${paragraphs}${closing}
  </div>
</section>

<section class="specs" aria-labelledby="daten">
  <h2 id="daten" class="section-title">Technische Daten</h2>
  <dl class="spec-list">
      ${specRows}
  </dl>
  <p class="note">Alle Angaben ohne Gewähr. Werte je nach Version und Ausstattung.</p>
</section>`;

  const landingScript = `
<script>
(function () {
  var card = document.querySelector("[data-deckel]");
  if (!card) return;
  var land = function () { card.classList.add("is-landed"); };
  if (!("IntersectionObserver" in window)) return land();
  var io = new IntersectionObserver(function (entries) {
    if (entries.some(function (e) { return e.isIntersecting; })) { land(); io.disconnect(); }
  }, { threshold: 0.3 });
  io.observe(card);
  setTimeout(land, 4000);
})();
</script>`;

  return layout({
    title: `${car.brand} ${car.model}`,
    description: `${car.brand} ${car.model}: ${car.claim}. Die wichtigsten technischen Daten auf einen Blick.`,
    theme: car.theme,
    bodyClass: "page-car",
    main,
    footer,
    script: landingScript,
  });
}

function legalPage({ title, body }) {
  return layout({
    title,
    description: title,
    theme: NEUTRAL_THEME,
    bodyClass: "page-legal",
    main: `<article class="legal">
  <h1 class="legal__title">${esc(title)}</h1>
  ${body}
</article>`,
    footer,
  });
}

function impressum(site) {
  const o = site.operator;
  return legalPage({
    title: "Impressum",
    body: `<h2>Angaben gemäß § 5 DDG</h2>
  <p>${esc(o.company)}<br>${esc(o.person)}<br>${esc(o.street)}<br>${esc(o.city)}</p>
  <h2>Kontakt</h2>
  <p>Telefon: <a href="tel:${esc(o.phoneHref)}">${esc(o.phone)}</a><br>E-Mail: <a href="mailto:${esc(o.email)}">${esc(o.email)}</a></p>
  <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
  <p>${esc(o.person)}, Anschrift wie oben</p>
  <h2>Hinweis zu den Fahrzeugangaben</h2>
  <p>Alle technischen Daten ohne Gewähr. Werte können je nach Version und Ausstattung abweichen.</p>`,
  });
}

function datenschutz(site) {
  const o = site.operator;
  const h = site.hosting;
  const draft = h
    ? ""
    : `<p class="draft"><strong>Entwurf.</strong> Der Abschnitt zum Hosting wird ergänzt, sobald der Anbieter feststeht. Vor der Veröffentlichung bitte rechtlich prüfen lassen.</p>\n  `;
  const hostingText = h
    ? `<p>Diese Website wird bei ${esc(h.name)}, ${esc(h.address)} („Cloudflare“) bereitgestellt. Beim Aufruf einer Seite übermittelt Ihr Browser automatisch Informationen, die Cloudflare verarbeitet: IP-Adresse, Datum und Uhrzeit des Abrufs, aufgerufene Seite, Browser und Betriebssystem sowie die zuvor besuchte Seite. Cloudflare nutzt diese Daten auch, um die Website vor Angriffen und Missbrauch zu schützen. Die Verarbeitung erfolgt, um die Website sicher und stabil bereitzustellen (Art. 6 Abs. 1 lit. f DSGVO). Die Daten werden nicht mit anderen Daten zusammengeführt.</p>
  <p>Dabei können Daten in die USA übermittelt werden. Cloudflare ist nach dem EU-US Data Privacy Framework zertifiziert, für das ein Angemessenheitsbeschluss der EU-Kommission besteht (Art. 45 DSGVO). Mit Cloudflare besteht ein Vertrag zur Auftragsverarbeitung (Art. 28 DSGVO). Weitere Informationen: <a href="${esc(h.privacyUrl)}">Datenschutzerklärung von Cloudflare</a>.</p>`
    : `<p>Diese Website wird bei <mark>[Hosting-Anbieter mit Anschrift wird ergänzt]</mark> betrieben. Beim Aufruf einer Seite übermittelt Ihr Browser automatisch Informationen, die der Server in Logdateien speichert: IP-Adresse, Datum und Uhrzeit des Abrufs, aufgerufene Seite, Browser und Betriebssystem sowie die zuvor besuchte Seite. Diese Daten werden nur verarbeitet, um die Website sicher und stabil bereitzustellen (Art. 6 Abs. 1 lit. f DSGVO), und nicht mit anderen Daten zusammengeführt.</p>`;
  return legalPage({
    title: "Datenschutz",
    body: `${draft}<h2>Verantwortlicher</h2>
  <p>${esc(o.company)}<br>${esc(o.person)}<br>${esc(o.street)}<br>${esc(o.city)}<br>E-Mail: <a href="mailto:${esc(o.email)}">${esc(o.email)}</a></p>
  <h2>Hosting</h2>
  ${hostingText}
  <h2>Keine Cookies, kein Tracking</h2>
  <p>Diese Website setzt keine Cookies und verwendet keine Analyse- oder Tracking-Dienste. Schriftarten werden vom eigenen Server geladen. Es werden keine Daten an Dritte wie Google übertragen.</p>
  <h2>Ihre Rechte</h2>
  <p>Sie haben das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18) und Widerspruch (Art. 21). Außerdem können Sie sich bei einer Datenschutz-Aufsichtsbehörde beschweren (Art. 77), zum Beispiel beim Hessischen Beauftragten für Datenschutz und Informationsfreiheit.</p>`,
  });
}

// Bewusst ohne Links zu den Fahrzeugen: Die Seiten sollen nur über die QR-Codes erreichbar sein.
// Diese Seite erscheint auch unter der Startadresse /.
function notFound() {
  return legalPage({
    title: "Seite nicht gefunden",
    body: `<p>Unter dieser Adresse gibt es keine Seite. Die Fahrzeugseiten öffnen Sie über den QR-Code auf Ihrem Bierdeckel.</p>`,
  });
}

// ---------- Build ----------

async function write(relPath, content) {
  const file = path.join(DIST, relPath);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content, "utf8");
}

async function build() {
  const site = await readJson("site.json");
  const { cars } = await readJson("fahrzeuge.json");
  noindex = Boolean(site.noindex);

  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });

  const redirects = [];
  for (const car of cars) {
    await write(`${car.slug}/index.html`, carPage(car));
    // 302 statt 301: Browser merken sich 301 dauerhaft, dann ließe sich das Ziel nie mehr ändern
    redirects.push(`/q/${car.qr}  /${car.slug}/  302`);
  }
  await write("impressum/index.html", impressum(site));
  await write("datenschutz/index.html", datenschutz(site));
  await write("404.html", notFound());
  await write("_redirects", redirects.join("\n") + "\n");

  await cp(path.join(SRC, "styles.css"), path.join(DIST, "assets/styles.css"));
  await cp(path.join(SRC, "favicon.svg"), path.join(DIST, "assets/favicon.svg"));
  await cp(path.join(SRC, "fonts"), path.join(DIST, "assets/fonts"), { recursive: true });

  console.log(`Fertig: ${cars.length} Fahrzeugseiten und 3 weitere Seiten in dist/`);
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
