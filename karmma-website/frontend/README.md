# Karmma and Kocktails editable frontend

From the Karmma repository root, run this project with Python (no extra packages needed):

```powershell
cd karmma-website/frontend
python server.py --port 5174
```

Open:

```text
http://localhost:5174/
```

This server supports refreshing pages such as `/menu/` and disables caching
during local preview. Stop any previous server with Ctrl+C before starting it.
Use this instead of `python -m http.server`, which cannot serve the app's routes.
If Node.js is installed, `node server.mjs` is also available.

Common edits:

- Site info: `src/site-data.js`
- Location menu dishes, prices and photo assignments: `src/menu-data.js`
- Menu search, filtering and print layout: `src/menu.js`
- Location addresses, ordering and reservations: `locations` in `src/site-data.js`
- Layout and page behavior: `src/app.js`
- Colors, spacing, and responsive design: `src/styles.css`
- Images: `assets/`

See [startup instructions](../RUN-WEBSITE.md) for Windows and Node.js alternatives.

Preview `/menu/?location=dallas` or `/menu/?location=grapevine`. Each location
has its own PDF download and `/menu/print/?location=...` print view.
Menu links open a location picker; each location opens in a new tab, leaving the
picker available in the original tab. `/menu/` also offers both location choices.
See [menu review notes](../MENU-REVIEW.md) for source details and unresolved entries.
