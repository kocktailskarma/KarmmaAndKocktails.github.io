// Structured data (JSON-LD) built from the same data the pages use, so phone, address,
// hours and prices can never drift from the visible text. Mirrors seo-assets/jsonld-*.json
// (without the _todo keys). No reviews or ratings, and no email anywhere (phone-only inquiries).
import { site, locations, bySlug, hoursSpec } from "./site-data.js";
import { menus } from "./menu-data.js";
import { routeByPath } from "./seo-routes.js";

const ORIGIN = site.url;
const abs = (path) => `${ORIGIN}${path}`;
const PLATFORMS = ["http://schema.org/DesktopWebPlatform", "http://schema.org/MobileWebPlatform"];

function breadcrumb(id, crumbs) {
  return {
    "@type": "BreadcrumbList",
    "@id": id,
    itemListElement: crumbs.map(([name, path], index) => ({ "@type": "ListItem", position: index + 1, name, item: abs(path) })),
  };
}

export function breadcrumbTrail(path) {
  const trails = {
    "/grapevine/": [["Home", "/"], ["Grapevine", "/grapevine/"]],
    "/dallas/": [["Home", "/"], ["Dallas", "/dallas/"]],
    "/menu/grapevine/": [["Home", "/"], ["Menus", "/menu/"], ["Grapevine Menu", "/menu/grapevine/"]],
    "/menu/dallas/": [["Home", "/"], ["Menus", "/menu/"], ["Dallas Menu", "/menu/dallas/"]],
    "/happy-hour/": [["Home", "/"], ["Happy Hour", "/happy-hour/"]],
    "/catering/": [["Home", "/"], ["Catering", "/catering/"]],
    "/private-events/": [["Home", "/"], ["Private Events", "/private-events/"]],
    "/about/": [["Home", "/"], ["About", "/about/"]],
    "/contact/": [["Home", "/"], ["Contact", "/contact/"]],
  };
  return trails[path] || null;
}

function organization() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": abs("/#organization"),
        name: site.name,
        alternateName: site.alternateNames,
        url: abs("/"),
        logo: { "@type": "ImageObject", url: abs(site.logoFull), width: 900, height: 900 },
        image: abs(site.logoFull),
        description: "Nepali and Indian restaurants with a full bar in Grapevine and Dallas, Texas. Dine-in, takeout, online ordering, catering and private events.",
        sameAs: [...locations.map((l) => l.instagram).filter(Boolean), ...locations.map((l) => l.facebook).filter(Boolean), ...site.sameAs],
        contactPoint: locations.map((l) => ({ "@type": "ContactPoint", name: `${l.name}: questions, catering and private events`, telephone: l.phoneIntl, contactType: "customer service", areaServed: "US-TX", availableLanguage: "English" })),
        subOrganization: locations.map((l) => ({ "@id": abs(`${l.path}#restaurant`) })),
      },
      {
        "@type": "WebSite",
        "@id": abs("/#website"),
        name: site.name,
        alternateName: site.alternateNames,
        url: abs("/"),
        inLanguage: "en-US",
        publisher: { "@id": abs("/#organization") },
      },
    ],
  };
}

function restaurant(location) {
  const route = routeByPath[location.path];
  const images = location.seoImages.length ? location.seoImages : [abs(site.logoFull)];
  const description = location.id === "grapevine"
    ? "Nepali and Indian restaurant and full bar on Main Street in Grapevine, Texas. Momos, Himalayan Thakali set, curries, biryani, tandoori, naan, chaat, desserts and cocktails. Dine-in, takeout and online ordering."
    : "Nepali and Indian restaurant and full bar in Trinity Groves, Dallas. Momos, Himalayan Thakali set, curries, biryani, tandoori, cocktails, martinis, wine, beer and happy hour. Dine-in, takeout and online ordering.";
  const entry = (urlTemplate) => ({ "@type": "EntryPoint", urlTemplate, inLanguage: "en-US", actionPlatform: PLATFORMS });
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Restaurant", "BarOrPub"],
        "@id": abs(`${location.path}#restaurant`),
        name: `${site.name} ${location.name}`,
        alternateName: [`Karma & Kocktails ${location.name}`, `Karma and Kocktails ${location.name}`, `Karmma and Kocktails ${location.name}`, ...site.alternateNames.slice(0, 3)],
        url: abs(location.path),
        description,
        image: images,
        logo: abs(site.logoFull),
        telephone: location.phoneIntl,
        address: { "@type": "PostalAddress", streetAddress: location.street, addressLocality: location.city, addressRegion: location.region, postalCode: location.postalCode, addressCountry: "US" },
        geo: { "@type": "GeoCoordinates", latitude: location.geo.lat, longitude: location.geo.lng },
        hasMap: location.directionsUrl,
        ...(location.containedIn ? { containedInPlace: { "@type": "Place", name: location.containedIn } } : {}),
        openingHoursSpecification: hoursSpec.map((spec) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: spec.days.length === 1 ? spec.days[0] : spec.days, opens: spec.opens, closes: spec.closes })),
        servesCuisine: ["Nepalese", "Indian", "Himalayan"],
        priceRange: site.priceRange,
        currenciesAccepted: "USD",
        menu: abs(location.menuPath),
        hasMenu: { "@type": "Menu", "@id": abs(`${location.menuPath}#menu`), name: `${site.name} ${location.name} Menu`, url: abs(location.menuPath), inLanguage: "en-US" },
        acceptsReservations: true,
        parentOrganization: { "@id": abs("/#organization") },
        ...([location.instagram, location.facebook].filter(Boolean).length ? { sameAs: [location.instagram, location.facebook].filter(Boolean) } : {}),
        potentialAction: [
          { "@type": "ReserveAction", target: entry(location.reserveUrl), result: { "@type": "Reservation", name: `Reserve a table at ${site.name} ${location.name}` } },
          { "@type": "OrderAction", target: entry(location.orderUrl), deliveryMethod: "http://purl.org/goodrelations/v1#DeliveryModePickUp" },
        ],
      },
      breadcrumb(abs(`${location.path}#breadcrumb`), breadcrumbTrail(location.path)),
    ],
  };
}

function menuNode(location) {
  const menu = menus[location.id];
  const offer = (name, price) => ({ "@type": "Offer", ...(name ? { name } : {}), price: price.toFixed(2), priceCurrency: "USD" });
  return {
    "@type": "Menu",
    "@id": abs(`${location.menuPath}#menu`),
    name: `${site.name} ${location.name} Menu`,
    url: abs(location.menuPath),
    inLanguage: "en-US",
    hasMenuSection: menu.categories.map((category) => ({
      "@type": "MenuSection",
      name: category.name,
      ...(category.description ? { description: category.description } : {}),
      hasMenuItem: category.items.map((item) => ({
        "@type": "MenuItem",
        name: item.name,
        ...(item.description ? { description: item.description } : {}),
        ...(item.vegetarian ? { suitableForDiet: "https://schema.org/VegetarianDiet" } : {}),
        ...(Array.isArray(item.price) ? { offers: item.price.map(([name, price]) => offer(name, price)) } : item.price === null ? {} : { offers: offer("", item.price) }),
      })),
    })),
  };
}

export function jsonLdFor(path) {
  const route = routeByPath[path];
  const kind = route?.jsonld;
  if (kind === "organization") return organization();
  if (kind === "grapevine" || kind === "dallas") return restaurant(bySlug[kind]);
  if (kind === "menu-grapevine" || kind === "menu-dallas") {
    const location = bySlug[kind.replace("menu-", "")];
    return { "@context": "https://schema.org", "@graph": [menuNode(location), breadcrumb(abs(`${location.menuPath}#breadcrumb`), breadcrumbTrail(location.menuPath))] };
  }
  if (kind === "breadcrumb") return { "@context": "https://schema.org", ...breadcrumb(abs(`${path}#breadcrumb`), breadcrumbTrail(path)) };
  return null;
}
