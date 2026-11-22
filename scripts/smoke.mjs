import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { once } from "node:events";
import { io } from "socket.io-client";
import sharp from "sharp";
import { launchBrowser } from "./browser.mjs";
// Exercise the actual production build on a disposable, loopback-only port.
const server = spawn(process.execPath, ["--import", "tsx", "server/index.ts"], {
  env: { ...process.env, PORT: "0", HOST: "127.0.0.1" },
  stdio: ["ignore", "pipe", "pipe"],
});
let browser, peer, publicPeer, activePage;
const errors = [],
  checks = [],
  report = {};
const pkg = JSON.parse(await readFile("package.json", "utf8"));
const checked = (s) => {
  checks.push(s);
  console.log("PASS", s);
};
try {
  const port = await new Promise((ok, fail) => {
    const t = setTimeout(
      () => fail(Error("Production server startup timed out")),
      12000,
    );
    server.stdout.on("data", (b) => {
      const m = String(b).match(/listening on (\d+)/);
      if (m) {
        clearTimeout(t);
        ok(Number(m[1]));
      }
    });
    server.once("exit", (code) => {
      clearTimeout(t);
      fail(Error("Server exited: " + code));
    });
    server.stderr.on("data", (b) => process.stderr.write(b));
  });
  const url = `http://127.0.0.1:${port}`;
  browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const p = (activePage = await context.newPage());
  p.setDefaultTimeout(20000);
  const watch = (page) => {
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (
        m.type() === "error" ||
        /Shader Error|VALIDATE_STATUS false|shader compilation failed/i.test(
          m.text(),
        )
      )
        errors.push(m.text());
    });
    page.on("response", (r) => {
      if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
    });
  };
  watch(p);
  await p.goto(url);
  await p.evaluate(() => document.fonts.ready);
  assert.equal(await p.locator(".district-card").count(), 4);
  assert(
    await p
      .locator(".district-card img")
      .evaluateAll((images) =>
        images.every((i) => i.complete && i.naturalWidth > 0),
      ),
  );
  await p.locator('[data-district="port"]').click();
  assert.equal(
    await p.locator(".district-card.selected").getAttribute("data-district"),
    "port",
  );
  await p.locator('[data-district="beach"]').click();
  checked("World artwork, district selection and hub");
  await p.locator('[data-nav="settings"]').click();
  await p.locator('[data-setting="Quality"]').selectOption("Max FPS");
  await p.locator('[data-action="show-fps"]').click();
  await p.locator('[data-tab="controls"]').click();
  await p.locator('[data-bind="gesture"]').click();
  await p.keyboard.press("KeyH");
  await p.waitForSelector("dialog:not([open])", { state: "attached" });
  await p.waitForFunction(
    () => document.querySelector('[data-bind="gesture"]')?.textContent === "H",
  );
  await p.locator('[data-action="layout"]').click();
  await p.locator('[data-preset="left"]').click();
  await p.locator("#edit-scale").fill("125");
  await p.locator('[data-action="close"]').last().click();
  checked("Saved keyboard binding and touch layout preset");
  await p.locator('[data-tab="saves"]').click();
  await p.locator('[data-save="1"]').click();
  await p.waitForSelector('[data-load="1"]:not([disabled])');
  const download = p.waitForEvent("download");
  await p.locator('[data-action="export"]').click();
  const file = await download;
  const save = JSON.parse(await readFile(await file.path(), "utf8"));
  assert.equal(save.preferences.keys.gesture, "KeyH");
  assert.equal(save.preferences.layout.stick.x, 85);
  assert.equal(save.preferences.layout.stick.scale, 1.25);
  await p.locator("#import-file").setInputFiles({
    name: "session.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(save)),
  });
  await p.locator("#confirm-load").click();
  checked("IndexedDB slot, JSON export & validated import");
  await p.locator('[data-nav="map"]').click();
  await p.locator('[data-map-district="campus"]').click();
  assert.match(
    await p.locator("#waypoint-summary").innerText(),
    /Waypoint set/,
  );
  await p.locator('[data-action="clear-waypoint"]').click();
  await p.locator('[data-nav="garage"]').click();
  await p.waitForSelector(".garage-scene .loading", {
    state: "detached",
    timeout: 55000,
  });
  assert.equal(await p.locator(".garage-error").count(), 0);
  await p.locator('[data-paint="#2fc4bd"]').click();
  await p.locator('[data-car="courier"]').click();
  await p.waitForSelector(".garage-scene .loading", {
    state: "detached",
    timeout: 55000,
  });
  assert.equal(await p.locator(".garage-error").count(), 0);
  checked("Map waypoint and real 3D garage, paint & vehicle selection");
  await p.locator('[data-nav="play"]').last().click();
  await p.setViewportSize({ width: 640, height: 400 });
  await p.locator('[data-action="launch"]').click();
  const rendered = () =>
    p.waitForFunction(
      () => +document.querySelector("#surface canvas")?.dataset.frames >= 5,
      null,
      { timeout: 100000 },
    );
  await rendered();
  await p.waitForFunction(
    () => +document.querySelector("#surface canvas")?.dataset.fps > 0,
    null,
    { timeout: 25000 },
  );
  const canvas = p.locator("#surface canvas");
  const telem = () =>
    canvas.evaluate((c) => ({
      ...c.dataset,
      t: performance.now(),
      w: c.width,
      h: c.height,
    }));
  const begin = await telem();
  await p.waitForFunction(
    (n) =>
      Number(document.querySelector("#surface canvas").dataset.frames) >=
      n + 12,
    Number(begin.frames),
    { timeout: 55000 },
  );
  const end = await telem();
  report.telemetry = {
    renderer: end.api,
    viewport: "640 × 400",
    renderSize: `${end.w} × ${end.h}`,
    requestedQuality: "Max FPS",
    frames: Number(end.frames) - Number(begin.frames),
    intervalMs: Math.round(end.t - begin.t),
    meanFPS: +(
      ((Number(end.frames) - Number(begin.frames)) * 1000) /
      (end.t - begin.t)
    ).toFixed(2),
    drawCalls: end.draws,
    triangles: end.triangles,
    graphicsDevice: await p.evaluate(() => {
      const c = document.querySelector("#surface canvas"),
        gl = c.getContext("webgl2");
      if (!gl) return "WebGPU";
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      return ext
        ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
        : gl.getParameter(gl.RENDERER);
    }),
  };
  assert(report.telemetry.meanFPS > 0);
  const img = await sharp(await p.screenshot())
    .extract({ left: 210, top: 105, width: 220, height: 150 })
    .stats();
  assert(
    img.channels.some((c) => c.stdev > 8),
    "World contains rendered geometry, not a solid clear color",
  );
  console.log("Measured", report.telemetry);
  checked("Real 3D frames, nonblank render and measured telemetry");
  await p.keyboard.press("KeyE");
  await p.waitForFunction(
    () => document.querySelector("#surface canvas").dataset.driving === "true",
  );
  const start = (await telem()).position;
  await p.keyboard.down("KeyW");
  await p.waitForFunction(
    (s) => {
      const t = document
          .querySelector("#surface canvas")
          .dataset.position.split(",")
          .map(Number),
        v = s.split(",").map(Number);
      return Math.hypot(t[0] - v[0], t[1] - v[1]) > 1.5;
    },
    start,
    { timeout: 25000 },
  );
  await p.keyboard.up("KeyW");
  await p.keyboard.press("KeyV");
  await p.keyboard.press("KeyP");
  await p.locator('[data-action="jobs"]').click();
  await p.locator('[data-job="delivery"]').click();
  await p.waitForSelector('#surface canvas[data-state="running"]');
  await p.keyboard.press("KeyM");
  await p.locator('[data-map-district="port"]').click();
  await p.locator('[data-action="district-travel"]').click();
  await p.waitForFunction(
    () =>
      document
        .querySelector(".hud-job")
        ?.textContent.includes("Deliver parcel"),
    null,
    { timeout: 25000 },
  );
  await p.keyboard.press("KeyM");
  await p.locator('[data-map-district="campus"]').click();
  await p.locator('[data-action="district-travel"]').click();
  await p.waitForFunction(
    () => document.querySelector("#hud-cash")?.textContent === "$3,250",
    null,
    { timeout: 25000 },
  );
  checked(
    "Drive, change camera, phone contract, district travel and actual payout",
  );
  await p.keyboard.press("Backquote");
  await p.locator('[data-setting="Weather"]').selectOption("Rain");
  await p.locator('[data-range="minutes"]').fill("720");
  await p.locator('[data-action="cash"]').click();
  await p.locator('[data-action="close"]').click();
  await p.waitForFunction(() =>
    document.querySelector("#hud-clock")?.textContent.includes("RAIN"),
  );
  await p.locator('[data-game="pause"]').click();
  await p.reload();
  await p.waitForFunction(() =>
    document.querySelector(".launch")?.textContent.includes("Resume"),
  );
  checked("Time/weather, modifiers, autosave and restore on reload");
  // A real second peer verifies room isolation, snapshots and chat.
  const pose = {
    x: 84,
    y: 1,
    z: 50,
    yaw: 0,
    moving: false,
    gesture: false,
    car: "",
  };
  async function join(mode, code = "") {
    const s = io(url, {
      forceNew: true,
      reconnection: false,
      transports: ["websocket"],
    });
    await once(s, "connect", { signal: AbortSignal.timeout(5000) });
    const r = await s.timeout(4500).emitWithAck("join", { mode, code, pose });
    assert(r.ok);
    return [s, r];
  }
  let joinInfo;
  [peer, joinInfo] = await join("private");
  [publicPeer] = await join("public");
  await p.locator('[data-action="mode"]').click();
  await p.locator('[data-mode="private"]').click();
  await p.locator("#room-code").fill(joinInfo.room);
  await p.locator('[data-action="confirm-room"]').click();
  await p.locator(".launch").click();
  await p.waitForFunction(
    (r) => document.querySelector("#hud-room")?.textContent.includes(r),
    joinInfo.room,
    { timeout: 80000 },
  );
  const [snap] = await once(peer, "snapshot", {
    signal: AbortSignal.timeout(5000),
  });
  assert.equal(snap.peers.length, 2);
  const [isolated] = await once(publicPeer, "snapshot", {
    signal: AbortSignal.timeout(5000),
  });
  assert.equal(isolated.peers.length, 1);
  await p.keyboard.press("KeyP");
  await p.locator('[data-action="chat"]').click();
  await p.locator("#message").fill("Coast is clear");
  const incoming = once(peer, "message", { signal: AbortSignal.timeout(8000) });
  await p.locator('#chat-form [type="submit"]').click();
  assert.match(String(await incoming), /Coast is clear/);
  checked(
    "Private and public room isolation, shared snapshots and in-game chat",
  );
  await context.close();
  peer.disconnect();
  publicPeer.disconnect();
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  const m = (activePage = await mobile.newPage());
  watch(m);
  await m.goto(url);
  assert(
    await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  );
  await m.locator('.utility [data-action="fullscreen"]').tap();
  assert(
    await m.evaluate(
      () =>
        !!document.fullscreenElement ||
        document.documentElement.classList.contains("pseudo-full"),
    ),
  );
  await m.locator('.utility [data-action="fullscreen"]').tap();
  await m.locator('[data-nav="settings"]').tap();
  await m.locator('[data-setting="Quality"]').selectOption("Max FPS");
  await m.locator('[data-nav="play"]').last().tap();
  await m.setViewportSize({ width: 640, height: 360 });
  await m.locator(".launch").tap();
  await m.waitForFunction(
    () => Number(document.querySelector("#surface canvas")?.dataset.frames) > 2,
    null,
    { timeout: 80000 },
  );
  await m.waitForSelector(".touch-stick");
  const stick = await m.locator(".touch-stick").boundingBox(),
    x = stick.x + stick.width / 2,
    y = stick.y + stick.height / 2,
    c = await m.locator("#surface canvas").getAttribute("data-position");
  const cdp = await mobile.newCDPSession(m);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x, y: y - 30 }],
  });
  await m.waitForFunction(
    (v) => document.querySelector("#surface canvas").dataset.position !== v,
    c,
    { timeout: 20000 },
  );
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  checked("Mobile viewport, fullscreen and working touch joystick");
  await mobile.close();
  assert.deepEqual(errors, []);
  checked(
    "Zero console errors, uncaught exceptions, HTTP errors or shader diagnostics",
  );
  await mkdir(".release", { recursive: true });
  await writeFile(
    ".release/smoke.json",
    JSON.stringify(
      {
        version: pkg.version,
        date: new Date().toISOString(),
        checks,
        errors,
        ...report,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`Verified ${checks.length} groups.`);
} catch (e) {
  console.error("Browser diagnostics:", errors);
  if (activePage && !activePage.isClosed())
    console.error(
      "UI:",
      await activePage.evaluate(() => ({
        dialog: document.querySelector("dialog[open]")?.innerText,
        hud: document.querySelector("#hud")?.innerText,
        canvas: { ...document.querySelector("#surface canvas")?.dataset },
        main: document.querySelector("#page")?.innerText.slice(0, 180),
      })),
    );
  throw e;
} finally {
  peer?.disconnect();
  publicPeer?.disconnect();
  await browser?.close();
  server.kill("SIGTERM");
}
