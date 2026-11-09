// Page markup for every route. Pure string builders: the browser (app.js) and the Node
// prerender script (tools/prerender.mjs) call renderRoute() with the same data, so the
// static HTML and the live app can never disagree.
import { site, navItems, footerLinks, locations, bySlug, hoursSpec } from "./site-data.js";
import { menus } from "./menu-data.js";
import { menuHubPage, menuLocationPage, printMenuPage, menuHasBar, locationIdFromPath } from "./menu.js";
import { routeByPath } from "./seo-routes.js";
import { breadcrumbTrail } from "./jsonld.js";
import { esc, track } from "./util.js";

let C = null; // { path, query, appUrl, assetUrl } for the page being rendered
const U = (path) => C.appUrl(path);
const A = (path) => C.assetUrl(path);

const money = (price) => `$${price.toFixed(2)}`;
const a = (href, label, cls = "", extra = "") => `<a href="${U(href)}"${cls ? ` class="${cls}"` : ""} data-link${extra}>${label}</a>`;
const ext = (href, label, cls, tracking, aria) => `<a href="${esc(href)}"${cls ? ` class="${cls}"` : ""} target="_blank" rel="noopener noreferrer"${tracking || ""}${aria ? ` aria-label="${esc(aria)} (opens in a new tab)"` : ""}>${label}</a>`;
const h1Html = (path) => {
  const text = routeByPath[path].h1;
  const i = text.indexOf(": ");
  return i < 0 ? esc(text) : `${esc(text.slice(0, i))}: <em>${esc(text.slice(i + 2))}</em>`;
};
const hasBar = (location) => menuHasBar(location.id);
const hasHappyHour = (location) => menus[location.id].categories.some((category) => category.type === "happy-hour");
const happyTime = () => menus.dallas.categories.find((category) => category.type === "happy-hour")?.description || "";

// ---- reusable pieces -------------------------------------------------------------------

function breadcrumb(path) {
  const trail = breadcrumbTrail(path);
  if (!trail) return "";
  return `<nav class="breadcrumb" aria-label="Breadcrumb"><ol>${trail.map(([name, to], index) => (index === trail.length - 1 ? `<li aria-current="page">${esc(name)}</li>` : `<li>${a(to, esc(name))}</li>`)).join("")}</ol></nav>`;
}

const phoneLink = (location, placement, intent = "general", cls = "") => `<a${cls ? ` class="${cls}"` : ""} href="${location.phoneHref}"${track("call_click", { location: location.id, placement, intent })}>${location.phone}</a>`;
const callButton = (location, placement, intent, label = "Call") => `<a class="btn btn-gold call-btn" href="${location.phoneHref}"${track("call_click", { location: location.id, placement, intent })}>${label} ${location.name} <span class="nowrap">${location.phone}</span></a>`;
const callButtons = (placement, intent) => `<div class="call-buttons">${locations.map((location) => callButton(location, placement, intent)).join("")}</div>`;

const orderLink = (location, placement, label = "Order Online", cls = "btn") => ext(location.orderUrl, label, cls, track("order_click", { location: location.id, placement, platform: location.orderPlatform }), label === location.name ? `${label}, order online on ${location.orderProvider}` : `${label}, ${location.name} on ${location.orderProvider}`); // aria-labels START with the visible text (WCAG 2.5.3)
const reserveLink = (location, placement, label = "Reserve a Table", cls = "btn") => ext(location.reserveUrl, label, cls, track("reserve_click", { location: location.id, placement }), label === location.name ? `${label}, reserve a table` : label.includes(location.name) ? label : `${label}, ${location.name}`);
const directionsLink = (location, placement, label = "Get Directions", cls = "btn") => ext(location.directionsUrl, label, cls, track("directions_click", { location: location.id, placement }), label === location.name ? `${label}, get directions` : label.includes(location.name) ? label : `${label}, ${location.name}`);

// "Label: [Grapevine] [Dallas]" group of real links, one per location.
function actionGroup(label, build) {
  return `<div class="action-group" role="group" aria-label="${esc(label)}"><span class="action-label" aria-hidden="true">${esc(label)}</span>${locations.map((location) => build(location)).join("")}</div>`;
}
const orderGroup = (placement) => actionGroup("Order Online", (l) => orderLink(l, placement, l.name));
const reserveGroup = (placement) => actionGroup("Reserve a Table", (l) => reserveLink(l, placement, l.name));
const directionsGroup = (placement) => actionGroup("Get Directions", (l) => directionsLink(l, placement, l.name));

function locationHours(location) {
  return `<dl class="location-hours">${location.hours.map(([day, time]) => `<div><dt>${day}</dt><dd>${time}</dd></div>`).join("")}</dl>`;
}

const shortDay = (day) => day.slice(0, 3);
function hoursSummary() {
  return hoursSpec.map((spec) => {
    const days = spec.days.length === 1 ? shortDay(spec.days[0]) : `${shortDay(spec.days[0])}-${shortDay(spec.days[spec.days.length - 1])}`;
    const range = locations[0].hours.find(([day]) => day === spec.days[0])[1];
    return `${days} ${range}`;
  }).join("; ");
}

function socialLink(location) {
  return location.instagram ? `<a class="location-social" href="${esc(location.instagram)}" target="_blank" rel="noopener noreferrer"${track("social_click", { location: location.id, placement: "location" })}>${location.name} Instagram</a>` : "";
}
const facebookLink = (location) => (location.facebook ? `<a class="location-social" href="${esc(location.facebook)}" target="_blank" rel="noopener noreferrer"${track("social_click", { location: location.id, placement: "location" })}>${location.name} Facebook</a>` : "");
const reviewLink = (location) => (location.reviewUrl ? `<a class="location-social" href="${esc(location.reviewUrl)}" target="_blank" rel="noopener noreferrer">Leave a ${location.name} review on Google<span class="sr-only"> (opens in a new tab)</span></a>` : "");
const deliveryLinks = (location) => location.delivery.map((d) => `<a class="location-social" href="${esc(d.url)}" target="_blank" rel="noopener noreferrer"${track("order_click", { location: location.id, placement: "delivery", platform: d.name.toLowerCase() })}>${esc(d.name)} for ${location.name}<span class="sr-only"> (opens in a new tab)</span></a>`).join("");

function iconSvg(name) {
  const icons = {
    dining: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.35" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="25" r="10"></circle><circle cx="24" cy="25" r="4.2"></circle><path d="M9 8v15"></path><path d="M5.5 8v8.8c0 3.8 1.4 6.2 3.5 6.2s3.5-2.4 3.5-6.2V8"></path><path d="M9 23v17"></path><path d="M38 8v32"></path><path d="M38 8c4.3 4.8 4.8 12.5 0 17"></path></svg>`,
    treats: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.35" stroke-linecap="round" stroke-linejoin="round"><path d="M13 19h22l-2.2 17a5 5 0 0 1-5 4h-7.6a5 5 0 0 1-5-4L13 19Z"></path><path d="M17 19l2-8h10l2 8"></path><path d="M20 27h8"></path><path d="M34 12c4 1 6 4 6 8 0 4.5-3.5 8-8 8"></path><path d="M13 12c-4 1-6 4-6 8 0 4.5 3.5 8 8 8"></path></svg>`,
    catering: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.35" stroke-linecap="round" stroke-linejoin="round"><path d="M7 35h34"></path><path d="M12 35c1.2-10.5 6.2-16.8 12-16.8S34.8 24.5 36 35"></path><path d="M24 13v5"></path><path d="M19.5 13h9"></path><path d="M5 39h38"></path><path d="M13 27c3-2.4 6.7-3.8 11-3.8S32 24.6 35 27"></path></svg>`,
    events: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.35" stroke-linecap="round" stroke-linejoin="round"><path d="M15 39c.8-5.5 4.2-9 9-9s8.2 3.5 9 9"></path><circle cx="24" cy="20" r="5.8"></circle><path d="M8.5 34c1-4.6 4-7.2 8-7.8"></path><circle cx="14" cy="20.5" r="4.2"></circle><path d="M39.5 34c-1-4.6-4-7.2-8-7.8"></path><circle cx="34" cy="20.5" r="4.2"></circle><path d="M24 5v5"></path><path d="M17.5 8.5 14 5"></path><path d="M30.5 8.5 34 5"></path></svg>`,
    star: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m24 6 5.4 11 12.1 1.8-8.8 8.5 2.1 12-10.8-5.7-10.8 5.7 2.1-12-8.8-8.5L18.6 17 24 6Z"></path></svg>`,
    heart: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M24 40S9 31 9 18c0-6 4-10 9-10 3 0 5 1.4 6 3.4C25 9.4 27 8 30 8c5 0 9 4 9 10 0 13-15 22-15 22Z"></path></svg>`,
    hospitality: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M16 22a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z"></path><path d="M32 22a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z"></path><path d="M7 39c1-7 5-11 11-11s10 4 11 11"></path><path d="M25 31c2-2 4-3 7-3 5 0 9 4 10 11"></path></svg>`,
    leaf: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M40 8C24 8 12 17 12 31c0 6 4 10 10 10 14 0 18-17 18-33Z"></path><path d="M12 40c8-12 15-18 28-27"></path></svg>`,
  };
  return icons[name] || icons.star;
}
const iconPin = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s6-4.35 6-10a6 6 0 1 0-12 0c0 5.65 6 10 6 10z"></path><circle cx="12" cy="11" r="2"></circle></svg>`;

// ---- shell: header, footer, dialog ------------------------------------------------------

function header(path) {
  const active = (item) => path === item.href || (item.match || []).includes(path);
  const desktop = navItems.map((item) => item.children
    ? `<div class="nav-group${active(item) ? " active" : ""}"><a href="${U(item.href)}" class="nav-parent${active(item) ? " active" : ""}" data-link>${item.label}</a><div class="nav-sub">${item.children.map((child) => `<a href="${U(child.href)}" class="${path === child.href ? "active" : ""}" data-link>${child.label}</a>`).join("")}</div></div>`
    : `<a href="${U(item.href)}" class="${path === item.href ? "active" : ""}" data-link>${item.label}</a>`).join("");
  const mobileLinks = [["Home", "/"], ["Menu", "/menu/"], ["Grapevine", "/grapevine/"], ["Dallas", "/dallas/"], ["Happy Hour", "/happy-hour/"], ["Catering", "/catering/"], ["About", "/about/"], ["Contact", "/contact/"]];
  return `<nav class="navbar" data-navbar aria-label="Main">
      <div class="nav-inner">
        <a href="${U("/")}" class="brand" aria-label="${esc(site.name)} ${esc(site.tagline)}, home" data-link>
          <span class="brand-logo"><img src="${A(site.logo)}" alt="" width="256" height="256" /></span>
          <span class="brand-copy"><strong>${esc(site.name)}</strong> <small>${esc(site.tagline)}</small></span>
        </a>
        <div class="nav-links">${desktop}</div>
        <a class="btn btn-gold nav-order" href="${U("/menu/")}" data-location-action="order" aria-haspopup="dialog">Order Online</a>
        <button class="menu-toggle" aria-label="Toggle menu" aria-expanded="false" aria-controls="mobile-panel" data-menu-toggle><span></span><span></span><span></span></button>
      </div>
      <div class="mobile-panel" id="mobile-panel" data-mobile-panel>
        ${mobileLinks.map(([label, href]) => a(href, label)).join("")}
        <a href="${U("/menu/")}" data-location-action="order" aria-haspopup="dialog">Order Online</a>
      </div>
    </nav>`;
}

function footer() {
  const notices = [site.allergenNotice].filter(Boolean).map((text) => `<p class="footer-notice">${esc(text)}</p>`).join("");
  return `<footer class="footer"><div class="footer-inner">
    <section><a href="${U("/")}" class="footer-brand" data-link><img src="${A(site.logo)}" alt="" width="58" height="58" /><span><strong>${esc(site.fullName)}</strong><small>${esc(site.tagline)}</small></span></a><p>Nepali and Indian favorites served with warm hospitality in Grapevine and Dallas.</p>${notices}</section>
    <section><h2>Quick Links</h2>${footerLinks.map(([label, href]) => a(href, esc(label))).join("")}</section>
    ${locations.map((location) => `<section class="footer-location"><h2>${a(location.path, location.name)}</h2><address>${esc(location.address)}</address>${phoneLink(location, "footer")}<h3>Opening Hours</h3>${locationHours(location)}${directionsLink(location, "footer", "Get Directions", "")}${socialLink(location)}${facebookLink(location)}</section>`).join("")}
    </div><div class="footer-bottom"><p>&copy; 2026 ${esc(site.fullName)}. All rights reserved.</p><p>Closing times at or after midnight refer to the following day.</p></div></footer>`;
}

function shell(content, path) {
  const pill = path.startsWith("/menu/") || path === "/404.html" ? "" : `<aside aria-label="Visit us"><a class="visit-pill" href="${U("/contact/")}" data-link><span>${iconPin}</span>Visit Us</a></aside>`;
  return `<a class="skip-link" href="#main">Skip to main content</a>
    ${header(path)}
    ${pill}
    <main id="main" tabindex="-1">${content}</main>
    ${footer()}
    <dialog class="location-dialog" aria-labelledby="location-title" aria-describedby="location-description">
      <button type="button" class="location-close" aria-label="Close location selection" autofocus>&times;</button>
      <h2 id="location-title">Choose your location</h2>
      <p id="location-description"></p>
      <div class="location-options"></div>
    </dialog>`;
}

// ---- home ------------------------------------------------------------------------------

function locationCards() {
  return `<section class="section locations-section" id="locations" aria-labelledby="locations-title"><span class="eyebrow">Visit Us</span><h2 id="locations-title">Our <em>Two Locations</em></h2><div class="card-grid location-cards">${locations.map((location) => `<article class="service-card location-card reveal"><h3>${a(location.path, `${esc(site.name)} ${location.name}`)}</h3><address>${esc(location.address)}</address><p>${phoneLink(location, "home-locations")}</p><div class="card-actions">${a(location.path, "Location Page", "btn")}${a(location.menuPath, "Menu", "btn")}${orderLink(location, "home-locations", "Order Online")}</div></article>`).join("")}</div></section>`;
}

function barSentence() {
  const bars = locations.filter(hasBar).map((location) => location.name);
  return bars.length ? `Cocktails, martinis, wine and beer are served at ${bars.join(" and ")}.` : "";
}

function homePage() {
  const ctaHappy = hasHappyHour(bySlug.dallas) ? ` ${a("/happy-hour/", "Happy hour at Dallas")} runs ${esc(happyTime())}${bySlug.dallas.happyHourDays ? `, ${esc(bySlug.dallas.happyHourDays)}` : ""}.` : "";
  return `
    <section class="hero">
      <div class="hero-bg"></div>
      <div class="particles" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => `<span style="--x:${(i * 37) % 100}%;--d:${6 + (i % 7)}s"></span>`).join("")}</div>
      <div class="hero-content">
        <img class="hero-logo" src="${A(site.logo)}" alt="" width="256" height="256" fetchpriority="high" />
        <h1><span class="hero-brand">${esc(site.fullName)}</span><span class="sr-only">: </span><span class="hero-sub">Nepali &amp; Indian Restaurant and Bar in Grapevine and Dallas, TX</span></h1>
        <div class="hero-actions">
          ${a("/grapevine/", "Grapevine", "btn btn-gold")}
          ${a("/dallas/", "Dallas", "btn btn-gold")}
          ${a("/menu/", "View Menus", "btn")}
        </div>
        <div class="scroll-cue" aria-hidden="true"><span>Scroll to explore</span><i></i></div>
      </div>
    </section>
    ${locationCards()}
    <section class="feature-band">
      <div class="split">
        <div class="copy reveal"><span class="eyebrow">Signature Dish</span><h2>Himalayan<br /><em>Thakali Set</em></h2><p>A generous plate with rice, lentil soup, curry, seasonal sides and pickle, served together so you can enjoy several flavors in one meal. Choose from chicken, lamb, goat and other options on the menu.</p>${a("/menu/", "Explore Menus", "btn")}</div>
        <div class="round-image reveal"><img src="${A("/assets/food/thali.webp")}" alt="Thali on a brass plate with rice, curry, dal, fried vegetables, pickles and a dessert" width="720" height="720" loading="lazy" decoding="async" /></div>
      </div>
    </section>
    <section class="feature-band alt">
      <div class="split">
        <div class="round-image momo-feature-image reveal"><img src="${A("/assets/food/momos-bamboo-steamer.webp")}" alt="Steamed momos in a bamboo steamer with orange dipping sauce" width="900" height="601" loading="lazy" decoding="async" /></div>
        <div class="copy reveal"><span class="eyebrow">Handcrafted Delicacy</span><h2>Heavenly<br /><em>Steamed Momos</em></h2><p>Soft dumplings filled with savory flavor and served with chutney for a warm, satisfying bite. Choose them steamed, fried, or tossed in one of our house sauces.</p>${orderGroup("home-momos")}</div>
      </div>
    </section>
    <section class="section" aria-labelledby="bar-title"><span class="eyebrow">From the Bar</span><h2 id="bar-title">Cocktails <em>and Happy Hour</em></h2><p class="lead">${barSentence()}${ctaHappy} ${site.alcoholNotice && locations.some(hasBar) ? esc(site.alcoholNotice) : ""}</p><div class="hero-actions">${a("/menu/dallas/?type=drinks", "Dallas Drinks Menu", "btn")}${a("/happy-hour/", "Happy Hour", "btn")}</div></section>
    ${servicesPreview()}
    ${ctaBlock()}
  `;
}

function servicesPreview() {
  return `<section class="section" aria-labelledby="services-title"><span class="eyebrow">What We Offer</span><h2 id="services-title">Dine-In, Catering <em>and Private Events</em></h2><p class="lead">Whether you are stopping in for dinner, planning an event, or ordering for a group, we keep the food flavorful and the service easy. Catering and private events are arranged by phone.</p><div class="card-grid">
    <article class="service-card reveal"><div class="service-icon" aria-hidden="true">${iconSvg("dining")}</div><h3>Dine-In</h3><p>Enjoy a relaxed dine-in meal with fresh food, friendly service, and a comfortable setting.</p><div class="card-actions">${a("/menu/", "View Menus", "btn")}</div></article>
    <article class="service-card reveal"><div class="service-icon" aria-hidden="true">${iconSvg("catering")}</div><h3>Catering</h3><p>Bring our Nepali and Indian flavors to parties, office meals, and family gatherings.</p><div class="card-actions stacked">${locations.map((l) => callButton(l, "home-services", "catering")).join("")}${a("/catering/", "Catering Details", "text-link")}</div></article>
    <article class="service-card reveal"><div class="service-icon" aria-hidden="true">${iconSvg("events")}</div><h3>Private Events</h3><p>Plan birthdays, team dinners, and celebrations with menu options that fit your group.</p><div class="card-actions stacked">${locations.map((l) => callButton(l, "home-services", "events")).join("")}${a("/private-events/", "Private Event Details", "text-link")}</div></article>
  </div></section>`;
}

function ctaBlock() {
  return `<section class="cta" aria-labelledby="order-title"><h2 id="order-title">Order Online <em>or Reserve a Table</em></h2><p>Visit us in Grapevine or Dallas for comforting curries, momos, noodles, and a menu made for sharing.</p><div class="cta-groups">${orderGroup("home-cta")}${reserveGroup("home-cta")}${directionsGroup("home-cta")}</div><div class="location-hours-grid">${locations.map((location) => `<article><h3>${a(location.path, location.name)}</h3><p>Opening Hours</p>${locationHours(location)}</article>`).join("")}</div><p class="hours-note">Closing times at or after midnight refer to the following day.</p></section>`;
}

// ---- location pages ---------------------------------------------------------------------

function faq(items) {
  return `<div class="faq">${items.map(([q, answer]) => `<h3>${esc(q)}</h3><p>${answer}</p>`).join("")}</div>`;
}

function locationPage(path) {
  const location = locations.find((l) => l.path === path);
  const menu = menus[location.id];
  const food = menu.categories.filter((category) => category.type === "food");
  const bar = hasBar(location);
  const barNames = menu.categories.filter((category) => category.alcohol && category.type === "drinks").map((category) => category.name);
  const heroLinks = `${orderLink(location, "location-page", "Order Online", "btn btn-gold")}${a(location.menuPath, `${location.name} Menu`, "btn")}${reserveLink(location, "location-page")}${phoneLink(location, "location-page", "general", "btn")}`;
  const intro = `${esc(site.fullName)} is a Nepali and Indian restaurant and bar at ${esc(location.street)} in ${location.id === "dallas" ? "the Trinity Groves area of " : ""}${esc(location.city)}, Texas. Come in for momos, curries, biryani and tandoori${bar ? ", cocktails" : ""}, or order online.${location.formerName ? ` We are in the former ${esc(location.formerName)} space.` : ""}`;
  const gallery = location.gallery.length ? `<section class="content-section" aria-labelledby="gallery-title"><h2 id="gallery-title">Photos</h2><div class="gallery">${location.gallery.map((photo) => `<img src="${A(photo.src)}" alt="${esc(photo.alt)}" width="${photo.width}" height="${photo.height}" loading="lazy" decoding="async" />`).join("")}</div></section>` : "";
  const barSection = bar ? `<section class="content-section" aria-labelledby="bar-title"><h2 id="bar-title">Cocktails and Bar</h2><p>The ${location.name} bar serves ${esc(barNames.join(", ").toLowerCase() || "cocktails, wine and beer")}. See the Drinks tab of the ${a(`${location.menuPath}?type=drinks`, `${location.name} menu`)} for the full list and prices.${hasHappyHour(location) ? ` ${a("/happy-hour/", "Happy hour")} runs ${esc(happyTime())}${location.happyHourDays ? `, ${esc(location.happyHourDays)}` : ""}.` : ""}</p>${site.alcoholNotice ? `<p class="notice">${esc(site.alcoholNotice)}</p>` : ""}</section>` : "";
  const gettingHere = location.id === "dallas" ? `<section class="content-section" aria-labelledby="getting-title"><h2 id="getting-title">Getting Here</h2><p>We are at ${esc(location.address)}, in the ${esc(location.area)} area of West Dallas.${location.parking ? ` ${esc(location.parking)}` : ""} ${directionsLink(location, "location-page", "Get directions", "text-link")}.</p></section>` : (location.parking ? `<section class="content-section" aria-labelledby="getting-title"><h2 id="getting-title">Getting Here</h2><p>${esc(location.parking)} ${directionsLink(location, "location-page", "Get directions", "text-link")}.</p></section>` : "");
  const questions = [
    ["What are your hours?", `${esc(hoursSummary())}. Closing times at or after midnight refer to the following day.`],
    ["Can I order takeout?", `Yes. Use the Order Online link to order on ${esc(location.orderProvider)}, or call ${phoneLink(location, "location-faq")}.`],
    ["Do you have vegetarian dishes?", `Yes. Vegetarian dishes are tagged on the ${a(location.menuPath, `${location.name} menu`)}, and the Vegetarian filter shows only those dishes.`],
    ["Can I reserve a table?", `Yes. Use the Reserve a Table link on this page to reserve through Google.`],
    ["Do you offer catering or private events?", `Yes, by phone. Call ${phoneLink(location, "location-faq", "catering")}.`],
    ...(location.parking ? [["Where can I park?", esc(location.parking)]] : []),
  ];
  return `<section class="page-title location-hero">${breadcrumb(path)}<span class="eyebrow">${esc(location.city)}, ${esc(location.region)}</span><h1>${h1Html(path)}</h1><p>${intro}</p><div class="hero-actions">${heroLinks}</div></section>
  <section class="content-section" aria-labelledby="serve-title"><h2 id="serve-title">What We Serve</h2><p>The ${a(location.menuPath, `${location.name} menu`)} lists every price and tags vegetarian dishes. It has ${food.length} food sections:</p><ul class="chip-list">${food.map((category) => `<li>${a(`${location.menuPath}#menu-${category.id}`, esc(category.name))}</li>`).join("")}</ul></section>
  ${gallery}${barSection}
  <section class="content-section" aria-labelledby="hours-title"><h2 id="hours-title">Hours and Location</h2><div class="info-grid"><div><address>${esc(location.address)}</address><p>${phoneLink(location, "location-page")}</p><div class="card-actions">${directionsLink(location, "location-page-hours", "Get Directions")}${ext(location.mapUrl, "Open in Google Maps", "btn", track("directions_click", { location: location.id, placement: "location-page-map" }), `Open in Google Maps, ${location.name}`)}</div></div><div>${locationHours(location)}<p class="hours-note">Closing times at or after midnight refer to the following day.</p></div></div></section>
  ${gettingHere}
  <section class="content-section" aria-labelledby="order-title"><h2 id="order-title">Order, Menu and Reservations</h2><p>Order takeout online on ${esc(location.orderProvider)}, read the full menu, or reserve a table through Google.</p><div class="hero-actions">${orderLink(location, "location-page-order", "Order Online", "btn btn-gold")}${a(location.menuPath, `${location.name} Menu`, "btn")}${reserveLink(location, "location-page-order")}</div><div class="link-list">${deliveryLinks(location)}${reviewLink(location)}${socialLink(location)}${facebookLink(location)}</div></section>
  <section class="content-section" aria-labelledby="events-title"><h2 id="events-title">Catering and Private Events</h2><p>Planning a party, office lunch or celebration? Catering and private events are arranged by phone. Call ${location.name} at ${phoneLink(location, "location-page-events", "catering")}.</p><div class="call-buttons"><a class="btn btn-gold call-btn" href="${location.phoneHref}"${track("call_click", { location: location.id, placement: "location-page-events", intent: "catering" })}>Catering: call <span class="nowrap">${location.phone}</span></a><a class="btn btn-gold call-btn" href="${location.phoneHref}"${track("call_click", { location: location.id, placement: "location-page-events", intent: "events" })}>Private events: call <span class="nowrap">${location.phone}</span></a></div><p>${a("/catering/", "Catering details")} | ${a("/private-events/", "Private event details")}</p></section>
  <section class="content-section" aria-labelledby="faq-title"><h2 id="faq-title">Questions</h2>${faq(questions)}</section>`;
}

// ---- happy hour -------------------------------------------------------------------------

function priceList(category) {
  return `<ul class="price-list">${category.items.map((item) => `<li><span>${esc(item.name)}</span><strong>${item.price === null ? "Ask for price" : Array.isArray(item.price) ? item.price.map(([name, price]) => `${esc(name)} ${money(price)}`).join(" / ") : money(item.price)}</strong></li>`).join("")}</ul>`;
}

function happyHourPage() {
  const location = bySlug.dallas;
  const [bites, drinks] = [menus.dallas.categories.find((c) => c.id === "happy-food"), menus.dallas.categories.find((c) => c.id === "happy-drinks")];
  const when = `${location.happyHourDays ? `${esc(location.happyHourDays)}, ` : ""}${esc(happyTime())}`;
  return `<section class="page-title">${breadcrumb("/happy-hour/")}<span class="eyebrow">Dallas, Trinity Groves</span><h1>${h1Html("/happy-hour/")}</h1><p>Happy hour at the Dallas restaurant runs ${when}. Bites, cocktails, martinis, wine, shots and beer are priced below.</p><div class="hero-actions">${a("/menu/dallas/?type=happy-hour", "Full Happy Hour Menu", "btn btn-gold")}${reserveLink(location, "happy-hour")}${directionsLink(location, "happy-hour")}</div></section>
  <section class="content-section" aria-labelledby="when-title"><h2 id="when-title">When</h2><p>${when} at ${esc(location.address)}. Happy hour prices apply to the items listed here and in the Happy Hour tab of the ${a("/menu/dallas/?type=happy-hour", "Dallas menu")}.</p></section>
  ${bites ? `<section class="content-section" aria-labelledby="bites-title"><h2 id="bites-title">${esc(bites.name)}</h2>${priceList(bites)}</section>` : ""}
  ${drinks ? `<section class="content-section" aria-labelledby="drinks-title"><h2 id="drinks-title">${esc(drinks.name)}</h2>${priceList(drinks)}${site.alcoholNotice ? `<p class="notice">${esc(site.alcoholNotice)}</p>` : ""}</section>` : ""}
  <section class="content-section" aria-labelledby="here-title"><h2 id="here-title">Getting Here</h2><p>${esc(location.address)}, in the ${esc(location.area)} area of West Dallas.${location.parking ? ` ${esc(location.parking)}` : ""} Call ${phoneLink(location, "happy-hour")} with questions. See the ${a(location.path, "Dallas restaurant page")} for hours and details.</p></section>`;
}

// ---- catering and private events (phone only) -------------------------------------------

function phoneOnlySection(path, intent, placement, heading) {
  return `<section class="content-section call-section" aria-labelledby="call-title"><h2 id="call-title">${heading}</h2><p>This is arranged by phone. Call the location nearest you during opening hours and we will take care of the details.</p>${callButtons(placement, intent)}<p class="hours-note">Hours: ${esc(hoursSummary())}. See the ${a("/contact/", "contact page")} for addresses and directions.</p></section>`;
}

function cateringPage() {
  const details = locations.filter((l) => l.cateringDetails).map((l) => `<p><strong>${l.name}:</strong> ${esc(l.cateringDetails)}</p>`).join("");
  const pdfs = locations.filter((l) => l.cateringMenuPdf).map((l) => `<li><a href="${A(l.cateringMenuPdf)}" download${track("menu_pdf_download", { location: l.id, placement: "catering" })}>${l.name} catering menu (PDF)</a></li>`).join("");
  return `<section class="page-title">${breadcrumb("/catering/")}<span class="eyebrow">Phone Orders</span><h1>${h1Html("/catering/")}</h1><p>Nepali and Indian catering for office lunches, family parties, birthdays and community events. Call your nearest location to plan your order.</p>${callButtons("catering-hero", "catering")}</section>
  <section class="content-section" aria-labelledby="cater-title"><h2 id="cater-title">What We Cater</h2><p>We cater office lunches, family parties, birthdays, celebrations and community events in Grapevine, Dallas and across the Dallas-Fort Worth area. Ask about momos, curries, biryani, tandoori and more from our menu.</p></section>
  <section class="content-section" aria-labelledby="how-title"><h2 id="how-title">How It Works</h2><ol class="steps"><li>Look at the ${a("/menu/grapevine/", "Grapevine menu")} or the ${a("/menu/dallas/", "Dallas menu")} to see what your group would like.</li><li>Call the location nearest you.</li><li>Confirm your order and the pickup or service details on the phone.</li></ol></section>
  ${pdfs ? `<section class="content-section" aria-labelledby="menu-title"><h2 id="menu-title">Catering Menu</h2><ul class="link-list">${pdfs}</ul></section>` : ""}
  ${details ? `<section class="content-section" aria-labelledby="area-title"><h2 id="area-title">Service Area and Lead Time</h2>${details}</section>` : ""}
  ${phoneOnlySection("/catering/", "catering", "catering", "Call to Order")}
  <section class="content-section"><p>Hosting an event at the restaurant instead? See ${a("/private-events/", "private events and group dining")}, or visit the ${a("/grapevine/", "Grapevine")} and ${a("/dallas/", "Dallas")} pages.</p></section>`;
}

function privateEventsPage() {
  const details = locations.filter((l) => l.eventDetails).map((l) => `<p><strong>${l.name}:</strong> ${esc(l.eventDetails)}</p>`).join("");
  return `<section class="page-title">${breadcrumb("/private-events/")}<span class="eyebrow">Phone Bookings</span><h1>${h1Html("/private-events/")}</h1><p>Host birthdays, family dinners, team meals and small celebrations in Grapevine or Dallas. Call the location you would like to book.</p>${callButtons("private-events-hero", "events")}</section>
  <section class="content-section" aria-labelledby="help-title"><h2 id="help-title">What We Can Help With</h2><ul class="check-list"><li>Group dining support for birthdays, family dinners and team meals</li><li>Menu options for your guests from the ${a("/menu/grapevine/", "Grapevine")} and ${a("/menu/dallas/", "Dallas")} menus</li><li>Seating help for your group</li><li>Friendly service from start to finish</li></ul></section>
  ${details ? `<section class="content-section" aria-labelledby="detail-title"><h2 id="detail-title">Event Details</h2>${details}</section>` : ""}
  ${phoneOnlySection("/private-events/", "events", "private-events", "Call to Book")}
  <section class="content-section"><p>Ordering food for an event elsewhere? See ${a("/catering/", "catering")}.</p></section>`;
}

// ---- services, about, contact, reserve --------------------------------------------------

function servicesCta() {
  return `<section class="cta simple-cta" aria-labelledby="cta-title"><h2 id="cta-title">Plan with <em>a Phone Call</em></h2><p>Catering and private events are arranged by phone. Call the location nearest you.</p>${callButtons("services-cta", "general")}<div class="hero-actions">${a("/menu/", "View Menus", "btn")}</div></section>`;
}

function aboutCta() {
  return `<section class="cta simple-cta" aria-labelledby="cta-title"><h2 id="cta-title">Come Experience<br /><em>${esc(site.fullName)}</em></h2><p>Stop by for a flavorful meal, bring your family, or explore the menu before your next visit.</p><div class="hero-actions">${a("/menu/", "View Menus", "btn")}${a("/contact/", "Contact Us", "btn")}</div></section>`;
}

function valueIcon(value) {
  return { Excellence: "star", Authenticity: "heart", Hospitality: "hospitality", Sustainability: "leaf" }[value] || "star";
}

function valueText(value) {
  return {
    Excellence: "We focus on flavorful food, clean presentation, and consistent service.",
    Authenticity: "We respect familiar recipes while giving guests a wide menu to explore.",
    Hospitality: "Every guest should feel welcomed, comfortable, and taken care of.",
    Sustainability: "We choose practical, thoughtful improvements that support better food and service.",
  }[value];
}

function aboutPage() {
  const story = site.aboutStory.length ? site.aboutStory.map((p) => `<p>${esc(p)}</p>`).join("") : `<p>${esc(site.fullName)} brings Nepali and Indian favorites to Grapevine and Dallas with a menu built around bold flavors, comforting meals, and fresh-made favorites.</p><p>From momos and thali plates to curries, biryanis, noodles, and tea drinks, our kitchen focuses on generous portions, familiar comfort, and dishes guests will want to come back for.</p>`;
  return `<section class="page-hero about-hero"><div>${breadcrumb("/about/")}<span class="eyebrow">Our Story</span><h1>The Story of <em>${esc(site.fullName)}</em></h1>${story}</div><div class="about-frame"><img src="${A("/assets/restaurant/storefront-900.webp")}" alt="Karmma &amp; Kocktails storefront on Main Street in Grapevine, Texas, with the Nepali and Indian cuisine sign and a red carpet entrance" width="900" height="675" loading="lazy" decoding="async" /></div></section><section class="section values-section" aria-labelledby="values-title"><span class="eyebrow">What We Stand For</span><h2 id="values-title">Our <em>Values</em></h2><div class="card-grid values-grid">${["Excellence", "Authenticity", "Hospitality", "Sustainability"].map((v) => `<article class="service-card value-card"><div class="service-icon" aria-hidden="true">${iconSvg(valueIcon(v))}</div><h3>${v}</h3><p>${valueText(v)}</p></article>`).join("")}</div></section>${aboutCta()}`;
}

function servicesPage() {
  const room = { src: "/assets/restaurant/dining-room-900.webp", width: 900, height: 675, alt: "Dining room at Karmma & Kocktails Grapevine with round marble tables, a leather banquette and crystal pendant lights" };
  const bar = { src: "/assets/restaurant/bar-900.webp", width: 900, height: 675, alt: "Bar at Karmma & Kocktails Grapevine with the lit Karmma & Kocktails sign, a full back bar and stools" };
  const services = [
    { title: "Dine-In", icon: "dining", image: room, description: "Settle in for a comfortable meal with curries, momos, rice plates, noodles, snacks, and drinks made for both quick visits and full family dinners.", points: ["Nepali and Indian favorites", "Fresh momos and thali plates", "Vegetarian and non-vegetarian options", "Boba tea and chilled drinks"], cta: () => `${a("/menu/", "View Menus", "btn")}` },
    { title: "Snacks & Treats", icon: "treats", image: { src: "/assets/food/momos-bamboo-steamer.webp", width: 900, height: 601, alt: "Steamed momos in a bamboo steamer with orange dipping sauce" }, imageFit: "natural", description: "Explore light bites, street-style snacks, desserts, boba tea, lassi, soft drinks, and masala tea when you want something smaller or sweeter alongside your meal.", points: ["Chats, snacks, and munchies", "Desserts", "Boba tea options", "Lassi, tea, and soft drinks"], cta: () => orderGroup("services-snacks") },
    { title: "Catering Services", icon: "catering", image: { src: "/assets/restaurant/catering-900.webp", width: 900, height: 1200, alt: "Chafing dishes with fried rice and curry set up for catering" }, description: "Bring Nepali and Indian dishes to your next gathering with catering options for family parties, office lunches, celebrations, and community events. Catering is arranged by phone.", points: ["Menu planning for your group", "Pickup or service details by request"], cta: () => `${callButtons("services-catering", "catering")}<p>${a("/catering/", "Catering details")}</p>` },
    { title: "Private Events", icon: "events", image: bar, description: "Host birthdays, family dinners, team meals, and small celebrations with flavorful food and a comfortable space for your guests. Private events are arranged by phone.", points: ["Group dining support", "Menu options for guests", "Flexible seating help", "Friendly service from start to finish"], cta: () => `${callButtons("services-events", "events")}<p>${a("/private-events/", "Private event details")}</p>` },
  ];
  return `<section class="page-title services-title"><span class="eyebrow">What We Offer</span><h1>${h1Html("/services/")}</h1><p>Dine in, order takeout online, or call about catering and private events. Everyday meals, takeout and small celebrations with food that is easy to enjoy and share.</p></section><section class="service-rows">${services.map((service, index) => `<article class="service-row ${index % 2 ? "reverse" : ""}"><div class="service-photo ${service.imageFit || ""}"><img src="${A(service.image.src)}" alt="${esc(service.image.alt)}" width="${service.image.width}" height="${service.image.height}" loading="lazy" decoding="async" /></div><div class="service-detail"><div class="line-icon" aria-hidden="true">${iconSvg(service.icon)}</div><h2>${service.title}</h2><p>${service.description}</p><ul>${service.points.map((point) => `<li>${point}</li>`).join("")}</ul>${service.cta()}</div></article>`).join("")}</section>${servicesCta()}`;
}

function contactPage() {
  return `<section class="page-title locations-title">${breadcrumb("/contact/")}<span class="eyebrow">Get In Touch</span><h1>${h1Html("/contact/")}</h1><p>Find us in Grapevine and Dallas. Call your location for questions about dining, reservations, catering or private events. Catering and private events are arranged by phone.</p></section><section class="locations-contact" aria-label="Restaurant locations">${locations.map((location) => `<article class="location-contact-card"><div class="location-contact-details"><h2>${a(location.path, location.name)}</h2><address>${esc(location.address)}</address><button class="copy-location" type="button" data-copy="${esc(location.address)}">Copy Address</button><p>${phoneLink(location, "contact")}</p><h3>Opening Hours</h3>${locationHours(location)}<p class="hours-note">Closing times at or after midnight refer to the following day.</p><div class="location-contact-actions">${directionsLink(location, "contact")}${reserveLink(location, "contact")}${orderLink(location, "contact")}</div><p class="contact-events">Catering and private events: ${phoneLink(location, "contact", "catering")}</p>${socialLink(location)}${facebookLink(location)}${reviewLink(location)}${deliveryLinks(location)}</div><div class="location-map-wrap"><iframe class="location-map" src="${esc(location.mapEmbedUrl)}" title="Map for ${esc(location.name)} location" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen tabindex="-1"></iframe><a class="location-map-link" href="${esc(location.mapUrl)}" target="_blank" rel="noopener noreferrer"${track("directions_click", { location: location.id, placement: "contact-map" })} aria-label="Open in Google Maps, ${esc(location.name)} (opens in a new tab)"><span>Open in Google Maps<span aria-hidden="true"> ↗</span></span></a></div></article>`).join("")}</section>`;
}

function reservePage() {
  return `<section class="page-title reserve-title"><span class="eyebrow">Book Your Table</span><h1>${h1Html("/reserve/")}</h1><p>Plan your visit to ${esc(site.fullName)} and enjoy a relaxed meal with the people you care about.</p></section><section class="reservation-embed" aria-label="Reservation details"><div class="reservation-card"><span class="eyebrow">Reservations</span><h2>Choose Your Location</h2><p>Select Grapevine or Dallas to check availability and reserve through Google.</p><div class="hero-actions">${locations.map((l) => reserveLink(l, "reserve-page", `Reserve in ${l.name}`, "btn btn-gold")).join("")}</div></div></section>`;
}

function notFoundPage() {
  return `<section class="page-title not-found"><h1>Page not found</h1><p>This page is not available. Try one of these instead.</p><div class="hero-actions">${a("/", "Go Home", "btn btn-gold")}${a("/menu/", "View Menus", "btn")}${a("/contact/", "Contact", "btn")}</div></section>`;
}

// ---- router -----------------------------------------------------------------------------

export function renderRoute(ctx) {
  C = ctx;
  const path = ctx.path;
  let content;
  if (path === "/") content = homePage();
  else if (path === "/grapevine/" || path === "/dallas/") content = locationPage(path);
  else if (path === "/menu/") content = menuHubPage(ctx);
  else if (locationIdFromPath(path)) content = menuLocationPage(ctx, locationIdFromPath(path));
  else if (path === "/menu/print/") content = printMenuPage(ctx);
  else if (path === "/happy-hour/") content = happyHourPage();
  else if (path === "/catering/") content = cateringPage();
  else if (path === "/private-events/") content = privateEventsPage();
  else if (path === "/services/") content = servicesPage();
  else if (path === "/about/") content = aboutPage();
  else if (path === "/contact/") content = contactPage();
  else if (path === "/reserve/") content = reservePage();
  else content = notFoundPage();
  return { html: shell(content, routeByPath[path] ? path : "/404.html"), known: Boolean(routeByPath[path]) };
}

export { notFoundPage };
