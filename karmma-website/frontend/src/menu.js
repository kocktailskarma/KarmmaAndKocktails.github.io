import { menus } from './menu-data.js';
import { locations, bySlug, site } from './site-data.js';
import { esc as escape, track } from './util.js';

const money = price => `$${price.toFixed(2)}`;
const typeNames = { food: 'Food', drinks: 'Drinks', 'happy-hour': 'Happy Hour' };
const imageIcon = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M8 30a16 16 0 0 1 32 0M5 34h38M24 10v4M20 10h8"/></svg>';

export const locationIdFromPath = path => (path.match(/^\/menu\/(grapevine|dallas)\/?$/) || [])[1] || '';

export function menuHasBar(locationId) {
  return menus[locationId].categories.some(category => category.alcohol);
}

function state(ctx, locationId) {
  const params = ctx.query;
  const menu = menus[locationId];
  const types = [...new Set(menu.categories.map(category => category.type))];
  return { locationId, menu, types, type: types.includes(params.get('type')) ? params.get('type') : 'food', search: params.get('q') || '', filter: ['vegetarian', 'photos'].includes(params.get('filter')) ? params.get('filter') : '' };
}

function prices(item) {
  if (item.price === null) return '<span class="price-pending">Ask for price</span>';
  if (Array.isArray(item.price)) return `<dl class="dish-options">${item.price.map(([name, price]) => `<div><dt>${escape(name)}</dt><dd>${money(price)}</dd></div>`).join('')}</dl>`;
  return `<strong class="dish-price">${money(item.price)}</strong>`;
}

function card(item, assetUrl) {
  return `<article class="menu-card${item.image ? '' : ' no-photo'}">
    <div class="dish-image">${item.image ? `<img src="${escape(assetUrl(item.image))}" alt="${escape(item.name)}" loading="lazy" decoding="async" width="160" height="160">` : imageIcon}</div>
    <div class="dish-copy"><div class="dish-head"><h3>${escape(item.name)}</h3>${!Array.isArray(item.price) ? prices(item) : ''}</div>
    ${item.description ? `<p>${escape(item.description)}</p>` : ''}${Array.isArray(item.price) ? prices(item) : ''}
    ${item.vegetarian ? '<div class="tags"><span>Vegetarian</span></div>' : ''}</div>
  </article>`;
}

function filteredCategories(current, type) {
  const query = current.search.trim().toLocaleLowerCase();
  return current.menu.categories.filter(category => category.type === type).map(category => ({ ...category, items: category.items.filter(item => {
    const options = Array.isArray(item.price) ? item.price.map(([name]) => name).join(' ') : '';
    return (!query || `${category.name} ${category.description} ${item.name} ${item.description} ${options}`.toLocaleLowerCase().includes(query)) &&
      (current.filter !== 'vegetarian' || item.vegetarian) && (current.filter !== 'photos' || item.image);
  }) })).filter(category => category.items.length);
}

function categoryHtml(category, assetUrl) {
  return `<section id="menu-${category.id}" class="menu-category" aria-labelledby="heading-${category.id}"><h2 id="heading-${category.id}" tabindex="-1">${escape(category.name)}</h2><i aria-hidden="true"></i>${category.description ? `<p>${escape(category.description)}</p>` : ''}<div class="menu-grid">${category.items.map(item => card(item, assetUrl)).join('')}</div></section>`;
}

// Every menu type is rendered into the page (crawlable); the inactive types carry `hidden`
// and a CSS/JS tab switch shows them. Pills and the item count describe the active type.
function results(current, assetUrl) {
  const active = filteredCategories(current, current.type);
  return {
    pills: active.map((category, index) => `<a href="#menu-${category.id}" data-category${index === 0 ? ' aria-current="true"' : ''}>${escape(category.name)}</a>`).join(''),
    count: active.reduce((sum, category) => sum + category.items.length, 0),
    content: current.types.map(type => {
      const categories = type === current.type ? active : filteredCategories(current, type);
      const body = categories.map(category => categoryHtml(category, assetUrl)).join('') || (type === current.type ? '<div class="empty"><p>No dishes match your search or filter.</p><button class="btn" type="button" data-clear-menu>Clear filters</button></div>' : '');
      return `<div class="menu-type" data-menu-group="${type}"${type === current.type ? '' : ' hidden'}>${body}</div>`;
    }).join(''),
  };
}

function countText(current, view) {
  return `${view.count} items · ${current.menu.name} · ${typeNames[current.type]}`;
}

export function menuHubPage(ctx) {
  const { appUrl } = ctx;
  return `<section class="page-title location-menu-title"><nav class="breadcrumb" aria-label="Breadcrumb"><ol><li><a href="${appUrl('/')}" data-link>Home</a></li><li aria-current="page">Menus</li></ol></nav><span class="eyebrow">Explore Our Menus</span><h1>Menus: <em>Grapevine and Dallas</em></h1><p>Choose a location to see its menu and prices. Each restaurant has its own menu, PDF download and online ordering.</p></section><section class="location-menu-options" aria-label="Menus by location">${Object.entries(menus).map(([id, menu]) => {
    const location = bySlug[id];
    return `<div class="location-option"><strong>${menu.name}</strong><a class="btn btn-gold" href="${appUrl(`/menu/${id}/`)}" data-link>${menu.name} Menu</a><a class="btn" href="${escape(location.orderUrl)}" target="_blank" rel="noopener noreferrer"${track('order_click', { location: id, placement: 'menu-hub', platform: location.orderPlatform })} aria-label="Order Online, ${menu.name} on ${location.orderProvider} (opens in a new tab)">Order Online</a><a class="btn" href="${escape(ctx.assetUrl(menu.pdf))}" download${track('menu_pdf_download', { location: id, placement: 'menu-hub' })} aria-label="Download PDF, ${menu.name} menu">Download PDF</a></div>`;
  }).join('')}</section>`;
}

export function menuLocationPage(ctx, locationId) {
  const { appUrl, assetUrl } = ctx;
  const current = state(ctx, locationId);
  const location = bySlug[locationId];
  const view = results(current, assetUrl);
  const foodItems = current.menu.categories.filter(category => category.type === 'food').reduce((sum, category) => sum + category.items.length, 0);
  const foodSections = current.menu.categories.filter(category => category.type === 'food').length;
  const extras = [current.types.includes('drinks') && 'drinks', current.types.includes('happy-hour') && 'happy hour'].filter(Boolean).join(' and ');
  const notices = [site.allergenNotice, menuHasBar(locationId) && site.alcoholNotice].filter(Boolean).map(text => `<p class="menu-notice">${escape(text)}</p>`).join('');
  return `<section class="menu-page location-dining-menu">
    <header class="dining-heading"><nav class="breadcrumb" aria-label="Breadcrumb"><ol><li><a href="${appUrl('/')}" data-link>Home</a></li><li><a href="${appUrl('/menu/')}" data-link>Menus</a></li><li aria-current="page">${current.menu.name} Menu</li></ol></nav><span class="eyebrow">A Taste of Karmma</span><h1>${current.menu.name} <em>Menu</em></h1><p>${escape(location.address)}</p>
      <p class="menu-intro">Browse the ${current.menu.name} menu with prices: ${foodItems} dishes across ${foodSections} food sections${extras ? `, plus ${extras}` : ''}. Dishes marked Vegetarian carry a tag, and the filters narrow the list. Order takeout online on ${escape(location.orderProvider)} or download the PDF menu.</p>${notices}
      <nav class="menu-switch" aria-label="Choose a location menu">${locations.map(other => `<a href="${appUrl(other.menuPath)}" data-link${other.id === locationId ? ' aria-current="page"' : ''}>${other.name} menu</a>`).join('')}</nav></header>
    <div class="menu-controls">
      <div class="menu-toolbar">
        <div class="tabs type-tabs" role="group" aria-label="Menu section">${current.types.map(type => `<button type="button" data-menu-type="${type}" aria-pressed="${current.type === type}" class="${current.type === type ? 'selected' : ''}">${typeNames[type]}</button>`).join('')}</div>
        <label class="menu-search"><span class="sr-only">Search ${current.menu.name} menu</span><input type="search" data-menu-search placeholder="Search menu…" value="${escape(current.search)}"></label>
        <a class="btn" href="${escape(location.orderUrl)}" target="_blank" rel="noopener noreferrer"${track('order_click', { location: locationId, placement: 'menu', platform: location.orderPlatform })} aria-label="Order Online, ${current.menu.name} on ${escape(location.orderProvider)} (opens in a new tab)">Order Online</a>
        <a class="btn btn-gold" href="${escape(assetUrl(current.menu.pdf))}" download${track('menu_pdf_download', { location: locationId, placement: 'menu' })} aria-label="Download PDF, ${current.menu.name} menu">Download PDF</a>
      </div>
      <div class="filters" role="group" aria-label="Dish filters"><span>Filter:</span>${[['', 'All dishes'], ['vegetarian', 'Vegetarian'], ['photos', 'With photos']].map(([id, name]) => `<button type="button" data-menu-filter="${id}" aria-pressed="${current.filter === id}" class="${current.filter === id ? 'selected' : ''}">${name}</button>`).join('')}</div>
      <nav class="category-pills" aria-label="Menu categories">${view.pills}</nav>
    </div>
    <p class="menu-result-count" aria-live="polite" aria-atomic="true">${countText(current, view)}</p>
    <div class="menu-sections">${view.content}</div>
    <noscript><style>.menu-type[hidden]{display:block}</style></noscript>
    <div class="menu-bottom-actions"><a href="${appUrl(location.path)}" data-link>About the ${current.menu.name} restaurant</a><a href="${appUrl('/catering/')}" data-link>Catering</a><a class="menu-print-link" href="${appUrl(`/menu/print/?location=${locationId}`)}" data-link>Print ${current.menu.name} menu</a></div>
  </section>`;
}

export function printMenuPage(ctx) {
  const { appUrl, assetUrl } = ctx;
  const requested = ctx.query.get('location');
  const locationId = Object.hasOwn(menus, requested) ? requested : 'grapevine';
  const menu = menus[locationId];
  return `<section class="print-menu"><div class="print-actions"><a class="btn" href="${appUrl(`/menu/${locationId}/`)}" data-link>Back to ${menu.name} menu</a><button type="button" class="btn" data-print-menu${track('menu_print', { location: locationId })}>Print / Save PDF</button></div><header class="print-head"><img src="${assetUrl(site.logo)}" alt="" width="120" height="120" /><h1>${escape(site.name)}</h1><p>${menu.name} Menu</p></header>${menu.categories.map(category => `<section><h2>${escape(category.name)}</h2>${category.description ? `<p>${escape(category.description)}</p>` : ''}${category.items.map(item => `<article class="print-item"><div><h3>${escape(item.name)}</h3>${item.description ? `<p>${escape(item.description)}</p>` : ''}</div><div>${prices(item)}</div></article>`).join('')}</section>`).join('')}</section>`;
}

let disposeMenuTracking = () => {};

// getContext() returns a fresh { path, query, appUrl, assetUrl } for the current URL.
export function bindMenu({ getContext, render }) {
  disposeMenuTracking();
  disposeMenuTracking = () => {};
  document.querySelector('[data-print-menu]')?.addEventListener('click', () => window.print());
  const root = document.querySelector('.location-dining-menu');
  if (!root) return;
  const controls = root.querySelector('.menu-controls');
  const locationId = locationIdFromPath(getContext().path);
  let scrollFrame = 0;
  function syncCategory() {
    scrollFrame = 0;
    if (!root.isConnected) return;
    const sections = [...root.querySelectorAll('.menu-type:not([hidden]) .menu-category')];
    if (!sections.length) return;
    const navbarBottom = document.querySelector('.navbar').getBoundingClientRect().bottom;
    const controlsBottom = getComputedStyle(controls).position === 'sticky' ? controls.getBoundingClientRect().bottom : 0;
    const pills = root.querySelector('.category-pills');
    const pillsBottom = getComputedStyle(pills).position === 'sticky' ? pills.getBoundingClientRect().bottom : 0;
    // Follow the section entering the reading area below the fixed navigation.
    // The extra space also covers the 24px margin used by category clicks.
    const readingLine = Math.max(navbarBottom, controlsBottom, pillsBottom) + 64;
    let active = sections[0];
    for (const section of sections) {
      if (section.getBoundingClientRect().top > readingLine) break;
      active = section;
    }
    root.querySelectorAll('[data-category]').forEach(link => {
      if (link.hash === `#${active.id}`) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  }
  function queueCategorySync() {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(syncCategory);
  }
  window.addEventListener('scroll', queueCategorySync, { passive: true });
  window.addEventListener('resize', queueCategorySync);
  const layoutObserver = new ResizeObserver(queueCategorySync);
  layoutObserver.observe(controls);
  layoutObserver.observe(root.querySelector('.menu-sections'));
  disposeMenuTracking = () => {
    window.removeEventListener('scroll', queueCategorySync);
    window.removeEventListener('resize', queueCategorySync);
    layoutObserver.disconnect();
    cancelAnimationFrame(scrollFrame);
  };
  queueCategorySync();
  function updateUrl(changes, push = false) {
    const url = new URL(location.href);
    for (const [key, value] of Object.entries(changes)) value ? url.searchParams.set(key, value) : url.searchParams.delete(key);
    url.hash = '';
    history[push ? 'pushState' : 'replaceState'](null, '', url);
  }
  function updateResults() {
    const ctx = getContext();
    const current = state(ctx, locationId);
    const view = results(current, ctx.assetUrl);
    root.querySelector('.menu-sections').innerHTML = view.content;
    root.querySelector('.category-pills').innerHTML = view.pills;
    root.querySelector('.menu-result-count').textContent = countText(current, view);
    root.querySelectorAll('[data-menu-filter]').forEach(button => {
      const selected = button.dataset.menuFilter === current.filter;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    root.querySelectorAll('[data-menu-type]').forEach(button => {
      const selected = button.dataset.menuType === current.type;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    queueCategorySync();
  }
  root.querySelector('[data-menu-search]').addEventListener('input', event => {
    updateUrl({ q: event.target.value }); updateResults();
  });
  root.addEventListener('click', event => {
    const typeButton = event.target.closest('[data-menu-type]');
    if (typeButton) {
      updateUrl({ type: typeButton.dataset.menuType, q: '', filter: '' }, true);
      root.querySelector('[data-menu-search]').value = '';
      updateResults();
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }
    const filter = event.target.closest('[data-menu-filter]');
    if (filter) { updateUrl({ filter: filter.dataset.menuFilter }); updateResults(); }
    if (event.target.closest('[data-clear-menu]')) {
      updateUrl({ q: '', filter: '' }); root.querySelector('[data-menu-search]').value = ''; updateResults(); root.querySelector('[data-menu-search]').focus();
    }
    const category = event.target.closest('[data-category]');
    if (category) {
      event.preventDefault();
      root.querySelectorAll('[data-category]').forEach(link => link.removeAttribute('aria-current'));
      category.setAttribute('aria-current', 'true');
      const section = document.getElementById(category.hash.slice(1));
      const navHeight = document.querySelector('.navbar').getBoundingClientRect().height;
      const stickyHeight = ['.menu-controls', '.category-pills'].reduce((sum, selector) => {
        const element = root.querySelector(selector);
        return sum + (getComputedStyle(element).position === 'sticky' ? element.getBoundingClientRect().height : 0);
      }, 0);
      window.scrollTo({ top: section.getBoundingClientRect().top + window.scrollY - navHeight - stickyHeight - 24, behavior: 'instant' });
      section.querySelector('h2').focus({ preventScroll: true });
      queueCategorySync();
    }
  });
}
