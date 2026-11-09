// Route manifest (SEO-PLAN S-04): the only place page titles, descriptions, H1s and share
// images live. Values are copied from seo-assets/meta-tags.md. The prerender script asserts:
// title <= 65 chars, description <= 160 chars, both unique, one H1, no "{{" left behind.
// robots: "index" pages are listed in sitemap.xml; "noindex" pages are not.
import { bySlug } from "./site-data.js";
import { menus } from "./menu-data.js";

const BRAND = "Karmma & Kocktails";

function happyHour() {
  const time = menus.dallas.categories.find((category) => category.type === "happy-hour")?.description.replace("–", "to") || "";
  const days = bySlug.dallas.happyHourDays;
  const when = [days, time].filter(Boolean).join(", ");
  return when;
}

export function happyHourDescription() {
  return `Happy hour ${happyHour()} at ${BRAND} in Trinity Groves, Dallas. $9 bites, $8 cocktails and martinis, $4 domestic beer.`;
}

export const routes = [
  { path: "/", title: `${BRAND} | Nepali & Indian Restaurant & Bar`, description: `${BRAND} serves Nepali and Indian food with a full bar in Grapevine and Dallas, TX. Momos, thali, curries, biryani, tandoori, cocktails.`, h1: `${BRAND}: Nepali & Indian Restaurant and Bar in Grapevine and Dallas, TX`, og: "og-home.jpg", ogAlt: "Karmma & Kocktails: Nepali and Indian restaurant and bar in Grapevine and Dallas", jsonld: "organization" },
  { path: "/grapevine/", title: `Nepali & Indian Restaurant Grapevine | ${BRAND}`, description: "Nepali and Indian restaurant and bar at 120 S Main St, Grapevine, TX. Momos, thali, curries, biryani, tandoori, cocktails. Dine-in, takeout, order online.", h1: `${BRAND} Grapevine: Nepali & Indian Restaurant and Bar`, og: "og-grapevine.jpg", ogAlt: "Thali plate from Karmma & Kocktails Grapevine", jsonld: "grapevine" },
  { path: "/dallas/", title: `Nepali & Indian Restaurant Dallas | ${BRAND}`, description: "Nepali and Indian restaurant and bar at 3011 Gulden Ln in Trinity Groves, Dallas. Momos, curries, tandoori, cocktails, happy hour. Order online or dine in.", h1: `${BRAND} Dallas: Nepali & Indian Restaurant and Bar in Trinity Groves`, og: "og-dallas.jpg", ogAlt: "Steamed momos from Karmma & Kocktails Dallas", jsonld: "dallas" },
  { path: "/menu/", title: `Menus: Grapevine & Dallas | ${BRAND}`, description: `Browse the ${BRAND} menus for Grapevine and Dallas: momos, thali, curries, biryani, tandoori, desserts and drinks. Order online.`, h1: "Menus: Grapevine and Dallas", og: "og-menu.jpg", ogAlt: "Menus for Karmma & Kocktails in Grapevine and Dallas" },
  { path: "/menu/grapevine/", title: `Grapevine Menu: Momos & Curries | ${BRAND}`, description: "Full Grapevine menu with prices: momos, Himalayan Thakali set, curries, biryani, tandoori, naan, fried rice, noodles and desserts. Order online for takeout.", h1: "Grapevine Menu", og: "og-menu-grapevine.jpg", ogAlt: "Momos from the Karmma & Kocktails Grapevine menu", jsonld: "menu-grapevine" },
  { path: "/menu/dallas/", title: `Dallas Menu: Momos & Cocktails | ${BRAND}`, get description() { return `Dallas menu with prices: momos, Himalayan Thakali set, curries, biryani, cocktails, martinis, wine, beer and happy hour. Order on ${bySlug.dallas.orderProvider}.`; }, h1: "Dallas Menu", og: "og-menu-dallas.jpg", ogAlt: "Thali plate from the Karmma & Kocktails Dallas menu", jsonld: "menu-dallas" },
  { path: "/happy-hour/", title: `Happy Hour in Trinity Groves, Dallas | ${BRAND}`, get description() { return happyHourDescription(); }, h1: "Happy Hour in Trinity Groves, Dallas", og: "og-happy-hour.jpg", ogAlt: "Happy hour at Karmma & Kocktails in Trinity Groves, Dallas", jsonld: "breadcrumb" },
  { path: "/catering/", title: `Indian & Nepali Catering in DFW | ${BRAND}`, description: "Indian and Nepali catering for parties, office lunches and events in Grapevine, Dallas and across DFW. Biryani, curries, momos and more. Call to order.", h1: "Indian & Nepali Catering in Grapevine, Dallas and DFW", og: "og-catering.jpg", ogAlt: "Catering from Karmma & Kocktails", jsonld: "breadcrumb" },
  { path: "/private-events/", title: `Private Events in Grapevine & Dallas | ${BRAND}`, description: `Host birthdays, team dinners and celebrations at ${BRAND} in Grapevine or Dallas. Group menus and seating help. Call to book.`, h1: "Private Events and Group Dining", og: "og-events.jpg", ogAlt: "Private events at Karmma & Kocktails", jsonld: "breadcrumb" },
  { path: "/services/", title: `Dine-In, Takeout & Online Ordering | ${BRAND}`, description: `Dine in, order takeout, or call about catering and private events at ${BRAND} in Grapevine and Dallas. Nepali and Indian food, full bar.`, h1: `Ways to Enjoy ${BRAND}`, og: "og-home.jpg", ogAlt: "Karmma & Kocktails: dine-in, takeout and online ordering" },
  { path: "/about/", title: `Our Story: Nepali Flavors in Texas | ${BRAND}`, description: `The story behind ${BRAND}: Nepali and Indian food, momos and cocktails in Grapevine and Dallas, Texas.`, h1: `The Story of ${BRAND}`, og: "og-about.jpg", ogAlt: "About Karmma & Kocktails", jsonld: "breadcrumb" },
  { path: "/contact/", title: `Contact, Hours & Directions | ${BRAND}`, description: `Address, phone numbers, hours and directions for ${BRAND} in Grapevine (120 S Main St) and Dallas (3011 Gulden Ln, Trinity Groves).`, h1: "Visit Us: Grapevine and Dallas", og: "og-home.jpg", ogAlt: "Visit Karmma & Kocktails in Grapevine and Dallas", jsonld: "breadcrumb" },
  { path: "/reserve/", title: `Reserve a Table: Grapevine & Dallas | ${BRAND}`, description: `Reserve a table at ${BRAND} in Grapevine or Dallas through Google. Choose your location to check availability.`, h1: "Reserve a Table", og: "og-home.jpg", ogAlt: "Reserve a table at Karmma & Kocktails" },
  { path: "/menu/print/", title: `Printable Menu | ${BRAND}`, description: `Printable menu for ${BRAND}.`, h1: "Printable Menu", robots: "noindex, follow", canonical: "/menu/", og: "" },
];

export const notFoundRoute = { path: "/404.html", title: `Page not found | ${BRAND}`, description: `This page is not available. Visit the ${BRAND} home page, menus or contact page.`, h1: "Page not found", robots: "noindex", og: "" };

export const routeByPath = Object.fromEntries(routes.map((route) => [route.path, route]));
export const BRAND_NAME = BRAND;
