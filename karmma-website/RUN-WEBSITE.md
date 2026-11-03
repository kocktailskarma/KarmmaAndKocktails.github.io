# Run the Karmma and Kocktails website

Install Python 3. Open a terminal in the KarmmaAndKocktails.github.io repository root.

```powershell
cd karmma-website/frontend
python server.py --port 5174
```

On Windows, use `py server.py --port 5174` if `python` is unavailable.

Open http://localhost:5174/ in your browser. Keep the terminal open.
Press Ctrl+C to stop the server.

If you already opened a terminal in `karmma-website`, use `cd frontend` instead.
If it is already in `frontend`, run the server command directly.

Alternatively, with Node.js installed, run `node server.mjs` from `frontend`.
That server uses port 5173 by default; follow the URL it prints.

The copied website is in `karmma-website/frontend`. The original website remains
in the repository root. No dependency installation is required for this preview.
