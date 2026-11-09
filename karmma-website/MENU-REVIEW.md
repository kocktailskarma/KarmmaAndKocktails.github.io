# Location menu review

The on-site menus are in `frontend/src/menu-data.js`. The renderer is in
`frontend/src/menu.js`, following the existing Hidden Gem menu's photo cards,
search, filters, category navigation and print layout with Karmma's colors.

Menus have their own pages: `/menu/grapevine/` and `/menu/dallas/` (the `/menu/` page
links to both in the same tab, and each menu page has a location switch). The toolbar
places section tabs, search, ordering and PDF download together; filters sit below,
followed by category links (a single scrolling bar on phones). All sections (food,
drinks, happy hour) are in the page HTML; the tabs show one at a time. "Download PDF"
downloads the PDF; "Print ... menu" opens the print view (`/menu/print/?location=...`).

## Sources and counting

- Grapevine: `assets/menus/grapevine-menu.pdf`, pages 1–6.
- Dallas: `assets/menus/dallas-menu.pdf`, photographed pages 1–7. Page 8 is blank.
- Each category records its source page. Prices and protein/size options are
  recorded separately for each location. Happy-hour entries are separate from
  the regular menu. No days of availability were inferred for happy hour (set
  `happyHourDays` for Dallas in `frontend/src/site-data.js` once confirmed).
- Displayed counts refer to cards, not distinct dish families: combined listings
  remain combined where practical, while separately priced Grapevine biryanis,
  naan varieties and egg dishes retain separate cards.
- Descriptions are concise paraphrases of the supplied menus. The PDF downloads
  are the supplied files, served inside the frontend so they work when the frontend
  is hosted by itself. The Grapevine PDF had its embedded photos down-sampled
  (5.1 MB to 1.0 MB, same pages and text); the original is in `_archive/original-assets/menus/`.

## Unresolved source details

- Dallas p1: Gunpowder Chicken shows `$12.99 / $13.99` without clear option
  labels. Its regular-menu card says “Ask for price”; its explicit $9 happy-hour
  price is retained separately.
- Dallas p4/p7: regular house wine is $6 and happy-hour house wine is $7.
  Both are transcribed as printed; confirm with the restaurant.
- Dallas p5: the last mocktail flavor is obscured by the menu holder. The $8
  mocktail listing is included without guessing a complete flavor list.
- Grapevine p5: Paneer Kabab is repeated. It appears once in the website.
- Grapevine p5: the malformed “Lamb Chops Chicken Tandoori — $21.99” entry
  has a chicken description. It is omitted. The separate Chicken Tandoori
  ($21.99) and Lamb Chops ($33.99) entries are retained.
- Grapevine p6: the shrimp/pineapple description is placed between “Fried Rice”
  and its protein choices. It is not reassigned to another dish without confirmation.
- Minor spelling inconsistencies are normalized where unambiguous. Similar
  names such as Momo Reloaded / Momo 555 and Crisp Brussels / Balsamic Sprouts
  remain distinct.

## Images

Selected files were copied from `images/HiddenGem Menu Pictures JPG` and ship as
320 px WebP files in `frontend/assets/menu` (originals: `_archive/original-assets/menu`). The `photos` table records the original relative paths.
Images are assigned to clear name matches, not speculative aliases. A dish
without a matched image uses a neutral serving-dish icon. The black
`chicken tenders.png` is not used. A shared photo does not establish that both
locations plate a dish identically. No existing homepage images were replaced.

Vegetarian labels are limited to explicitly vegetarian categories or clear
vegetarian-only entries; mixed chicken/vegetable choices are not labeled vegetarian.

## Local review

Start `python server.py --port 5174` from `frontend`, then run
`python tests/menu_browser_check.py` with Playwright and Microsoft Edge installed.
The check covers source-price samples, all referenced images and PDFs, search,
filters, location popups and new tabs, menu-type transitions, history, direct routes, refresh,
print layout, mobile navigation and widths from 320px through 1920px.
Screenshots and the result JSON are saved in `review-artifacts/karmma-menu`.

These changes do not publish or deploy the site. The original root website is
separate from this frontend.
