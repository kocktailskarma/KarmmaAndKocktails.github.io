# Karmma & Kocktails website (frontend)

A no-build static site: plain ES modules, one stylesheet, and one script
(`tools/prerender.mjs`) that writes real HTML for every page so search engines,
link previews and visitors without JavaScript all get the full content.

## Run it locally

From the repository root:

```powershell
cd karmma-website/frontend
python -I server.py --port 5174
```

Open http://localhost:5174/. The server behaves like GitHub Pages: `/menu/` serves
`menu/index.html` (200), `/menu` redirects to `/menu/`, and an unknown URL shows
`404.html` with status 404. Alternative with Node: `node server.mjs`.

## Re-run the prerender (do this after EVERY edit)

```powershell
cd karmma-website/frontend
node tools/prerender.mjs          # writes index.html, <route>/index.html, 404.html, sitemap.xml
node tools/prerender.mjs --check  # writes nothing; exits 1 if any generated file is stale
```

Needs Node 20 or newer; no packages, no browser, no network. `npm run prerender` and
`npm run check` do the same. **Run the prerender before every commit that touches
`src/`, `assets/og/` or the menu data**; the proposed deploy workflow runs `--check`
and refuses to publish stale pages. The script also fails (and writes nothing) if a
page has a duplicate or too-long title/description, not exactly one `<h1>`, a skipped
heading level, an image without alt/width/height or a missing file, a broken internal
link, a `tel:` link without click tracking, a form, an email address, "Hidden Gem",
or placeholder text such as `{{`, `TODO`, `undefined`.

If you forget to re-run it, visitors still see the new content: the browser compares a
hash of what it would render with the hash stored in the page and re-renders on a
mismatch. Only crawlers and link previews would see the old text.

## Where things live

| To change | Edit | Then |
|---|---|---|
| Brand, phone, address, hours, ordering/reserve/directions links, Instagram | `src/site-data.js` | prerender |
| Dishes, prices, photos, happy hour, drinks | `src/menu-data.js` | prerender |
| Page titles, meta descriptions, H1s, share images (the SEO manifest) | `src/seo-routes.js` | prerender |
| Page text and layout | `src/pages.js` (all pages), `src/menu.js` (menus) | prerender |
| Structured data (JSON-LD) | `src/jsonld.js` (built from the same data) | prerender |
| Browser behaviour (routing, dialog, head updates) | `src/app.js` | prerender |
| Colours, spacing | `src/styles.css` | prerender (refreshes the cache-bust version) |
| Photos | `tools/optimize-images.py` regenerates the web copies from `../_archive/original-assets/` | prerender |

### Optional fields that appear when filled in

In `src/site-data.js` each location has fields that are hidden while empty. Fill one in,
run the prerender, and it shows up everywhere it belongs (nothing placeholder-like is
ever visible):

`instagram`, `facebook`, `reviewUrl`, `delivery`, `parking`, `happyHourDays`,
`formerName`, `cateringDetails`, `eventDetails`, `cateringMenuPdf`, `gallery`,
`seoImages`, `containedIn`; and site-wide `allergenNotice`, `alcoholNotice`,
`aboutStory`, `sameAs`. To add a Grapevine drinks menu, add categories with type
`'drinks'` and `alcohol = true` to `menus.grapevine` in `src/menu-data.js`.

## Pages (all prerendered)

`/`, `/grapevine/`, `/dallas/`, `/menu/`, `/menu/grapevine/`, `/menu/dallas/`,
`/happy-hour/`, `/catering/`, `/private-events/`, `/services/`, `/about/`, `/contact/`,
`/reserve/`, plus `/menu/print/` (noindex) and `404.html`. Old `/menu/?location=dallas`
links are rewritten to `/menu/dallas/` in the browser. Catering and private-event
inquiries are phone only: every call to action is a `tel:` link tracked as `call_click`.

## Images and PDFs

Web copies are WebP (menu photos 320 px, content photos about 2x display size). The
untouched originals are in `karmma-website/_archive/original-assets/`. Regenerate with
`python -I tools/optimize-images.py` (needs Pillow). `tools/shrink-pdf.py` shrank the
Grapevine PDF from 5.1 MB to 1.0 MB (needs PyMuPDF); the original is archived.

## Tests

Browser checks use Playwright with the installed Edge (install Playwright outside the repo):

```powershell
node tools/prerender.mjs --check
# in a second terminal: python -I server.py --port 5174
node tests/site_check.mjs                  # HTTP, no-JS, hydration, navigation, dialog, focus, analytics event, mobile
python tests/menu_browser_check.py         # menu data, search/filter/tabs, widths 320-1920, print view
python tests/menu_scroll_check.py          # category highlighting while scrolling
```

Screenshots and `checks.json` go to `tests/output/` (git-ignored).

See [startup instructions](../RUN-WEBSITE.md) and [menu review notes](../MENU-REVIEW.md).
The proposed (not enabled) deploy workflow is in `../proposed-workflow/pages.yml`.
