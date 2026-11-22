import { chromium } from "playwright-core";
import binary from "@sparticuz/chromium";
import { readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { brotliDecompressSync } from "node:zlib";
import { execFileSync } from "node:child_process";
export async function launchBrowser() {
  if (process.env.CHROMIUM_PATH)
    return chromium.launch({
      executablePath: process.env.CHROMIUM_PATH,
      headless: true,
      args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
    });
  if (process.arch !== "x64" || process.platform !== "linux")
    throw Error(
      "Set CHROMIUM_PATH to your local Chromium executable on this platform.",
    );
  const path = join(tmpdir(), "vice-chrome-libs");
  await mkdir(path, { recursive: true });
  const archive = brotliDecompressSync(
    await readFile("node_modules/@sparticuz/chromium/bin/al2023.tar.br"),
  );
  execFileSync("tar", ["-xf", "-", "-C", path], { input: archive });
  const args = binary.args.filter(
    (s) =>
      ![
        "--single-process",
        "--disable-web-security",
        "--allow-running-insecure-content",
      ].includes(s),
  );
  return chromium.launch({
    headless: true,
    executablePath: await binary.executablePath(),
    args,
    env: {
      ...process.env,
      LD_LIBRARY_PATH:
        join(path, "lib") +
        (process.env.LD_LIBRARY_PATH ? ":" + process.env.LD_LIBRARY_PATH : ""),
    },
  });
}
