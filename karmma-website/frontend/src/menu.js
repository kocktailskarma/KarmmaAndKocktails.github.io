import { menus } from './menu-data.js?v=locations-1';

const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
const money = price => `$${price.toFixed(2)}`;
const typeNames = { food: 'Food', drinks: 'Drinks', 'happy-hour': 'Happy Hour' };
const imageIcon = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M8 30a16 16 0 0 1 32 0M5 34h38M24 10v4M20 10h8"/></svg>';

function state() {
  const params = new URLSearchParams(location.search);
  const locationId = Object.hasOwn(menus, params.get('location')) ? params.get('location') : 'grapevine';
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

function filteredCategories(current) {
  const query = current.search.trim().toLocaleLowerCase();
  return current.menu.categories.filter(category => category.type === current.type).map(category => ({ ...category, items: category.items.filter(item => {
    const options = Array.isArray(item.price) ? item.price.map(([name]) => name).join(' ') : '';
    return (!query || `${category.name} ${category.description} ${item.name} ${item.description} ${options}`.toLocaleLowerCase().includes(query)) &&
      (current.filter !== 'vegetarian' || item.vegetarian) && (current.filter !== 'photos' || item.image);
  }) })).filter(category => category.items.length);
}

function results(current, assetUrl) {
  const categories = filteredCategories(current);
  return {
    pills: categories.map((category, index) => `<a href="#menu-${category.id}" data-category${index === 0 ? ' aria-current="true"' : ''}>${escape(category.name)}</a>`).join(''),
    count: categories.reduce((sum, category) => sum + category.items.length, 0),
    content: categories.map(category => `<section id="menu-${category.id}" class="menu-category" aria-labelledby="heading-${category.id}"><h2 id="heading-${category.id}" tabindex="-1">${escape(category.name)}</h2><i aria-hidden="true"></i>${category.description ? `<p>${escape(category.description)}</p>` : ''}<div class="menu-grid">${category.items.map(item => card(item, assetUrl)).join('')}</div></section>`).join('') || '<div class="empty"><p>No dishes match your search or filter.</p><button class="btn" type="button" data-clear-menu>Clear filters</button></div>',
  };
}

export function menuPage({ appUrl, assetUrl, locations }) {
  if (!Object.hasOwn(menus, new URLSearchParams(location.search).get('location'))) {
    return `<section class="page-title location-menu-title"><span class="eyebrow">Explore Our Menus</span><h1>Choose <em>Your Location</em></h1><p>Choose a location to open its menu in a new tab.</p></section><section class="location-menu-options" aria-label="Menus by location">${Object.entries(menus).map(([id, menu]) => `<a class="location-option" href="${appUrl(`/menu/?location=${id}`)}" target="_blank" rel="noopener noreferrer"><strong>${menu.name}</strong><span>View menu ↗<span class="sr-only"> (opens in a new tab)</span></span></a>`).join('')}</section>`;
  }
  const current = state();
  const locationInfo = locations.find(location => location.name === current.menu.name);
  const view = results(current, assetUrl);
  return `<section class="menu-page location-dining-menu">
    <header class="dining-heading"><span class="eyebrow">A Taste of Karmma</span><h1>${current.menu.name} <em>Menu</em></h1><p>${escape(locationInfo.address)}</p></header>
    <div class="menu-controls">
      <div class="menu-toolbar">
        <div class="tabs type-tabs" role="group" aria-label="Menu section">${current.types.map(type => `<button type="button" data-menu-type="${type}" aria-pressed="${current.type === type}" class="${current.type === type ? 'selected' : ''}">${typeNames[type]}</button>`).join('')}</div>
        <label class="menu-search"><span class="sr-only">Search ${current.menu.name} menu</span><input type="search" data-menu-search placeholder="Search menu…" value="${escape(current.search)}"></label>
        <a class="btn" href="${escape(locationInfo.orderUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Order online from ${current.menu.name} (opens in a new tab)">Order Online</a>
        <a class="btn btn-gold" href="${appUrl(`/menu/print/?location=${current.locationId}`)}" target="_blank" rel="noopener">Download PDF</a>
      </div>
      <div class="filters" role="group" aria-label="Dish filters"><span>Filter:</span>${[['', 'All dishes'], ['vegetarian', 'Vegetarian'], ['photos', 'With photos']].map(([id, name]) => `<button type="button" data-menu-filter="${id}" aria-pressed="${current.filter === id}" class="${current.filter === id ? 'selected' : ''}">${name}</button>`).join('')}</div>
      <nav class="category-pills" aria-label="Menu categories">${view.pills}</nav>
    </div>
    <p class="menu-result-count" aria-live="polite" aria-atomic="true">${view.count} items · ${current.menu.name} · ${typeNames[current.type]}</p>
    <div class="menu-sections">${view.content}</div>
    <div class="menu-bottom-actions"><a class="menu-print-link" href="${appUrl(`/menu/print/?location=${current.locationId}`)}" target="_blank" rel="noopener">Print ${current.menu.name} menu</a></div>
  </section>`;
}

export function printMenuPage({ appUrl, assetUrl }) {
  const { menu, locationId } = state();
  return `<section class="print-menu"><div class="print-actions"><a class="btn" href="${appUrl(`/menu/?location=${locationId}`)}" data-link>Back to ${menu.name} menu</a><button type="button" class="btn" data-print-menu>Print / Save PDF</button></div><header class="print-head"><img src="${assetUrl('/assets/brand/karmma-kocktails.jpg')}" alt="Karmma and Kocktails logo" /><h1>Karmma and Kocktails</h1><p>${menu.name} Menu</p></header>${menu.categories.map(category => `<section><h2>${escape(category.name)}</h2>${category.description ? `<p>${escape(category.description)}</p>` : ''}${category.items.map(item => `<article class="print-item"><div><h3>${escape(item.name)}</h3>${item.description ? `<p>${escape(item.description)}</p>` : ''}</div><div>${prices(item)}</div></article>`).join('')}</section>`).join('')}</section>`;
}

let disposeMenuTracking = () => {};

export function bindMenu({ assetUrl, render }) {
  disposeMenuTracking();
  disposeMenuTracking = () => {};
  const root = document.querySelector('.location-dining-menu');
  document.querySelector('[data-print-menu]')?.addEventListener('click', () => window.print());
  if (!root) return;
  const controls = root.querySelector('.menu-controls');
  let scrollFrame = 0;
  function syncCategory() {
    scrollFrame = 0;
    if (!root.isConnected) return;
    const sections = [...root.querySelectorAll('.menu-category')];
    if (!sections.length) return;
    const navbarBottom = document.querySelector('.navbar').getBoundingClientRect().bottom;
    const controlsBottom = getComputedStyle(controls).position === 'sticky' ? controls.getBoundingClientRect().bottom : 0;
    // Follow the section entering the reading area below the fixed navigation.
    // The extra space also covers the 24px margin used by category clicks.
    const readingLine = Math.max(navbarBottom, controlsBottom) + 64;
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
    const current = state();
    const view = results(current, assetUrl);
    root.querySelector('.menu-sections').innerHTML = view.content;
    root.querySelector('.category-pills').innerHTML = view.pills;
    root.querySelector('.menu-result-count').textContent = `${view.count} items · ${current.menu.name} · ${typeNames[current.type]}`;
    root.querySelectorAll('[data-menu-filter]').forEach(button => {
      const selected = button.dataset.menuFilter === current.filter;
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
      const changes = { type: typeButton.dataset.menuType, q: '', filter: '' };
      updateUrl(changes, true); render();
      const selector = `[data-menu-type="${changes.type}"]`;
      document.querySelector(selector)?.focus({ preventScroll: true });
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
      const controls = root.querySelector('.menu-controls');
      const navHeight = document.querySelector('.navbar').getBoundingClientRect().height;
      const stickyHeight = getComputedStyle(controls).position === 'sticky' ? controls.getBoundingClientRect().height : 0;
      window.scrollTo({ top: section.getBoundingClientRect().top + window.scrollY - navHeight - stickyHeight - 24, behavior: 'instant' });
      section.querySelector('h2').focus({ preventScroll: true });
      queueCategorySync();
    }
  });
}
