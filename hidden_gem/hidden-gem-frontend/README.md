# Hidden Gem editable frontend

Run this project with Python (no extra packages needed):

```powershell
cd hidden-gem-frontend
python server.py
```

Open:

```text
http://localhost:5173/
```

This server supports refreshing pages such as `/menu/` and disables caching
during local preview. Stop any previous server with Ctrl+C before starting it.
Use this instead of `python -m http.server`, which cannot serve the app's routes.
If Node.js is installed, `node server.mjs` is also available.

Common edits:

- Site info: `src/site-data.js`
- Menu items and prices: `src/menu-data.js`
- Layout and page behavior: `src/app.js`
- Colors, spacing, and responsive design: `src/styles.css`
- Images: `assets/`
