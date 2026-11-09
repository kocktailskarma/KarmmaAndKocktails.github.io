// Prerender every route to real static HTML (SEO-PLAN S-08).
//
//   node tools/prerender.mjs            write <route>/index.html, 404.html, sitemap.xml
//   node tools/prerender.mjs --check    write nothing; exit 1 if any generated file is stale
//
// Run from karmma-website/frontend. Needs Node 20 or newer, no packages, no browser, no
// network: it imports the same page builders the live app uses (src/pages.js) with a
// plain-string context, so the static HTML is exactly what the app renders in a browser.
// Re-run it after editing anything in src/, assets/og or the menu data.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");
// Line endings never matter: Windows checkouts (core.autocrlf) and GitHub (LF) must give the same result.
const normalize = (text) => text.replace(/\r\n/g, "\n");
const read = (file) => normalize(readFileSync(join(ROOT, file), "utf8"));

const { site, locations, bySlug } = await import("../src/site-data.js");
const { menus } = await import("../src/menu-data.js");
const { routes, notFoundRoute, happyHourDescription } = await import("../src/seo-routes.js");
const { renderRoute } = await import("../src/pages.js");
const { jsonLdFor } = await import("../src/jsonld.js");
const { esc, hashString } = await import("../src/util.js");

const errors = [];
const fail = (message) => errors.push(message);

// ---- cache-busting version: hash of everything the browser loads from src/ ---------------
const srcFiles = readdirSync(join(ROOT, "src")).filter((name) => /\.(js|css)$/.test(name)).sort();
const version = createHash("sha1").update(srcFiles.map((name) => read(`src/${name}`)).join("\n")).digest("hex").slice(0, 8);
// Every module is fetched as /src/<name>.js?v=<version> through an import map, so a cached old module can never mix with a new app.js.
const moduleFiles = srcFiles.filter((name) => name.endsWith(".js"));
const importMap = { imports: Object.fromEntries(moduleFiles.map((name) => [`/src/${name}`, `/src/${name}?v=${version}`])) };

// ---- one page ------------------------------------------------------------------------------
const appUrl = (path) => (!path || path.startsWith("#") || /^(https?:|mailto:|tel:)/.test(path) ? path : `/${path.replace(/^\/+/, "")}`);
const assetUrl = (path) => new URL(path.replace(/^\/+/, ""), "http://localhost/").pathname;

function head(route, path, isNotFound) {
  const canonical = isNotFound ? "" : `${site.url}${route.canonical || path}`;
  const image = route.og ? `${site.url}/assets/og/${route.og}` : "";
  const data = isNotFound ? null : jsonLdFor(path);
  const lines = [
    `<meta charset="UTF-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<title>${esc(route.title)}</title>`,
    `<meta name="description" content="${esc(route.description)}">`,
    !isNotFound && `<meta name="keywords" content="${esc([...site.alternateNames, "Nepali restaurant Grapevine TX", "Indian restaurant Dallas TX", "momos", "Nepali thali", "cocktail bar Grapevine", "Trinity Groves restaurant"].join(", "))}">`,
    canonical && `<link rel="canonical" href="${canonical}">`,
    `<meta name="robots" content="${route.robots || "index, follow, max-image-preview:large"}">`,
    `<meta name="theme-color" content="#470e20">`,
    path === "/" && `<meta name="google-site-verification" content="${site.googleSiteVerification}">`,
    `<meta property="og:site_name" content="${esc(site.fullName)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:locale" content="en_US">`,
    `<meta property="og:title" content="${esc(route.title)}">`,
    `<meta property="og:description" content="${esc(route.description)}">`,
    canonical && `<meta property="og:url" content="${canonical}">`,
    image && `<meta property="og:image" content="${image}">`,
    image && `<meta property="og:image:width" content="1200">`,
    image && `<meta property="og:image:height" content="630">`,
    image && `<meta property="og:image:alt" content="${esc(route.ogAlt)}">`,
    `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">`,
    `<meta name="twitter:title" content="${esc(route.title)}">`,
    `<meta name="twitter:description" content="${esc(route.description)}">`,
    image && `<meta name="twitter:image" content="${image}">`,
    image && `<meta name="twitter:image:alt" content="${esc(route.ogAlt)}">`,
    `<link rel="icon" href="/favicon.ico" sizes="48x48">`,
    `<link rel="icon" type="image/png" href="/assets/brand/favicon-192.png" sizes="192x192">`,
    `<link rel="apple-touch-icon" href="/assets/brand/apple-touch-icon-180.png">`,
    `<link rel="preload" href="/assets/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>`,
    `<link rel="preload" href="/assets/fonts/cinzel.woff2" as="font" type="font/woff2" crossorigin>`,
    path === "/" && `<link rel="preload" href="/assets/restaurant/hero-bar.webp" as="image" type="image/webp" fetchpriority="high">`,
    `<link rel="stylesheet" href="/src/styles.css?v=${version}">`,
    `<script type="importmap">${JSON.stringify(importMap)}</script>`,
    ...["app", "pages", "menu", "menu-data", "site-data"].map((name) => `<link rel="modulepreload" href="/src/${name}.js?v=${version}">`),
    `<noscript><style>.reveal{opacity:1!important;transform:none!important}.menu-type[hidden]{display:block}</style></noscript>`,
    data && `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`,
    `<script async src="https://www.googletagmanager.com/gtag/js?id=${site.gaId}"></script>`,
    `<script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      // No analytics hits from local previews or LAN test copies.
      window['ga-disable-${site.gaId}'] = /^(localhost|127\\.|10\\.|192\\.168\\.)/.test(location.hostname);
      gtag('js', new Date());
      gtag('config', '${site.gaId}');
      // Click events (SEO-PLAN 6.1): any link with data-track="order_click|reserve_click|directions_click|call_click|menu_pdf_download|menu_print|social_click".
      document.addEventListener('click', function (e) {
        var a = e.target.closest('a[data-track],button[data-track]');
        if (!a) return;
        gtag('event', a.dataset.track, { location: a.dataset.location || '', placement: a.dataset.placement || '', intent: a.dataset.intent || '', platform: a.dataset.platform || '', link_url: a.href || '', transport_type: 'beacon' });
      }, true);
    </script>`,
  ].filter(Boolean);
  return lines.join("\n    ");
}

function page(route, path, isNotFound = false) {
  const { html } = renderRoute({ path: isNotFound ? "/404.html" : path, query: new URLSearchParams(), appUrl, assetUrl });
  const hash = hashString(html);
  const doc = `<!doctype html>
<html lang="en">
  <head>
    ${head(route, path, isNotFound)}
  </head>
  <body>
    <div id="app" data-prerendered="${isNotFound ? "/404.html" : path}" data-hash="${hash}">${html}</div>
    <script type="module" src="/src/app.js?v=${version}"></script>
  </body>
</html>
`;
  return { doc, html };
}

// ---- generate ----------------------------------------------------------------------------
const outputs = new Map(); // relative file -> contents
const pages = [];
for (const route of routes) {
  const { doc, html } = page(route, route.path);
  const file = route.path === "/" ? "index.html" : `${route.path.slice(1)}index.html`;
  outputs.set(file, doc);
  pages.push({ route, file, doc, html });
}
{
  const { doc, html } = page(notFoundRoute, "/404.html", true);
  outputs.set("404.html", doc);
  pages.push({ route: notFoundRoute, file: "404.html", doc, html, notFound: true });
}

// sitemap.xml: lastmod only changes when a page's content really changes (state kept in tools/sitemap-state.json).
const statePath = join(ROOT, "tools", "sitemap-state.json");
const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8")) : {};
// Local calendar date (not UTC), so lastmod is never in the future.
const now = new Date();
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
const nextState = {};
const sitemapPages = pages.filter((p) => !p.notFound && !(p.route.robots || "").includes("noindex"));
for (const { route, doc } of sitemapPages) {
  const contentHash = hashString(doc.replace(/\?v=[0-9a-f]{8}/g, ""));
  const previous = state[route.path];
  nextState[route.path] = { hash: contentHash, lastmod: previous && previous.hash === contentHash && previous.lastmod <= today ? previous.lastmod : today };
}
outputs.set("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapPages.map(({ route }) => `  <url>\n    <loc>${site.url}${route.path}</loc>\n    <lastmod>${nextState[route.path].lastmod}</lastmod>\n  </url>`).join("\n")}
</urlset>
`);
outputs.set("tools/sitemap-state.json", `${JSON.stringify(nextState, null, 2)}\n`);

// ---- assertions (the build fails on any of these) ------------------------------------------
const titles = new Map();
const descriptions = new Map();
const routeFiles = new Set(pages.map((p) => p.file));
const attr = (tag, name) => (tag.match(new RegExp(`\\s${name}="([^"]*)"`)) || [])[1];
for (const { route, file, doc, html, notFound } of pages) {
  const where = file;
  if (route.title.length > 65) fail(`${where}: title is ${route.title.length} chars (max 65): ${route.title}`);
  if (route.description.length > 160) fail(`${where}: description is ${route.description.length} chars (max 160)`);
  if (route.title.length > 65 || route.description.length < 20) fail(`${where}: title/description length out of range`);
  if (titles.has(route.title)) fail(`${where}: duplicate title (also ${titles.get(route.title)})`);
  if (descriptions.has(route.description)) fail(`${where}: duplicate description (also ${descriptions.get(route.description)})`);
  titles.set(route.title, where);
  descriptions.set(route.description, where);
  const h1s = html.match(/<h1[\s>]/g) || [];
  if (h1s.length !== 1) fail(`${where}: ${h1s.length} <h1> elements (need exactly 1)`);
  const h1Text = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1]?.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  if (route.path !== "/menu/print/" && h1Text !== route.h1.replace(/\s+/g, " ")) fail(`${where}: H1 "${h1Text}" does not match the manifest "${route.h1}"`);
  const junk = doc.match(/\{\{|_todo|TODO|\bundefined\b|\bNaN\b|\[object/);
  if (junk) fail(`${where}: placeholder or debug text found (${junk[0]})`);
  if (/mailto:|[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(doc)) fail(`${where}: email address or mailto link found (inquiries are phone-only)`);
  if (/<form[\s>]/i.test(html)) fail(`${where}: <form> found (inquiries are phone-only)`);
  if (/Hidden Gem/i.test(doc)) fail(`${where}: Hidden Gem is not on this site`);
  // headings never skip a level
  let level = 0;
  for (const m of html.matchAll(/<h([1-6])[\s>]/g)) {
    const next = Number(m[1]);
    if (level && next > level + 1) fail(`${where}: heading jumps from h${level} to h${next}`);
    level = next;
  }
  // images: alt, size, and the file exists
  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    const tag = m[0];
    if (attr(tag, "alt") === undefined) fail(`${where}: <img> without alt: ${tag.slice(0, 80)}`);
    if (!attr(tag, "width") || !attr(tag, "height")) fail(`${where}: <img> without width/height: ${tag.slice(0, 80)}`);
    const src = decodeURIComponent((attr(tag, "src") || "").replace(/&#039;/g, "'").replace(/&amp;/g, "&").split("?")[0]);
    if (src && !existsSync(join(ROOT, src.replace(/^\//, "")))) fail(`${where}: image file missing: ${src}`);
  }
  // internal links resolve to a generated page or a real file
  for (const m of html.matchAll(/\shref="(\/[^"#?]*)/g)) {
    const target = decodeURIComponent(m[1]);
    const candidate = target.endsWith("/") ? `${target.slice(1)}index.html` : target.slice(1);
    if (!routeFiles.has(candidate) && !existsSync(join(ROOT, candidate))) fail(`${where}: internal link does not resolve: ${m[1]}`);
  }
  // every tel: link is tracked; every external target is safe
  for (const m of html.matchAll(/<a\b[^>]*href="tel:[^"]*"[^>]*>/g)) if (!/data-track="call_click"/.test(m[0])) fail(`${where}: tel: link without call_click tracking: ${m[0].slice(0, 90)}`);
  for (const m of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) if (!/rel="noopener/.test(m[0])) fail(`${where}: target=_blank without rel=noopener`);
}

// robots.txt must exist and point at the sitemap; happy-hour copy must match menu data
if (!/Sitemap:\s*https:\/\/www\.karmmankocktails\.com\/sitemap\.xml/.test(read("robots.txt"))) fail("robots.txt is missing the Sitemap line");
const hh = menus.dallas.categories.filter((c) => c.type === "happy-hour");
const priceOf = (id) => [...new Set(hh.find((c) => c.id === id).items.map((i) => i.price))];
if (priceOf("happy-food").join() !== "9") fail("happy-hour description says $9 bites but the data differs");
if (!priceOf("happy-drinks").includes(8) || !priceOf("happy-drinks").includes(4)) fail("happy-hour description says $8 cocktails / $4 domestic beer but the data differs");
if (happyHourDescription().length > 160) fail("happy-hour description too long");
// JSON-LD facts must equal the visible page text
for (const { route, doc, html } of pages) {
  const ld = [...doc.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  for (const item of ld.flatMap((x) => x["@graph"] || [x])) {
    if (item.telephone && !html.includes(locations.find((l) => l.phoneIntl === item.telephone).phone)) fail(`${route.path}: JSON-LD phone ${item.telephone} not visible on the page`);
    if (item.address?.streetAddress && !html.includes(item.address.streetAddress.replace(/&/g, "&amp;"))) fail(`${route.path}: JSON-LD address not visible on the page`);
  }
}

if (errors.length) {
  console.error(`prerender: ${errors.length} problem(s)\n - ${errors.join("\n - ")}`);
  process.exit(1);
}

// ---- write or check -----------------------------------------------------------------------
let stale = 0;
let written = 0;
for (const [file, contents] of outputs) {
  const full = join(ROOT, file);
  const current = existsSync(full) ? normalize(readFileSync(full, "utf8")) : null;
  if (current === contents) continue;
  if (CHECK) {
    stale += 1;
    console.error(`stale: ${file}`);
    continue;
  }
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, contents);
  written += 1;
}
if (CHECK) {
  if (stale) {
    console.error(`prerender --check: ${stale} stale file(s). Run: node tools/prerender.mjs`);
    process.exit(1);
  }
  console.log(`prerender --check: all ${outputs.size} generated files are up to date (version ${version})`);
} else {
  console.log(`prerender: ${pages.length} pages (${pages.length - 1} routes + 404.html), sitemap.xml with ${sitemapPages.length} URLs, version ${version}; ${written} file(s) written, ${outputs.size - written} unchanged`);
}
