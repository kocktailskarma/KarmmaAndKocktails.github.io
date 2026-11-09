// Single source of truth for brand, navigation and per-location facts.
// Fields marked OWNER are optional: leave them empty ("" or []) and the site simply
// does not show that item. Fill one in and it appears on the next load; run
// `node tools/prerender.mjs` afterwards so the static pages pick it up too.

export const site = {
  name: "Karmma & Kocktails",
  fullName: "Karmma & Kocktails",
  // Search-engine only (JSON-LD alternateName + meta keywords). Never shown on the page. Owner decision 2026-11-09: the visible spelling is "Karmma" only.
  alternateNames: ["Karma & Kocktails", "Karma and Kocktails", "Karmma and Kocktails"],
  tagline: "Nepali & Indian Restaurant & Bar",
  url: "https://www.karmmankocktails.com",
  logo: "/assets/brand/karmma-kocktails-256.webp", // small UI logo (256 px)
  logoFull: "/assets/brand/karmma-kocktails.jpg", // 900 x 900 original: schema logo, social image fallback
  gaId: "G-HZ8LLF7ZZ8",
  // Search Console HTML-tag verification, copied unchanged from the old site's index.html.
  googleSiteVerification: "aSytc48HLpP33W4zWWhlHCbSaCGaJtDFlGNvIuO-ixE",
  priceRange: "$$", // used only in structured data; confirm with the owner
  sameAs: [], // OWNER: brand-level profiles (Facebook, TikTok, Yelp, TripAdvisor URLs)
  aboutStory: [], // OWNER: paragraphs of the real brand story; shown on /about/ when filled
  allergenNotice: "", // OWNER: e.g. an allergy note; shown on menu pages and in the footer when filled
  alcoholNotice: "", // OWNER: age/responsible-drinking wording; shown where alcohol is served when filled
};

// Header navigation. "Locations" is a group; "Order Online" is rendered separately.
export const navItems = [
  { label: "Menu", href: "/menu/" },
  { label: "Locations", href: "/#locations", children: [{ label: "Grapevine", href: "/grapevine/" }, { label: "Dallas", href: "/dallas/" }], match: ["/grapevine/", "/dallas/"] },
  { label: "Happy Hour", href: "/happy-hour/" },
  { label: "Catering", href: "/catering/" },
  { label: "About", href: "/about/" },
  { label: "Contact", href: "/contact/" },
];

export const footerLinks = [
  ["Home", "/"], ["Menu", "/menu/"], ["Grapevine", "/grapevine/"], ["Dallas", "/dallas/"], ["Happy Hour", "/happy-hour/"],
  ["Catering", "/catering/"], ["Private Events", "/private-events/"], ["Dine-In & Takeout", "/services/"], ["About", "/about/"], ["Contact", "/contact/"], ["Reserve", "/reserve/"],
];

// Confirmed by the manager (2026-11-08) for both locations. Closing times at or after
// midnight belong to the following day. opens/closes are 24-hour strings.
const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const hoursSpec = [
  { days: ["Monday", "Tuesday", "Wednesday", "Thursday"], opens: "11:00", closes: "00:00" },
  { days: ["Friday", "Saturday"], opens: "11:00", closes: "02:00" },
  { days: ["Sunday"], opens: "12:00", closes: "00:00" },
];
function clock(value) {
  const [h, m] = value.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
const hours = weekdays.map((day) => {
  const spec = hoursSpec.find((s) => s.days.includes(day));
  return [day, `${clock(spec.opens)} - ${clock(spec.closes)}`];
});

export const locations = [
  {
    id: "grapevine",
    name: "Grapevine",
    path: "/grapevine/",
    menuPath: "/menu/grapevine/",
    area: "Main Street",
    containedIn: "",
    street: "120 S Main St, Suite 50",
    city: "Grapevine",
    region: "TX",
    postalCode: "76051",
    address: "120 S Main St, Suite 50, Grapevine, TX 76051, USA",
    phone: "(682) 223-1123",
    phoneHref: "tel:+16822231123",
    phoneIntl: "+1-682-223-1123",
    geo: { lat: 32.9399382, lng: -97.0785316 },
    hours,
    // Official Google "Embed a map" URL (taken from the old live site).
    mapEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3348.4192732215133!2d-97.07853159999999!3d32.9399382!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x864c2bbd403dea43%3A0x122183654f577741!2sKarmma%20%26%20kocktails%20by%20Teatro!5e0!3m2!1sen!2sin!4v1759775486939!5m2!1sen!2sin",
    mapUrl: "https://www.google.com/maps/place/Karma+%26+Kocktails+Restaurant+%26+Bar/@32.9399382,-97.0785316,17z/data=!4m15!1m8!3m7!1s0x864c2b3bdbbb2213:0x7582245e74000ea1!2s120+S+Main+St+Ste+50,+Grapevine,+TX+76051!3b1!8m2!3d32.9399382!4d-97.0785316!16s%2Fg%2F11l6lgr6r_!3m5!1s0x864c2bbd403dea43:0x122183654f577741!8m2!3d32.9399382!4d-97.0785316!16s%2Fg%2F11x_nbghw7?entry=ttu&g_ep=EgoyMDI2MTEwMS4wIKXMDSoASAFQAw%3D%3D",
    directionsUrl: "https://maps.app.goo.gl/uTUKaAPoKi7F6Hhk7",
    reserveUrl: "https://www.google.com/maps/reserve/v/dine/c/d2eosVQaoB0?hl=en-US",
    orderUrl: "https://order.toasttab.com/online/teatro-karma-kocktails-120-s-main-st-suite-50?diningOption=takeout",
    orderProvider: "Toast",
    orderPlatform: "toast",
    instagram: "https://www.instagram.com/karmma_and_kocktails/",
    // OWNER fields (all optional; empty = hidden)
    facebook: "",
    reviewUrl: "", // the Google "Get more reviews" link; renders a "Leave a review" link
    delivery: [], // [{ name: "DoorDash", url: "https://..." }] extra ordering/delivery links
    parking: "", // one or two sentences about parking
    happyHourDays: "", // e.g. "Monday to Friday"; Grapevine happy hour: only if the owner confirms one
    formerName: "", // e.g. "Teatro Bistro & Cocktail Lounge": renders "We are in the former ... space."
    cateringDetails: "", // lead time, minimum order, service area (phone-only inquiries)
    eventDetails: "", // capacity, minimums, lead time (phone-only inquiries)
    cateringMenuPdf: "", // path such as "/assets/menus/catering-grapevine.pdf" once the owner approves publishing prices
    gallery: [], // [{ src: "/assets/gallery/bar.webp", alt: "Describe the photo", width: 800, height: 600 }]
    seoImages: [], // absolute https URLs of real location photos for structured data
  },
  {
    id: "dallas",
    name: "Dallas",
    path: "/dallas/",
    menuPath: "/menu/dallas/",
    area: "Trinity Groves",
    containedIn: "Trinity Groves", // structured data containedInPlace; OWNER to confirm 3011 Gulden Ln is inside the complex (empty it if not)
    street: "3011 Gulden Ln, Unit 102",
    city: "Dallas",
    region: "TX",
    postalCode: "75212",
    address: "3011 Gulden Ln, Unit 102, Dallas, TX 75212, USA",
    phone: "(469) 722-1100",
    phoneHref: "tel:+14697221100",
    phoneIntl: "+1-469-722-1100",
    geo: { lat: 32.7794147, lng: -96.828361 },
    hours,
    mapEmbedUrl: "https://www.google.com/maps?q=3011%20Gulden%20Ln%2C%20Unit%20102%2C%20Dallas%2C%20TX%2075212&output=embed", // OWNER/DEV: replace with the official "Embed a map" URL from Google Maps (Share > Embed a map)
    mapUrl: "https://www.google.com/maps/place/Karma+%26+kocktails+Restaurant+%26+Bar/@32.7794147,-96.828361,17z/data=!4m15!1m8!3m7!1s0x864e996769dd2fed:0xcff5a6012f42ddd7!2s3011+Gulden+Ln+%23102,+Dallas,+TX+75212!3b1!8m2!3d32.7794147!4d-96.828361!16s%2Fg%2F11n024w29_!3m5!1s0x864e990044d9384d:0x735efd258d52721c!8m2!3d32.7791219!4d-96.8279935!16s%2Fg%2F11z3zk_flg?entry=ttu&g_ep=EgoyMDI2MTEwMS4wIKXMDSoASAFQAw%3D%3D",
    directionsUrl: "https://maps.app.goo.gl/ALyZLgiMujUwfLEb9",
    reserveUrl: "https://www.google.com/maps/reserve/v/dine/c/3GkXYd-I7G0?hl=en-US",
    // Owner confirmed 2026-11-09: Clover Online is the official Dallas ordering link.
    orderUrl: "https://karmmaandkocktails.cloveronline.com",
    orderProvider: "Clover",
    orderPlatform: "clover",
    instagram: "", // OWNER: Dallas Instagram URL
    facebook: "",
    reviewUrl: "",
    delivery: [],
    parking: "",
    happyHourDays: "", // OWNER: e.g. "Monday to Friday"
    formerName: "",
    cateringDetails: "",
    eventDetails: "",
    cateringMenuPdf: "",
    gallery: [],
    seoImages: [],
  },
];

export const bySlug = Object.fromEntries(locations.map((location) => [location.id, location]));
