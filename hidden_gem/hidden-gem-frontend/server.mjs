import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 5173);

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

function resolveFile(url) {
  const parsed = new URL(url, `http://localhost:${port}`);
  let pathname = decodeURIComponent(parsed.pathname);
  if (pathname.endsWith("/")) pathname += "index.html";
  const direct = join(root, normalize(pathname).replace(/^[/\\]+/, ""));
  if (existsSync(direct) && statSync(direct).isFile()) return direct;
  return join(root, "index.html");
}

createServer((req, res) => {
  const file = resolveFile(req.url || "/");
  res.writeHead(200, {
    "content-type": types[extname(file).toLowerCase()] || "application/octet-stream",
    "cache-control": "no-store",
  });
  createReadStream(file).pipe(res);
}).listen(port, () => {
  console.log(`Editable Hidden Gem frontend running at http://localhost:${port}/`);
});
