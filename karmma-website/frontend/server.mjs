// Node alternative to server.py: serves the prerendered site like GitHub Pages does.
//   node server.mjs            (port 5173, or PORT=5174 node server.mjs)
// /dir/ -> dir/index.html (200), /dir -> 301 /dir/, unknown URL -> 404.html with status 404.
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 5173);
const hidden = new Set(["tools", "tests", "node_modules", "server.py", "server.mjs", "package.json", "README.md"]);
const types = {
  ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json",
  ".jpeg": "image/jpeg", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2", ".pdf": "application/pdf",
  ".xml": "application/xml", ".txt": "text/plain; charset=utf-8", ".ico": "image/x-icon",
};

createServer((req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${port}`);
  const pathname = decodeURIComponent(url.pathname);
  const relative = normalize(pathname).split(sep).filter(Boolean).join("/");
  const first = relative.split("/")[0];
  let file = join(root, relative);
  const safe = file.startsWith(root) && !hidden.has(first);
  if (safe && existsSync(file) && statSync(file).isDirectory()) {
    if (!pathname.endsWith("/")) {
      res.writeHead(301, { location: `${pathname}/${url.search}` });
      return res.end();
    }
    file = join(file, "index.html");
  }
  const found = safe && existsSync(file) && statSync(file).isFile();
  const target = found ? file : join(root, "404.html");
  res.writeHead(found ? 200 : 404, { "content-type": types[extname(target).toLowerCase()] || "application/octet-stream", "cache-control": "no-store" });
  if (req.method === "HEAD") return res.end();
  createReadStream(target).pipe(res);
}).listen(port, () => console.log(`Karmma (Karma) & Kocktails preview at http://localhost:${port}/`));
