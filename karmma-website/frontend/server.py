"""Local preview that behaves like GitHub Pages for the prerendered static site.

  /dir/        serves dir/index.html with 200
  /dir         301-redirects to /dir/ (as GitHub Pages does)
  unknown URL  serves 404.html with status 404 (so a missing prerender shows up here too)

Run from karmma-website/frontend:  python -I server.py --port 5174
Re-run `node tools/prerender.mjs` after changing anything in src/ so the static HTML is current.
"""

import argparse
import gzip
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parent
# Never serve the developer tooling or the server itself, like the published site.
HIDDEN = {"tools", "tests", "__pycache__", "node_modules"}
COMPRESSED = {".html", ".css", ".js", ".json", ".xml", ".txt", ".svg"}
HIDDEN_FILES = {"server.py", "server.mjs", "package.json", "README.md"}


class PreviewHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".css": "text/css",
        ".woff2": "font/woff2",
        ".webp": "image/webp",
        ".xml": "application/xml",
        ".ico": "image/x-icon",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def _target(self):
        parts = urlsplit(self.path)
        return unquote(parts.path), parts.query

    def send_head(self):
        path, query = self._target()
        relative = path.lstrip("/")
        first = relative.split("/", 1)[0]
        file = (ROOT / relative).resolve()
        inside = ROOT in file.parents or file == ROOT
        hidden = first in HIDDEN or relative in HIDDEN_FILES
        # Ignore conditional requests so preview edits are always served fresh.
        for header in ("If-Modified-Since", "If-None-Match"):
            if header in self.headers:
                del self.headers[header]
        if inside and not hidden and file.is_dir() and not path.endswith("/"):
            self.send_response(301)
            self.send_header("Location", path + "/" + ("?" + query if query else ""))
            self.send_header("Content-Length", "0")
            self.end_headers()
            return None
        if inside and not hidden and file.is_dir() and (file / "index.html").is_file():
            file = file / "index.html"
        if inside and not hidden and file.is_file():
            # GitHub Pages gzips text files; do the same so local timings are realistic.
            if file.suffix in COMPRESSED and "gzip" in self.headers.get("Accept-Encoding", ""):
                body = gzip.compress(file.read_bytes(), 6)
                self.send_response(200)
                self.send_header("Content-Type", self.guess_type(str(file)))
                self.send_header("Content-Encoding", "gzip")
                self.send_header("Vary", "Accept-Encoding")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                if self.command != "HEAD":
                    self.wfile.write(body)
                return None
            self.path = "/" + file.relative_to(ROOT).as_posix()
            return super().send_head()
        self.send_response(404)
        body = (ROOT / "404.html").read_bytes() if (ROOT / "404.html").is_file() else b"Not found"
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)
        return None

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=5173)
    args = parser.parse_args()
    with ThreadingHTTPServer(("127.0.0.1", args.port), PreviewHandler) as server:
        print(f"Karmma (Karma) & Kocktails preview: http://localhost:{args.port}/", flush=True)
        print("Press Ctrl+C to stop.", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
