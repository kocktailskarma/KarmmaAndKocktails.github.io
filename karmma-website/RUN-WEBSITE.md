# Run the Karmma (Karma) & Kocktails website

Install Python 3. Open a terminal in the KarmmaAndKocktails.github.io repository root.

```powershell
cd karmma-website/frontend
python -I server.py --port 5174
```

On Windows, use `py -I server.py --port 5174` if `python` is unavailable.

Open http://localhost:5174/ in your browser. Keep the terminal open.
Press Ctrl+C to stop the server.

The server behaves like GitHub Pages (a real file per page, `404.html` for unknown
URLs), so a page that was not generated shows up as an error here too.

After you change anything in `frontend/src/`, regenerate the static pages (Node 20+):

```powershell
cd karmma-website/frontend
node tools/prerender.mjs
```

Alternatively, with Node.js installed, run `node server.mjs` from `frontend`
(port 5173, or `PORT=5174 node server.mjs`).

The site is in `karmma-website/frontend`. The original (old) website remains in the
repository root and is not touched. No dependency installation is required.
