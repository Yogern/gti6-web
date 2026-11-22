import { createServer } from "node:http";
import { resolve, extname, sep } from "node:path";
import { stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { attachNetwork } from "./network";
const root = resolve("dist");
const mime: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".wasm": "application/wasm",
  ".glb": "model/gltf-binary",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".txt": "text/plain",
};
if (!(await stat(resolve(root, "index.html")).catch(() => null)))
  throw Error("No production build. Run npm run build first.");
const http = createServer(async (req, res) => {
  try {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405).end();
      return;
    }
    const path = decodeURIComponent(
      new URL(req.url || "/", "http://localhost").pathname,
    );
    const file = resolve(root, "." + (path === "/" ? "/index.html" : path));
    if (
      !file.startsWith(root + sep) ||
      path.split("/").some((s) => s.startsWith("."))
    ) {
      res.writeHead(403).end();
      return;
    }
    const info = await stat(file);
    if (!info.isFile()) throw Error();
    res.writeHead(200, {
      "Content-Type": mime[extname(file)] || "application/octet-stream",
      "Content-Length": info.size,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control":
        path === "/index.html" || path === "/"
          ? "no-cache"
          : "public, max-age=3600",
    });
    if (req.method === "HEAD") res.end();
    else
      createReadStream(file)
        .on("error", () => res.destroy())
        .pipe(res);
  } catch {
    if (!res.headersSent) res.writeHead(404);
    res.end("Not found");
  }
});
attachNetwork(http);
http.listen(
  process.env.PORT === undefined ? 4173 : Number(process.env.PORT),
  process.env.HOST || "0.0.0.0",
  () => {
    const address = http.address();
    console.log(
      `Vice Leonida listening on ${typeof address === "object" ? address?.port : address}`,
    );
  },
);
