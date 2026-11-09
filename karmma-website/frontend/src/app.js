// Browser glue: routing, page head updates, hydration of prerendered HTML, dialog, menus.
// Page markup itself lives in pages.js (shared with tools/prerender.mjs).
import { site, locations } from "./site-data.js";
import { renderRoute } from "./pages.js";
import { bindMenu } from "./menu.js";
import { routeByPath, notFoundRoute } from "./seo-routes.js";
import { jsonLdFor } from "./jsonld.js";
import { esc, hashString, track } from "./util.js";

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

function getContext() {
  return { path: routePath(), query: new URLSearchParams(window.location.search), appUrl, assetUrl };
}

// Old links like /menu/?location=dallas become the path form /menu/dallas/ (SEO-PLAN S-05).
function redirectLegacyMenuUrl() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("location");
  if (routePath() === "/menu/" && locations.some((location) => location.id === id)) {
    params.delete("location");
    const query = params.toString();
    history.replaceState(null, "", `${appUrl(`/menu/${id}/`)}${query ? `?${query}` : ""}${window.location.hash}`);
  }
}

function setHead(selector, attribute, value, create) {
  let element = document.head.querySelector(selector);
  if (!element && create) {
    element = document.createElement(create.tag);
    for (const [key, val] of Object.entries(create.attrs)) element.setAttribute(key, val);
    document.head.append(element);
  }
  if (element) element.setAttribute(attribute, value);
}

// Keeps title, description, canonical, robots, Open Graph, Twitter and JSON-LD in step with the route.
function applyHead(path, known) {
  const route = known ? routeByPath[path] : notFoundRoute;
  const canonical = `${site.url}${route.canonical || (known ? path : "/")}`;
  document.title = route.title;
  setHead('meta[name="description"]', "content", route.description, { tag: "meta", attrs: { name: "description" } });
  setHead('link[rel="canonical"]', "href", canonical, { tag: "link", attrs: { rel: "canonical" } });
  setHead('meta[name="robots"]', "content", route.robots || "index, follow, max-image-preview:large", { tag: "meta", attrs: { name: "robots" } });
  const image = route.og ? `${site.url}/assets/og/${route.og}` : "";
  for (const [selector, attribute, value] of [
    ['meta[property="og:title"]', "content", route.title], ['meta[property="og:description"]', "content", route.description],
    ['meta[property="og:url"]', "content", canonical], ['meta[name="twitter:title"]', "content", route.title], ['meta[name="twitter:description"]', "content", route.description],
    ...(image ? [['meta[property="og:image"]', "content", image], ['meta[name="twitter:image"]', "content", image], ['meta[property="og:image:alt"]', "content", route.ogAlt], ['meta[name="twitter:image:alt"]', "content", route.ogAlt]] : []),
  ]) setHead(selector, attribute, value);
  const data = known ? jsonLdFor(path) : null;
  let script = document.head.querySelector('script[type="application/ld+json"]');
  if (data) {
    if (!script) { script = document.createElement("script"); script.type = "application/ld+json"; document.head.append(script); }
    script.textContent = JSON.stringify(data);
  } else script?.remove();
}

function bind() {
  const dialog = document.querySelector(".location-dialog");
  if (dialog) {
    const actions = {
      order: { prompt: "Where would you like to order from?", label: "Order online", build: (location) => ({ href: location.orderUrl, attrs: track("order_click", { location: location.id, placement: "dialog", platform: location.orderPlatform }), note: location.orderProvider }) },
      reserve: { prompt: "Where would you like to reserve a table?", label: "Reserve a table", build: (location) => ({ href: location.reserveUrl, attrs: track("reserve_click", { location: location.id, placement: "dialog" }), note: "Google" }) },
      directions: { prompt: "Which location would you like to visit?", label: "Get directions", build: (location) => ({ href: location.directionsUrl, attrs: track("directions_click", { location: location.id, placement: "dialog" }), note: "Google Maps" }) },
    };
    let opener = null;
    document.querySelectorAll("[data-location-action]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        opener = button;
        const selection = actions[button.dataset.locationAction];
        if (!selection) return;
        dialog.querySelector("#location-description").textContent = selection.prompt;
        dialog.querySelector(".location-options").innerHTML = locations.map((location) => {
          const { href, attrs, note } = selection.build(location);
          return `<a class="location-option" href="${esc(href)}" target="_blank" rel="noopener noreferrer"${attrs}><strong>${esc(location.name)}</strong><span>${selection.label} on ${esc(note)} &#8599;<span class="sr-only"> (opens in a new tab)</span></span></a>`;
        }).join("");
        dialog.showModal();
      });
    });
    dialog.querySelector(".location-close").addEventListener("click", () => dialog.close());
    // Focus normally returns to the trigger. A trigger inside the mobile menu is done with after the action, so close that menu and put focus on the hamburger button.
    dialog.addEventListener("close", () => {
      if (!opener || !(opener.closest("[data-mobile-panel]") || !opener.getClientRects().length)) return;
      const toggle = document.querySelector("[data-menu-toggle]");
      document.querySelector("[data-mobile-panel]")?.classList.remove("open");
      toggle?.classList.remove("open");
      toggle?.setAttribute("aria-expanded", "false");
      toggle?.focus();
    });
    dialog.addEventListener("click", (event) => {
      const box = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) dialog.close();
    });
  }

  document.querySelectorAll("[data-link]").forEach((link) => link.addEventListener("click", (event) => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || link.target === "_blank") return;
    const href = link.getAttribute("href");
    if (!href || href.startsWith("http") || href.startsWith("tel:") || href.startsWith("mailto:")) return;
    event.preventDefault();
    const target = new URL(href, window.location.href);
    history.pushState(null, "", `${target.pathname}${target.search}${target.hash}`);
    render({ navigated: true });
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
  if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    items.forEach((item) => item.classList.add("visible"));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("visible"));
  }, { threshold: 0.15 });
  items.forEach((item) => observer.observe(item));
}

function afterNavigation() {
  const id = decodeURIComponent(window.location.hash.slice(1));
  const target = id && document.getElementById(id);
  if (target) {
    target.scrollIntoView({ behavior: "instant", block: "start" });
    target.focus?.({ preventScroll: true });
    return;
  }
  scrollTo({ top: 0, behavior: "instant" });
  const heading = document.querySelector("main h1");
  if (heading) {
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }
}

let firstRender = true;

function render({ navigated = false } = {}) {
  redirectLegacyMenuUrl();
  const ctx = getContext();
  const { html, known } = renderRoute(ctx);
  // Prerendered pages carry data-hash = hash of the markup this same code produces. If it
  // still matches, keep the existing DOM (no flash) and just attach behaviour; otherwise
  // (edited data, query string, other base path) render from scratch.
  const hydrate = firstRender && app.dataset.hash === hashString(html) && app.dataset.prerendered === ctx.path;
  if (!hydrate) app.innerHTML = html;
  delete app.dataset.hash;
  delete app.dataset.prerendered;
  applyHead(ctx.path, known);
  bind();
  bindMenu({ getContext, render: () => render() });
  reveal();
  if (navigated || (firstRender && window.location.hash)) afterNavigation();
  if (!firstRender) window.gtag?.("event", "page_view", { page_title: document.title, page_location: window.location.href, page_path: window.location.pathname });
  firstRender = false;
}

window.addEventListener("popstate", () => render({ navigated: false }));
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const panel = document.querySelector("[data-mobile-panel].open");
  if (panel) {
    panel.classList.remove("open");
    const toggle = document.querySelector("[data-menu-toggle]");
    toggle?.classList.remove("open");
    toggle?.setAttribute("aria-expanded", "false");
    toggle?.focus();
  }
  const group = document.activeElement?.closest?.(".nav-group");
  if (group) document.activeElement.blur();
});
render();
