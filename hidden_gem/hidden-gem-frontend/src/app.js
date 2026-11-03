import { navItems, site, locations } from "./site-data.js?v=karmma-contact-1";

const app = document.querySelector("#app");
const siteRoot = new URL("..", import.meta.url);
const basePath = siteRoot.pathname.endsWith("/") ? siteRoot.pathname : `${siteRoot.pathname}/`;

function appUrl(path) {
  if (!path || path.startsWith("#") || /^(https?:|mailto:|tel:)/.test(path)) return path;
  return `${basePath}${path.replace(/^\/+/, "")}`;
}

function assetUrl(path) {
  return new URL(path.replace(/^\/+/, ""), siteRoot).pathname;
}

function routePath(pathname = window.location.pathname) {
  let path = pathname;
  if (path.startsWith(basePath)) path = `/${path.slice(basePath.length)}`;
  if (!path.startsWith("/")) path = `/${path}`;
  return path.endsWith("/") ? path : `${path}/`;
}
const iconPin = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s6-4.35 6-10a6 6 0 1 0-12 0c0 5.65 6 10 6 10z"></path><circle cx="12" cy="11" r="2"></circle></svg>`;

function currentPath() {
  return routePath();
}

function pageLink(href, label, extra = "") {
  return `<a href="${appUrl(href)}" class="${extra}" data-link>${label}</a>`;
}

function linkAttrs(href) {
  return /^(https?:|mailto:|tel:)/.test(href) ? `href="${href}" target="_blank" rel="noopener"` : `href="${appUrl(href)}" data-link`;
}

function shell(content) {
  const path = currentPath();
  return `
    <nav class="navbar" data-navbar>
      <div class="nav-inner">
        <a href="${appUrl("/")}" class="brand" data-link>
          <span class="brand-logo"><img src="${assetUrl(site.logo)}" alt="${site.name}" /></span>
          <span class="brand-copy"><strong>${site.name}</strong><small>${site.tagline}</small></span>
        </a>
        <div class="nav-links">
          ${navItems.map(([label, href]) => `<a href="${appUrl(href)}" class="${path === href ? "active" : ""}" data-link>${label}</a>`).join("")}
        </div>
        <button class="menu-toggle" aria-label="Toggle menu" aria-expanded="false" data-menu-toggle><span></span><span></span><span></span></button>
      </div>
      <div class="mobile-panel" data-mobile-panel>
        ${navItems.map(([label, href]) => pageLink(href, label)).join("")}
      </div>
    </nav>
    <button type="button" class="visit-pill" data-location-action="directions" aria-haspopup="dialog"><span>${iconPin}</span>Visit Us</button>
    <main>${content}</main>
    ${footer()}
    <dialog class="location-dialog" aria-labelledby="location-title" aria-describedby="location-description">
      <button type="button" class="location-close" aria-label="Close location selection" autofocus>&times;</button>
      <h2 id="location-title">Choose your location</h2>
      <p id="location-description"></p>
      <div class="location-options"></div>
    </dialog>
  `;
}

function locationHours(location) {
  return `<dl class="location-hours">${location.hours.map(([day, time]) => `<div><dt>${day}</dt><dd>${time}</dd></div>`).join("")}</dl>`;
}

function locationSocial(location) {
  return location.instagram ? `<a class="location-social" href="${location.instagram}" target="_blank" rel="noopener noreferrer">${location.name} Instagram</a>` : "";
}

function footer() {
  return `<footer class="footer"><div class="footer-inner">
    <section><a href="${appUrl("/")}" class="footer-brand" data-link><img src="${assetUrl(site.logo)}" alt="${site.name}" /><span><strong>${site.name}</strong><small>${site.tagline}</small></span></a><p>Nepali and Indian favorites served with warm hospitality in Grapevine and Dallas.</p></section>
    <section><h3>Quick Links</h3>${navItems.map(([label, href]) => pageLink(href, label)).join("")}</section>
    ${locations.map(location => `<section class="footer-location"><h3>${location.name}</h3><address>${location.address}</address><a href="${location.phoneHref}">${location.phone}</a><h4>Opening Hours (CT)</h4>${locationHours(location)}<a href="${location.directionsUrl}" target="_blank" rel="noopener noreferrer">Get Directions</a>${locationSocial(location)}</section>`).join("")}
    </div><div class="footer-bottom"><p>&copy; 2026 Karmma and Kocktails. All rights reserved.</p><p>All hours are Central Time. Closing times at or after midnight refer to the following day.</p></div></footer>`;
}

function homePage() {
  return `
    <section class="hero">
      <div class="hero-bg"></div>
      <div class="particles">${Array.from({ length: 18 }, (_, i) => `<span style="--x:${(i * 37) % 100}%;--d:${6 + (i % 7)}s"></span>`).join("")}</div>
      <div class="hero-content">
        <img class="hero-logo" src="${assetUrl(site.logoMark)}" alt="${site.name} logo mark" />
        <h1>${site.name}</h1>
        <p>${site.tagline}</p>
        <div class="hero-actions">
          <button type="button" class="btn" data-location-action="order" aria-haspopup="dialog">Order Online</button>
          <a class="btn" href="${appUrl("/reserve/")}" data-link>Reserve a Table</a>
          <a class="btn" href="${appUrl("/menu/")}" data-link>View Menu</a>
        </div>
        <div class="scroll-cue"><span>Scroll to explore</span><i></i></div>
      </div>
    </section>
    <section class="feature-band">
      <div class="split">
        <div class="copy reveal"><span class="eyebrow">Signature Dish</span><h2>Karmma and Kocktails<br /><em>Thali Special</em></h2><p>A generous plate built for comfort and variety, with curry, dal, rice, bread, and sides served together so you can enjoy several Karmma and Kocktails favorites in one meal.</p><a class="btn" href="${appUrl("/menu/")}" data-link>Explore Menu</a></div>
        <div class="round-image reveal"><img src="${assetUrl("/assets/food/thali.png")}" alt="Karmma and Kocktails Thali Special" /></div>
      </div>
    </section>
    <section class="feature-band alt">
      <div class="split">
        <div class="round-image momo-feature-image reveal"><img src="${assetUrl("/assets/food/momos-bamboo-steamer.png")}" alt="Steamed momos in a bamboo steamer with orange dipping sauce" /></div>
        <div class="copy reveal"><span class="eyebrow">Handcrafted Delicacy</span><h2>Heavenly<br /><em>Steamed Momos</em></h2><p>Soft dumplings filled with savory flavor and served with chutney for a warm, satisfying bite. Choose them steamed, fried, or tossed in one of our house sauces.</p><button type="button" class="btn" data-location-action="order" aria-haspopup="dialog">Order Now</button></div>
      </div>
    </section>
    ${servicesPreview()}
    ${ctaBlock()}
  `;
}

function servicesPreview() {
  const services = [
    ["Dine-In", "Enjoy a relaxed dine-in meal with fresh food, friendly service, and a comfortable setting", "dining"],
    ["Catering", "Bring Karmma and Kocktails flavors to parties, office meals, and family gatherings", "catering"],
    ["Private Events", "Plan birthdays, team dinners, and celebrations with menu options that fit your group", "events"],
  ];
  return `<section class="section"><span class="eyebrow">What We Offer</span><h2>Our <em>Services</em></h2><p class="lead">Whether you are stopping in for dinner, planning an event, or ordering for a group, Karmma and Kocktails keeps the food flavorful and the service easy.</p><div class="card-grid">${services.map(([title, desc, icon]) => `<article class="service-card reveal"><div class="service-icon" aria-hidden="true">${iconSvg(icon)}</div><h3>${title}</h3><p>${desc}</p></article>`).join("")}</div></section>`;
}

function ctaBlock() {
  return `<section class="cta"><h2>Discover<br /><em>Karmma and Kocktails</em></h2><p>Visit us in Grapevine or Dallas for comforting curries, momos, noodles, and a menu made for sharing.</p><div class="hero-actions"><a class="btn" href="${appUrl("/reserve/")}" data-link>Reserve a Table</a><a class="btn" href="${appUrl("/menu/")}" data-link>View Menu</a><button type="button" class="btn" data-location-action="directions" aria-haspopup="dialog">Get Directions</button></div><div class="location-hours-grid">${locations.map(location => `<article><h3>${location.name}</h3><p>Opening Hours (CT)</p>${locationHours(location)}</article>`).join("")}</div><p class="hours-note">All hours are Central Time. Closing times at or after midnight refer to the following day.</p></section>`;
}

function servicesCta() {
  return `<section class="cta simple-cta"><h2>Ready to Visit<br /><em>Karmma and Kocktails?</em></h2><p>Tell us what you are planning and we will help with dine-in, catering, or private event details.</p><div class="hero-actions"><a class="btn" href="${appUrl("/contact/")}" data-link>Contact Us</a><a class="btn" href="${appUrl("/menu/")}" data-link>View Menu</a></div></section>`;
}

function aboutCta() {
  return `<section class="cta simple-cta"><h2>Come Experience the<br /><em>Karmma and Kocktails Difference</em></h2><p>Stop by for a flavorful meal, bring your family, or explore the menu before your next visit.</p><div class="hero-actions"><a class="btn" href="${appUrl("/menu/")}" data-link>View Menu</a><a class="btn" href="${appUrl("/contact/")}" data-link>Contact Us</a></div></section>`;
}

function menuPage() {
  return `<section class="page-title location-menu-title"><span class="eyebrow">Explore Our Menus</span><h1>Choose <em>Your Location</em></h1><p>Browse the menu for Grapevine or Dallas. Each menu opens in a new tab.</p></section><section class="location-menu-options" aria-label="Menus by location">${locations.map(location => `<a class="location-option" href="${escapeHtml(location.menuUrl)}" target="_blank" rel="noopener noreferrer"><strong>${escapeHtml(location.name)}</strong><span>View menu &#8599;</span></a>`).join("")}</section>`;
}

function aboutPage() {
  return `<section class="page-hero about-hero"><div><span class="eyebrow">Our Story</span><h1>About <em>Karmma and Kocktails</em></h1><p>Karmma and Kocktails brings Nepali and Indian favorites to Grapevine and Dallas with a menu built around bold flavors, comforting meals, and fresh-made favorites.</p><p>From momos and thali plates to curries, biryanis, noodles, and tea drinks, our kitchen focuses on generous portions, familiar comfort, and dishes guests will want to come back for.</p></div><div class="about-frame"><img src="${assetUrl("/assets/restaurant/main-restaurant.jpeg")}" alt="Karmma and Kocktails Entrance" /></div></section><section class="section values-section"><span class="eyebrow">What We Stand For</span><h2>Our <em>Values</em></h2><div class="card-grid values-grid">${["Excellence", "Authenticity", "Hospitality", "Sustainability"].map((v) => `<article class="service-card value-card"><div class="service-icon" aria-hidden="true">${iconSvg(valueIcon(v))}</div><h3>${v}</h3><p>${valueText(v)}</p></article>`).join("")}</div></section>${aboutCta()}`;
}

function servicesPage() {
  const services = [
    {
      title: "Fine Dining",
      icon: "dining",
      image: "/assets/restaurant/main-restaurant.jpeg",
      description: "Settle in for a comfortable meal with curries, momos, rice plates, noodles, snacks, and drinks made for both quick visits and full family dinners.",
      points: ["Nepali and Indian favorites", "Fresh momos and thali plates", "Vegetarian and non-vegetarian options", "Boba tea and chilled drinks"],
    },
    {
      title: "Snacks & Treats",
      icon: "treats",
      image: "/assets/food/momo-plate-with-momos.png",
      imageFit: "contain",
      description: "Explore light bites, street-style snacks, desserts, boba tea, lassi, soft drinks, and masala tea when you want something smaller or sweeter alongside your meal.",
      points: ["Chats, snacks, and munchies", "Desserts", "Boba tea options", "Lassi, tea, and soft drinks"],
    },
    {
      title: "Catering Services",
      icon: "catering",
      image: "/assets/restaurant/catering.jpg",
      description: "Bring Karmma and Kocktails dishes to your next gathering with catering options for family parties, office lunches, celebrations, and community events.",
      points: ["Menu planning for your group", "Pickup or service details by request"],
    },
    {
      title: "Private Events",
      icon: "events",
      image: "/assets/restaurant/main-restaurant.jpeg",
      description: "Host birthdays, family dinners, team meals, and small celebrations with flavorful food and a comfortable space for your guests.",
      points: ["Group dining support", "Menu options for guests", "Flexible seating help", "Friendly service from start to finish"],
    },
  ];
  return `<section class="page-title services-title"><span class="eyebrow">What We Offer</span><h1>Our <em>Services</em></h1><p>Karmma and Kocktails is here for everyday meals, takeout, catering, and small celebrations with food that is easy to enjoy and share.</p></section><section class="service-rows">${services.map((service, index) => `<article class="service-row ${index % 2 ? "reverse" : ""}"><div class="service-photo ${service.imageFit === "contain" ? "contain" : ""}"><img src="${assetUrl(service.image)}" alt="${service.title}" /></div><div class="service-detail"><div class="line-icon" aria-hidden="true">${iconSvg(service.icon)}</div><h2>${service.title}</h2><p>${service.description}</p><ul>${service.points.map((point) => `<li>${point}</li>`).join("")}</ul><a class="btn" href="${appUrl("/contact/")}" data-link>Inquire Now</a></div></article>`).join("")}</section>${servicesCta()}`;
}

function contactPage() {
  return `<section class="page-title locations-title"><span class="eyebrow">Get In Touch</span><h1>Visit <em>Our Locations</em></h1><p>Find us in Grapevine and Dallas. Call your location for questions about dining, catering, or reservations.</p></section><section class="locations-contact" aria-label="Restaurant locations">${locations.map(location => `<article class="location-contact-card"><h2>${location.name}</h2><address>${location.address}</address><button class="copy-location" type="button" data-copy="${escapeHtml(location.address)}">Copy Address</button><p><a href="${location.phoneHref}">${location.phone}</a></p><h3>Opening Hours (CT)</h3>${locationHours(location)}<p class="hours-note">Closing times at or after midnight refer to the following day.</p><div class="location-contact-actions"><a class="btn" href="${location.directionsUrl}" target="_blank" rel="noopener noreferrer">Get Directions</a><a class="btn" href="${location.reserveUrl}" target="_blank" rel="noopener noreferrer">Reserve a Table</a></div>${locationSocial(location)}</article>`).join("")}</section>`;
}

function reservePage() {
  return `<section class="page-title reserve-title"><span class="eyebrow">Book Your Table</span><h1>Reserve <em>a Table</em></h1><p>Plan your visit to Karmma and Kocktails and enjoy a relaxed meal with the people you care about.</p></section><section class="reservation-embed" aria-label="Reservation details"><div class="reservation-card"><span class="eyebrow">Reservations</span><h2>Choose Your Location</h2><p>Select Grapevine or Dallas to check availability and reserve through Google.</p><div class="hero-actions"><button type="button" class="btn btn-gold" data-location-action="reserve" aria-haspopup="dialog">Reserve a Table</button></div></div></section>`;
}

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

function valueIcon(value) {
  return {
    Excellence: "star",
    Authenticity: "heart",
    Hospitality: "hospitality",
    Sustainability: "leaf",
  }[value] || "star";
}

function valueText(value) {
  return {
    Excellence: "We focus on flavorful food, clean presentation, and consistent service.",
    Authenticity: "We respect familiar recipes while giving guests a wide menu to explore.",
    Hospitality: "Every guest should feel welcomed, comfortable, and taken care of.",
    Sustainability: "We choose practical, thoughtful improvements that support better food and service.",
  }[value];
}

function phoneIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.19 19a19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.13.96.35 1.89.66 2.78a2 2 0 0 1-.45 2.11L8 9.88a16 16 0 0 0 6.12 6.12l1.27-1.27a2 2 0 0 1 2.11-.45c.89.31 1.82.53 2.78.66A2 2 0 0 1 22 16.92z"></path></svg>`;
}

function mailIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v16H4z"></path><path d="m22 6-10 7L2 6"></path></svg>`;
}

function notFoundPage() {
  return `<section class="page-title"><h1>Page not found</h1><p>This page is not available.</p><a class="btn" href="/" data-link>Go Home</a></section>`;
}

function render() {
  const path = currentPath();
  const routes = {
    "/": homePage,
    "/menu/": menuPage,
    "/menu/print/": menuPage,
    "/services/": servicesPage,
    "/about/": aboutPage,
    "/contact/": contactPage,
    "/reserve/": reservePage,
  };
  app.innerHTML = shell((routes[path] || notFoundPage)());
  bind();
  reveal();
}

function bind() {
  // Menu and reservation entry points share the location picker, including navigation.
  document.querySelectorAll("a[data-link]").forEach((link) => {
    const action = link.getAttribute("href") === appUrl("/menu/") ? "menu" : link.getAttribute("href") === appUrl("/reserve/") ? "reserve" : null;
    if (action) {
      link.removeAttribute("data-link");
      link.dataset.locationAction = action;
      link.setAttribute("aria-haspopup", "dialog");
    }
  });
  const dialog = document.querySelector(".location-dialog");
  if (dialog) {
    document.querySelectorAll("[data-location-action]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const action = button.dataset.locationAction;
        const actions = {
          order: { field: "orderUrl", prompt: "Where would you like to order from?", label: "Order online" },
          menu: { field: "menuUrl", prompt: "Which location's menu would you like to view?", label: "View menu" },
          reserve: { field: "reserveUrl", prompt: "Where would you like to reserve a table?", label: "Reserve a table" },
          directions: { field: "directionsUrl", prompt: "Which location would you like to visit?", label: "Get directions" },
        };
        const selection = actions[action];
        if (!selection) return;
        dialog.querySelector("#location-description").textContent = selection.prompt;
        dialog.querySelector(".location-options").innerHTML = locations.map((location) =>
          `<a class="location-option" href="${escapeHtml(location[selection.field])}" target="_blank" rel="noopener noreferrer"><strong>${escapeHtml(location.name)}</strong><span>${selection.label} &#8599;</span></a>`
        ).join("");
        dialog.showModal();
      });
    });
    dialog.querySelector(".location-close").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      const box = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) dialog.close();
    });
  }

  document.querySelectorAll("[data-link]").forEach((link) => link.addEventListener("click", (event) => {
    const href = link.getAttribute("href");
    if (!href || href.startsWith("http") || href.startsWith("tel:") || href.startsWith("mailto:")) return;
    event.preventDefault();
    const target = new URL(href, window.location.href);
    history.pushState(null, "", `${target.pathname}${target.search}${target.hash}`);
    render();
    scrollTo({ top: 0, behavior: "instant" });
  }));

  document.querySelector("[data-menu-toggle]")?.addEventListener("click", () => {
    const panel = document.querySelector("[data-mobile-panel]");
    const toggle = document.querySelector("[data-menu-toggle]");
    panel?.classList.toggle("open");
    toggle?.classList.toggle("open");
    toggle?.setAttribute("aria-expanded", panel?.classList.contains("open") ? "true" : "false");
  });

  document.querySelectorAll("[data-copy]").forEach((button) => button.addEventListener("click", async () => {
    const value = button.getAttribute("data-copy") || "";
    const original = button.textContent;
    try {
      await navigator.clipboard.writeText(value);
      button.textContent = "Copied";
    } catch {
      button.textContent = value;
    }
    setTimeout(() => {
      button.textContent = original;
    }, 1600);
  }));

}

function reveal() {
  const items = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("visible"));
  }, { threshold: 0.15 });
  items.forEach((item) => observer.observe(item));
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

window.addEventListener("popstate", render);
render();
