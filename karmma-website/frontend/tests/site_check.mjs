// Browser + HTTP checks for the prerendered site.
//
//   1. node tools/prerender.mjs
//   2. python -I server.py --port 5174        (separate terminal)
//   3. npm install playwright (anywhere outside the repo, e.g. a temp folder) and run:
//        NODE_PATH=<that>/node_modules node tests/site_check.mjs [http://localhost:5174]
//
// Uses the installed Microsoft Edge (channel "msedge"); change to "chrome" if needed.
// Does not call Google (analytics and map requests are blocked) and submits nothing.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

import http from "node:http";
const BASE = process.argv[2] || "http://localhost:5174";
// Plain node:http client (the preview server speaks HTTP/1.0, which trips some fetch implementations).
const fetch = (url) => new Promise((resolve, reject) => {
  http.get(url, (res) => {
    const chunks = [];
    res.on("data", (c) => chunks.push(c));
    res.on("end", () => { const body = Buffer.concat(chunks); resolve({ status: res.statusCode, headers: res.headers, text: async () => body.toString("utf8") }); });
  }).on("error", reject);
});
const ROUTES = ["/", "/grapevine/", "/dallas/", "/menu/", "/menu/grapevine/", "/menu/dallas/", "/happy-hour/", "/catering/", "/private-events/", "/services/", "/about/", "/contact/", "/reserve/", "/menu/print/"];
let failures = 0;
const ok = (cond, message) => { if (!cond) { failures += 1; console.log(`FAIL  ${message}`); } else console.log(`ok    ${message}`); };

const browser = await chromium.launch({ channel: "msedge", headless: true });
const newPage = async (viewport, { js = true } = {}) => {
  const context = await browser.newContext({ viewport, javaScriptEnabled: js });
  await context.route(/googletagmanager|google-analytics|google\.com\/maps/, (route) => route.abort());
  const page = await context.newPage();
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && !/ERR_FAILED|ERR_BLOCKED|404/.test(m.text()) && page.errors.push(m.text()));
  return page;
};

// 1. HTTP: every route 200, content present without JavaScript, internal links resolve.
const seen = new Set();
for (const route of ROUTES) {
  const res = await fetch(BASE + route);
  const html = await res.text();
  ok(res.status === 200, `${route} returns HTTP 200`);
  ok((html.match(/<h1[\s>]/g) || []).length === 1, `${route} raw HTML has exactly one h1`);
  ok(/<title>[^<]+<\/title>/.test(html) && /rel="canonical"/.test(html) && /property="og:title"/.test(html) && /name="twitter:card"/.test(html), `${route} raw HTML has title, canonical, og, twitter`);
  ok(route === "/menu/print/" || /application\/ld\+json/.test(html) || ["/menu/", "/services/", "/reserve/"].includes(route), `${route} raw HTML has JSON-LD where planned`);
  ok(html.includes("G-HZ8LLF7ZZ8"), `${route} has the GA4 tag`);
  for (const m of html.replace(/&#039;/g, "'").matchAll(/\s(?:href|src)="(\/[^"#?]*)/g)) seen.add(decodeURIComponent(m[1]));
}
let bad = 0;
for (const link of seen) { const r = await fetch(BASE + link); if (r.status !== 200) { bad += 1; console.log(`  broken: ${link} -> ${r.status}`); } }
ok(bad === 0, `all ${seen.size} internal links/assets referenced by the pages return 200`);
ok((await fetch(BASE + "/nope/")).status === 404, "unknown URL returns 404");
ok((await (await fetch(BASE + "/nope/")).text()).includes("Page not found"), "404 body says Page not found");

// 2. No JavaScript: nav links exist, no form/mailto, tel links on catering and events.
{
  const page = await newPage({ width: 1440, height: 900 }, { js: false });
  for (const route of ["/catering/", "/private-events/"]) {
    await page.goto(BASE + route);
    ok((await page.locator('a[href^="tel:"]').count()) >= 4, `${route} (no JS) has tel: links`);
    const hrefs = await page.locator('a[href^="tel:"]').evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute("href")))]);
    ok(hrefs.sort().join() === "tel:+14697221100,tel:+16822231123", `${route} tel: links are exactly Grapevine and Dallas`);
    ok((await page.locator("form, a[href^=mailto]").count()) === 0, `${route} has no form and no mailto`);
    ok(!/@[a-z0-9-]+\.[a-z]{2,}/i.test(await page.content().then((c) => c.replace(/<script[\s\S]*?<\/script>/g, "").replace(/href="[^"]*"/g, ""))), `${route} shows no email address`);
  }
  await page.goto(BASE + "/menu/dallas/");
  ok((await page.locator(".menu-type").count()) === 3 && (await page.locator(".menu-type:visible").count()) === 3, "Dallas menu (no JS) shows food, drinks and happy hour");
  await page.goto(BASE + "/");
  ok((await page.locator(".reveal").first().evaluate((e) => getComputedStyle(e).opacity)) === "1", "reveal blocks are visible without JS");
  for (const label of ["Menu", "Locations", "Happy Hour", "Catering", "About", "Contact"]) ok((await page.locator(`.nav-links a:text-is("${label}")`).count()) === 1, `header link "${label}" exists without JS`);
  await page.context().close();
}

// 3. With JS, desktop.
{
  const page = await newPage({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    window.__mut = 0;
    const start = () => { const app = document.querySelector("#app"); if (!app) return requestAnimationFrame(start); new MutationObserver((l) => { window.__mut += l.filter((m) => m.type === "childList").length; }).observe(app, { childList: true, subtree: true }); };
    start();
  });
  for (const route of ROUTES) {
    await page.goto(BASE + route, { waitUntil: "load" });
    await page.waitForTimeout(250);
    const mutations = await page.evaluate(() => window.__mut);
    ok(mutations === 0, `${route} hydrates without replacing the prerendered DOM (mutations: ${mutations})`);
  }
  ok(page.errors.length === 0, `no console/page errors across all routes ${JSON.stringify(page.errors)}`);
  {
    const urls = [];
    page.on("request", (r) => /\/src\/[\w-]+\.(js|css)/.test(r.url()) && urls.push(r.url()));
    await page.goto(BASE + "/menu/dallas/", { waitUntil: "load" });
    await page.waitForTimeout(200);
    ok(urls.length >= 8 && urls.every((u) => /\?v=[0-9a-f]{8}$/.test(u)), `every module/stylesheet request carries ?v=<version> (${urls.length} requests, e.g. ${urls.slice(0, 2).map((u) => u.replace(BASE, "")).join(", ")})`);
  }

  // navigation, title and focus
  await page.goto(BASE + "/");
  await page.locator('.nav-links a:text-is("Menu")').click();
  await page.waitForURL("**/menu/");
  ok((await page.title()).startsWith("Menus: Grapevine & Dallas"), "in-app navigation updates document.title");
  ok(await page.evaluate(() => document.activeElement?.tagName === "H1"), "focus moves to the page heading after navigation");
  ok((await page.locator('link[rel=canonical]').getAttribute("href")) === "https://www.karmmankocktails.com/menu/", "canonical follows the route");
  await page.locator('.location-option a:text("Grapevine Menu")').click();
  await page.waitForURL("**/menu/grapevine/");
  ok((await page.locator('script[type="application/ld+json"]').textContent()).includes("MenuSection"), "menu JSON-LD swapped in on navigation");
  ok((await page.locator(".menu-card:visible").count()) > 50, "Grapevine food cards visible");
  const pdf = await page.locator('a:text("Download PDF")').getAttribute("href");
  ok(pdf === "/assets/menus/grapevine-menu.pdf" && (await page.locator('a:text("Download PDF")').getAttribute("download")) !== null, "Download PDF links the real PDF with download attribute");
  ok((await page.request.get(BASE + pdf)).headers()["content-type"] === "application/pdf", "PDF served as application/pdf");
  await page.locator('[data-menu-type="drinks"]').click();
  ok((await page.locator(".menu-type:not([hidden]) .menu-card").count()) === 5, "Grapevine Drinks tab shows 5 items");
  ok(page.url().includes("type=drinks"), "tab state kept in the URL");
  await page.locator('[data-menu-type="food"]').click();
  await page.locator("[data-menu-search]").fill("butter chicken");
  ok((await page.locator(".menu-type:not([hidden]) .menu-card").count()) > 0 && (await page.locator(".menu-type:not([hidden])").innerText()).includes("$21.99"), "search finds Butter Chicken at the Grapevine price");
  await page.locator("[data-menu-search]").fill("zzzz");
  ok(await page.locator(".empty").isVisible(), "no-result state shows");
  await page.locator("[data-clear-menu]").click();
  await page.locator('[data-menu-filter="vegetarian"]').click();
  ok((await page.locator(".menu-type:not([hidden]) .menu-card").count()) === (await page.locator(".menu-type:not([hidden]) .menu-card .tags").count()), "vegetarian filter shows only vegetarian cards");
  await page.locator('[data-menu-filter=""]').click();
  await page.locator(".category-pills a").nth(3).click();
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => document.activeElement?.tagName === "H2"), "category pill focuses its section heading");
  // switch location in the same tab
  await page.locator('.menu-switch a:text("Dallas menu")').click();
  await page.waitForURL("**/menu/dallas/");
  await page.locator('[data-menu-type="happy-hour"]').click();
  ok((await page.locator(".menu-type:not([hidden])").innerText()).includes("$9.00"), "Dallas Happy Hour tab shows $9.00 bites");
  // legacy URL
  await page.goto(BASE + "/menu/?location=dallas&type=drinks");
  await page.waitForTimeout(300);
  ok(new URL(page.url()).pathname === "/menu/dallas/" && page.url().includes("type=drinks") && !page.url().includes("location="), "legacy /menu/?location=dallas is rewritten to /menu/dallas/");
  ok((await page.locator('link[rel=canonical]').getAttribute("href")) === "https://www.karmmankocktails.com/menu/dallas/", "legacy URL gets the path canonical");
  // location dialog
  await page.goto(BASE + "/");
  await page.locator(".nav-order").click();
  ok(await page.locator("dialog.location-dialog[open]").count() === 1, "Order Online opens the location dialog");
  ok((await page.locator(".location-option").count()) === 2 && (await page.locator('.location-option[href*="toasttab"]').count()) === 1 && (await page.locator('.location-option[href*="cloveronline"]').count()) === 1, "dialog offers Toast (Grapevine) and Clover (Dallas)");
  ok(await page.evaluate(() => document.activeElement?.classList.contains("location-close")), "dialog focus lands on Close");
  await page.keyboard.press("Escape");
  ok((await page.locator("dialog[open]").count()) === 0, "Esc closes the dialog");
  ok(await page.evaluate(() => document.activeElement?.classList.contains("nav-order")), "focus returns to the trigger");
  // dropdown by keyboard
  await page.locator(".nav-parent").focus();
  ok(await page.locator(".nav-sub a").first().isVisible(), "Locations dropdown opens on keyboard focus");
  // focus ring
  const ringOk = [];
  await page.goto(BASE + "/contact/");
  for (let i = 0; i < 14; i++) { await page.keyboard.press("Tab"); ringOk.push(await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 2 ? true : document.activeElement.className; })); }
  ok(ringOk.every((r) => r === true), `every focused element on /contact/ has a visible ring ${JSON.stringify(ringOk.filter((r) => r !== true))}`);
  // call_click analytics event
  await page.goto(BASE + "/catering/");
  await page.evaluate(() => document.querySelectorAll('a[href^="tel:"]').forEach((a) => a.addEventListener("click", (e) => e.preventDefault())));
  await page.locator('a[href="tel:+14697221100"]').first().click();
  const events = await page.evaluate(() => window.dataLayer.filter((x) => x[0] === "event").map((x) => ({ name: x[1], ...x[2] })));
  ok(events.some((e) => e.name === "call_click" && e.location === "dallas" && e.intent === "catering"), `call_click recorded with location=dallas intent=catering ${JSON.stringify(events.slice(-1))}`);
  await page.goto(BASE + "/private-events/");
  await page.evaluate(() => document.querySelectorAll('a[href^="tel:"]').forEach((a) => a.addEventListener("click", (e) => e.preventDefault())));
  await page.locator('a[href="tel:+16822231123"]').first().click();
  ok((await page.evaluate(() => window.dataLayer.filter((x) => x[0] === "event").map((x) => x[2]))).some((e) => e.intent === "events" && e.location === "grapevine"), "call_click intent=events on /private-events/");
  // 404 contrast
  await page.goto(BASE + "/nope/");
  const colors = await page.evaluate(() => ["h1", ".not-found p"].map((s) => getComputedStyle(document.querySelector(s)).color));
  ok(colors.every((c) => { const [r, g, b] = c.match(/\d+/g).map(Number); return (r + g + b) / 3 > 200; }), `404 text is light on the dark background ${colors}`);
  ok((await page.locator('a:text("Go Home")').getAttribute("href")) === "/", "404 Go Home link");
  // edited data without re-running prerender -> full re-render path
  await page.route("**/src/menu-data.js*", async (route) => { const r = await route.fetch(); const body = (await r.text()).replace("m('Vegetable Pakora', 10.99", "m('Vegetable Pakora', 11.49"); await route.fulfill({ response: r, body }); });
  await page.goto(BASE + "/menu/grapevine/");
  await page.waitForTimeout(400);
  ok((await page.locator(".menu-type:not([hidden])").innerText()).includes("$11.49"), "edited menu data shows without re-running the prerender (full re-render path)");
  ok(page.errors.length === 0, `no console errors in interaction tests ${JSON.stringify(page.errors)}`);
  await page.context().close();
}

// 4. Mobile 390.
{
  const page = await newPage({ width: 390, height: 844 });
  for (const route of ROUTES) {
    await page.goto(BASE + route);
    ok((await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0, `${route} has no horizontal scroll at 390px`);
  }
  await page.goto(BASE + "/");
  await page.locator("[data-menu-toggle]").click();
  ok(await page.locator("[data-mobile-panel].open").isVisible(), "mobile menu opens");
  ok((await page.locator('[data-menu-toggle]').getAttribute("aria-expanded")) === "true", "aria-expanded true");
  await page.keyboard.press("Escape");
  ok((await page.locator("[data-mobile-panel].open").count()) === 0, "Escape closes the mobile menu");
  await page.locator("[data-menu-toggle]").click();
  await page.locator('[data-mobile-panel] a:text-is("Catering")').click();
  await page.waitForURL("**/catering/");
  ok(true, "mobile menu link navigates");
  for (const route of ["/", "/catering/", "/contact/", "/grapevine/"]) {
    await page.goto(BASE + route);
    const small = await page.evaluate(() => [...document.querySelectorAll('a[href^="tel:"]')].filter((a) => a.getClientRects().length && a.getBoundingClientRect().height < 43.5).map((a) => `${a.textContent.trim().slice(0, 30)} ${Math.round(a.getBoundingClientRect().height)}px`));
    ok(small.length === 0, `${route} every tel: link is at least 44 px tall at 390 px ${JSON.stringify(small)}`);
  }
  await page.goto(BASE + "/");
  await page.locator("[data-menu-toggle]").click();
  await page.locator('[data-mobile-panel] a[data-location-action="order"]').click();
  ok(await page.locator("dialog[open]").count() === 1, "mobile menu Order Online opens the dialog");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => document.activeElement?.hasAttribute("data-menu-toggle")), "after closing a dialog opened from the mobile menu, focus is on the hamburger button");
  await page.goto(BASE + "/menu/dallas/");
  const pill = await page.evaluate(() => getComputedStyle(document.querySelector(".category-pills")).position);
  ok(pill === "sticky", "category bar is sticky on phones");
  await page.evaluate(() => window.scrollTo(0, 2500));
  await page.waitForTimeout(200);
  const top = await page.evaluate(() => document.querySelector(".category-pills").getBoundingClientRect().top);
  ok(top > 60 && top < 100, `category bar stays under the header while scrolling (top=${top})`);
  ok(page.errors.length === 0, `no console errors on mobile ${JSON.stringify(page.errors)}`);
  await page.context().close();
}
await browser.close();
console.log(failures ? `\n${failures} FAILED` : "\nall checks passed");
process.exit(failures ? 1 : 0);
