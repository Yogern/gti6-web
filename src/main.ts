import "./ui/style.css";
import { shell, hub } from "./ui/hub";
import { $, $$, icon, toast, esc, modal, closeModal } from "./ui/shared";
import {
  mapPage,
  garagePage,
  settingsPage,
  select,
  row,
  toggle,
  type SettingsTab,
} from "./ui/pages";
import { drawMap } from "./ui/map";
import { editLayout } from "./ui/editor";
import {
  newProgress,
  clock,
  money,
  clamp,
  paints,
  keyDefaults,
  keyLabel,
  type Mode,
  type Weather,
  type Quality,
} from "./core/state";
import {
  readPrefs,
  writePrefs,
  readSlot,
  writeSlot,
  importSave,
  exportSave,
  type StoredSave,
} from "./core/saves";
import { districtAt, place, type District, type CarId } from "./world/atlas";
import { Soundscape } from "./systems/audio";
import { Session } from "./multiplayer/client";
import { jobText } from "./systems/activities";
import type { Game } from "./core/game";
import type { openGarage } from "./graphics/garage";
const p = newProgress(),
  pref = readPrefs(),
  net = new Session(),
  audio = new Soundscape();
let game: Game | undefined,
  garage: Awaited<ReturnType<typeof openGarage>> | null = null;
let page: "play" | "map" | "settings" | "garage" = "play",
  selected: District = "beach",
  mapSelected: District = "beach",
  mode: Mode = "solo",
  code = "",
  inGame = false,
  launching = false,
  fromGame = false,
  spawnChanged = false,
  tab: SettingsTab = "session",
  gen = 0,
  slotList: (StoredSave | null)[] = [],
  slotRequest = 0,
  loaded = false,
  storageError = false;
let mapObs: ResizeObserver | null = null,
  rebinding: keyof typeof keyDefaults | null = null,
  forceDrive = false;
const dialog = $<HTMLDialogElement>("#dialog");
$("#app").innerHTML = shell();
const main = $("#page"),
  surface = $("#surface");
const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));
function prefSave() {
  try {
    writePrefs(pref);
  } catch {
    toast("Preferences could not be stored in this browser");
  }
  audio.apply(pref);
}
async function save(slot = 0) {
  if (!loaded) return;
  try {
    p.district = p.started ? districtAt(p.player.x, p.player.z) : selected;
    await writeSlot(slot, p, pref);
    storageError = false;
  } catch (e) {
    if (!storageError || slot) {
      toast(`Save failed: ${errorText(e)}`);
      storageError = true;
    }
    throw e;
  }
}
function autosave() {
  if (p.started) void save().catch(() => undefined);
}
function soundIcon() {
  for (const btn of $$(".sound")) {
    btn.innerHTML = icon(pref.muted ? "volume-x" : "volume-2", 18);
    btn.title = pref.muted ? "Enable sound" : "Mute sound";
    btn.setAttribute("aria-pressed", String(!pref.muted));
  }
}
function header() {
  for (const link of $$(".nav-link")) {
    link.classList.toggle("active", link.dataset.nav === page);
    if (link.dataset.nav === page) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
  soundIcon();
}
function releasePage() {
  gen++;
  mapObs?.disconnect();
  mapObs = null;
  garage?.dispose();
  garage = null;
}
function render() {
  releasePage();
  header();
  const token = gen;
  if (page === "play") main.innerHTML = hub(p, mode, selected);
  else if (page === "map") {
    main.innerHTML = mapPage(p, mapSelected, fromGame);
    const canvas = $<HTMLCanvasElement>("#atlas");
    const draw = () => {
      const locate = drawMap(canvas, p, false, mapSelected);
      canvas.onclick = (e) => {
        const loc = locate?.(e.clientX, e.clientY);
        if (!loc) {
          toast("Choose a point inside the playable city");
          return;
        }
        p.waypoint = loc;
        autosave();
        render();
        toast("GPS waypoint placed");
      };
    };
    mapObs = new ResizeObserver(draw);
    mapObs.observe(canvas.parentElement!);
    draw();
  } else if (page === "garage") {
    main.innerHTML = garagePage(p, fromGame);
    const canvas = $<HTMLCanvasElement>("#garage-view");
    void import("./graphics/garage")
      .then(async ({ openGarage }) => {
        if (gen !== token) return;
        const view = await openGarage(canvas, p.car, p.paint, pref.quality);
        if (gen !== token) {
          view.dispose();
          return;
        }
        garage = view;
        $(".garage-scene .loading")?.remove();
      })
      .catch((e) => {
        if (gen !== token) return;
        $(".garage-scene .loading")?.remove();
        $(".garage-scene").insertAdjacentHTML(
          "beforeend",
          `<p class="garage-error">${esc(errorText(e))}</p>`,
        );
      });
  } else {
    main.innerHTML = settingsPage(p, pref, tab, slotList, fromGame);
    const file = $<HTMLInputElement>("#import-file");
    if (file)
      file.onchange = () => {
        if (file.files?.[0])
          void importSave(file.files[0])
            .then((s) => confirmRestore(s, "Import save"))
            .catch((e) => toast(errorText(e)));
      };
  }
}
async function slots() {
  const id = ++slotRequest;
  try {
    const list = await Promise.all(
      Array.from({ length: 6 }, (_, i) => readSlot(i)),
    );
    if (id !== slotRequest) return;
    slotList = list;
    if (!inGame && page === "settings" && tab === "saves") render();
  } catch {
    toast("Save storage is unavailable in this browser");
  }
}
function showPage(next: typeof page) {
  if (launching) return;
  if (inGame) {
    game?.pause();
    inGame = false;
    fromGame = true;
    autosave();
  }
  if (dialog.open) closeModal();
  $("#app").classList.remove("in-game");
  $("#play-screen").hidden = true;
  page = next;
  if (next === "play") {
    fromGame = false;
    if (!spawnChanged && p.started)
      selected = districtAt(p.player.x, p.player.z);
  }
  if (next === "map") mapSelected = selected;
  render();
  if (next === "settings" && tab === "saves") void slots();
  window.scrollTo(0, 0);
}
function arrive(id: District) {
  const d = place(id);
  p.driving = false;
  p.district = id;
  p.player = { x: d.x, y: 1.05, z: d.z, yaw: 0 };
  p.vehicle = { x: d.x - 2.8, y: 0.75, z: d.z - 3.4, yaw: 0 };
  p.cameraYaw = 0;
  p.cameraPitch = 0.25;
  selected = id;
  mapSelected = id;
  spawnChanged = false;
  net.travel(id);
  game?.restore();
}
function waitScreen(text: string) {
  let l = $("#play-loading");
  if (!l) {
    l = document.createElement("div");
    l.id = "play-loading";
    l.className = "loading";
    $("#play-screen").append(l);
  }
  l.innerHTML = `<img width="60" src="/mark.svg" alt=""><b>VICE LEONIDA</b><small>${text}</small><div class="loading-bar"></div>`;
}
async function launch() {
  if (launching || (inGame && game?.running)) return;
  launching = true;
  try {
    await ready;
    if (dialog.open) closeModal();
    releasePage();
    game?.pause();
    if (spawnChanged || !p.started) arrive(selected);
    inGame = true;
    fromGame = false;
    $("#app").classList.add("in-game");
    $("#play-screen").hidden = false;
    waitScreen("STREAMING THE DISTRICT");
    void audio
      .unlock(pref)
      .catch(() => toast("Tap the speaker to enable audio"));
    if (!game) {
      const canvas = document.createElement("canvas");
      canvas.setAttribute("aria-label", "Playable 3D world");
      canvas.tabIndex = 0;
      surface.replaceChildren(canvas);
      const { Game } = await import("./core/game");
      const instance = new Game(
        canvas,
        p,
        pref,
        net,
        audio,
        gameAction,
        autosave,
      );
      await instance.init();
      game = instance;
    }
    if (forceDrive) {
      p.driving = true;
      Object.assign(p.player, p.vehicle);
      game.restore();
      forceDrive = false;
    }
    if (mode !== "solo" && !net.room) {
      waitScreen("CONNECTING TO ROOM");
      await net.join(mode, code, game.pose());
      if (mode === "private") code = net.room;
      toast(`Joined room ${net.room} · ${net.name}`);
    } else if (mode === "solo" && net.room) net.leave();
    $("#play-loading")?.remove();
    game.start();
    game.canvas.focus({ preventScroll: true });
    autosave();
    if (!net.room)
      toast(
        matchMedia("(pointer:coarse)").matches
          ? "Use the stick to move. Tap Use beside your car."
          : "WASD to move · E to drive · P for phone",
      );
  } catch (e) {
    $("#play-loading")?.remove();
    game?.pause();
    inGame = false;
    launching = false;
    showPage("play");
    modal(
      "SESSION / CONNECTION",
      "Unable to enter world",
      `<p class="dialog-desc">${esc(errorText(e))}</p><div class="dialog-buttons"><button class="secondary" data-action="close">Back to hub</button>${mode !== "solo" ? '<button class="primary" data-action="solo-retry">Play solo</button>' : ""}</div>`,
    );
  } finally {
    launching = false;
  }
}
function pauseForDialog() {
  if (inGame && game?.running) game.pause();
}
function gameAction(a: string) {
  if (a === "pause") {
    showPage("play");
    return;
  }
  if (a === "map") {
    showPage("map");
    return;
  }
  if (a === "phone") {
    phone();
    return;
  }
  if (a === "lost") {
    showPage("play");
    modal(
      "GRAPHICS / DEVICE",
      "Graphics context lost",
      '<p class="dialog-desc">Your session has been saved. Reload this page to reconnect the graphics device.</p><button class="primary" data-action="reload-app">Reload game</button>',
    );
    return;
  }
  void action(a);
}
function phone() {
  pauseForDialog();
  modal(
    "LEONIDA MOBILE / " + clock(p.minutes),
    "Phone",
    `<div class="balance"><small>LOCAL BALANCE</small><b>${money(p.cash)}</b></div><div class="app-grid">${[
      ["map", "map", "GPS map", "Waypoints & travel"],
      [
        "jobs",
        "flag",
        "Contracts",
        p.job === "none" ? "Delivery & racing" : "Contract active",
      ],
      [
        "radio",
        "disc-3",
        "Car radio",
        ["Radio off", "Sunset FM", "Coast AM"][p.station],
      ],
      ["cheats", "zap", "Sandbox", "Time, weather & more"],
      ["game-saves", "save", "Save data", "Slots & export"],
      [
        net.room ? "chat" : "gesture",
        net.room ? "messages-square" : "hand",
        net.room ? "Room chat" : "Social",
        net.room ? net.room : "Wave hello",
      ],
    ]
      .map(
        ([a, i, t, d]) =>
          `<button class="app-tile" data-action="${a}">${icon(i, 21)}${t}<small>${d}</small></button>`,
      )
      .join(
        "",
      )}</div><div class="controls-help"><kbd>${keyLabel(pref.keys.forward)}</kbd> move · drag to look · <kbd>${keyLabel(pref.keys.interact)}</kbd> interact · <kbd>Esc</kbd> hub</div>`,
  );
}
function contracts() {
  pauseForDialog();
  modal(
    "DISPATCH / ACTIVITIES",
    "Contracts",
    `<p class="dialog-desc">Drive through the marked stops to earn local credits. The active stop is shown on your radar.</p><div class="stack"><button class="list-choice" data-job="delivery">${icon("package-check", 22)}<div><strong>Campus courier</strong><small>Port dispatch → Sharaga courtyard</small></div><b>+$750</b></button><button class="list-choice" data-job="race">${icon("flag", 22)}<div><strong>Ocean Drive circuit</strong><small>Timed five-stop driving circuit</small></div><b>+$1,200</b></button></div><p class="muted">Completed: ${p.completed} · ${p.job === "none" ? "No active contract" : jobText(p)}</p>${p.job !== "none" ? '<button class="small-button" data-action="cancel-job">Cancel contract</button>' : ""}`,
  );
}
function sandbox() {
  pauseForDialog();
  const shared = !!net.room;
  modal(
    "WORLD / MODIFIERS",
    "Sandbox controls",
    `${shared ? '<div class="notice">Room time and weather are synchronized by the server.</div>' : ""}${row("Weather", "Local sky and visibility.", shared ? esc(p.weather) : select("Weather", ["Clear", "Haze", "Rain"], p.weather))}${row("Time of day", `<span id="time-value">${clock(p.minutes)}</span>`, shared ? "Shared clock" : `<input type="range" aria-label="Time of day" data-range="minutes" min="0" max="1439" value="${Math.floor(p.minutes)}">`)}${row("Super movement", "Faster sprint and higher jumps.", toggle("boost", p.boost, "Super movement"))}${row("Moon gravity", "Lower on-foot gravity.", toggle("moon", p.moon, "Moon gravity"))}${row("Local funds", money(p.cash), '<button class="small-button" data-action="cash">+$100,000</button>')}<div class="dialog-buttons"><button class="secondary" data-action="campus-travel">${icon("landmark", 15)} Sharaga College</button><button class="secondary" data-action="warp-waypoint" ${!p.waypoint || shared ? "disabled" : ""}>${icon("map-pin", 15)} To waypoint</button></div>`,
  );
}
function chat() {
  pauseForDialog();
  modal(
    "MULTIPLAYER / " + esc(net.room),
    "Room chat",
    `<div class="chat-log"></div><label class="form-label" for="message">Message as ${esc(net.name)}</label><form id="chat-form" class="row"><input class="field" id="message" aria-label="Message" maxlength="160" autocomplete="off"><button class="primary" type="submit">${icon("send", 15)} Send</button><button class="secondary" type="button" data-action="wave-chat">Wave hello</button></form>`,
  );
  const refresh = () => {
    const l = $(".chat-log");
    if (l) {
      l.textContent = net.messages.join("\n") || "No messages yet.";
      l.scrollTop = l.scrollHeight;
    }
  };
  refresh();
  net.onMessage = refresh;
  $("#chat-form").onsubmit = (e) => {
    e.preventDefault();
    const input = $<HTMLInputElement>("#message");
    if (input.value.trim()) net.chat(input.value);
    input.value = "";
  };
}
function confirmRestore(s: StoredSave, title: string) {
  modal(
    "STORAGE / RESTORE",
    title,
    `<p class="dialog-desc">Restore ${place(s.progress.district).name}, ${money(s.progress.cash)} and the saved control layout? This replaces the current session, not your manual slots.</p><div class="dialog-buttons"><button class="secondary" data-action="close">Cancel</button><button class="primary" id="confirm-load">Restore session</button></div>`,
  );
  $("#confirm-load").onclick = async () => {
    net.leave();
    mode = "solo";
    Object.assign(p, structuredClone(s.progress));
    Object.assign(pref, structuredClone(s.preferences));
    selected = p.district;
    spawnChanged = false;
    prefSave();
    game?.restore();
    closeModal();
    await save().catch(() => undefined);
    render();
    void slots();
    toast("Session restored");
  };
}
async function fullscreen() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    if (document.documentElement.classList.contains("pseudo-full")) {
      document.documentElement.classList.remove("pseudo-full");
      toast("Windowed view");
      return;
    }
    const root = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => void;
    };
    if (root.requestFullscreen) await root.requestFullscreen();
    else if (root.webkitRequestFullscreen) root.webkitRequestFullscreen();
    else throw Error();
    if (matchMedia("(pointer:coarse)").matches)
      try {
        await (
          screen.orientation as ScreenOrientation & {
            lock?: (s: string) => Promise<void>;
          }
        ).lock?.("landscape");
      } catch {
        /* Some mobile browsers do not offer orientation locks. */
      }
  } catch {
    document.documentElement.classList.add("pseudo-full");
    toast(
      "Edge-to-edge view. Open the preview directly or add it to your home screen for device fullscreen.",
    );
  }
}
async function action(a: string) {
  if (a === "launch") {
    await launch();
    return;
  }
  if (a === "close") {
    closeModal();
    return;
  }
  if (a === "back") {
    showPage("play");
    return;
  }
  if (a === "fullscreen") {
    await fullscreen();
    return;
  }
  if (a === "sound") {
    pref.muted = !pref.muted;
    prefSave();
    await audio
      .unlock(pref)
      .catch(() => toast("Audio is not available in this browser"));
    soundIcon();
    if (page === "settings" && !inGame) render();
    return;
  }
  if (a === "mode") {
    const list = $("#mode-list");
    list.hidden = !list.hidden;
    $(".mode-toggle").setAttribute("aria-expanded", String(!list.hidden));
    return;
  }
  if (a === "solo-retry") {
    mode = "solo";
    code = "";
    await launch();
    return;
  }
  if (a === "confirm-room") {
    const input = $<HTMLInputElement>("#room-code");
    const val = input.value.toUpperCase().trim();
    if (!/^([A-F0-9]{6})?$/.test(val)) {
      $("#room-error").textContent =
        "Use the six-character room code, or leave it empty to create a room.";
      return;
    }
    code = val;
    mode = "private";
    net.leave();
    closeModal();
    render();
    toast(
      code
        ? "Private room selected"
        : "A private room will be created when you enter",
    );
    return;
  }
  if (a === "district-travel" || a === "campus-travel") {
    arrive(a === "campus-travel" ? "campus" : mapSelected);
    if (inGame) {
      closeModal();
      autosave();
    } else await launch();
    return;
  }
  if (a === "clear-waypoint") {
    p.waypoint = null;
    autosave();
    render();
    return;
  }
  if (a === "take-drive") {
    forceDrive = true;
    await launch();
    return;
  }
  if (a === "show-fps") {
    pref.showFps = !pref.showFps;
    prefSave();
    render();
    return;
  }
  if (a === "layout") {
    editLayout(pref, prefSave);
    return;
  }
  if (a === "reset-keys") {
    Object.assign(pref.keys, keyDefaults);
    prefSave();
    render();
    toast("Default bindings restored");
    return;
  }
  if (a === "cheats") {
    sandbox();
    return;
  }
  if (a === "boost" || a === "moon" || a === "cash") {
    if (a === "cash") p.cash = Math.min(1e10, p.cash + 100000);
    else p[a] = !p[a];
    autosave();
    sandbox();
    return;
  }
  if (a === "warp-waypoint" && p.waypoint && !net.room) {
    const pt = p.waypoint;
    p.driving = false;
    const y = game?.sim.groundAt(pt.x, pt.z) ?? 0;
    p.player = { ...pt, y: clamp(y + 1.1, 1, 59), yaw: p.cameraYaw };
    p.waypoint = null;
    game?.restore();
    autosave();
    closeModal();
    toast("Arrived at waypoint");
    return;
  }
  if (a === "jobs") {
    contracts();
    return;
  }
  if (a === "cancel-job") {
    p.job = "none";
    p.stage = 0;
    autosave();
    contracts();
    return;
  }
  if (a === "map") {
    showPage("map");
    return;
  }
  if (a === "game-saves") {
    tab = "saves";
    showPage("settings");
    return;
  }
  if (a === "gesture") {
    closeModal();
    game?.action("gesture");
    return;
  }
  if (a === "radio") {
    p.station = (p.station + 1) % 3;
    audio.station = p.station;
    if (p.station) {
      pref.muted = false;
      prefSave();
      await audio.unlock(pref);
    }
    phone();
    toast(p.station ? "Station plays while driving" : "Radio off");
    return;
  }
  if (a === "chat") {
    chat();
    return;
  }
  if (a === "wave-chat") {
    net.chat("waves hello 👋");
    return;
  }
  if (a === "export") {
    exportSave(p, pref);
    toast("Save exported");
    return;
  }
  if (a === "import") {
    $<HTMLInputElement>("#import-file").click();
    return;
  }
  if (a === "reload-app") {
    location.reload();
    return;
  }
  if (a === "credits") {
    modal(
      "PRODUCTION / ATTRIBUTION",
      "Asset credits",
      `<p class="dialog-desc">Original fictional world and generated location key art. Not affiliated with Rockstar Games.</p><ul><li>CarConcept — Eric Chadwick / Darmstadt Graphics Group, CC BY 4.0.</li><li>Milk Truck — Cesium, CC BY 4.0.</li><li>Animated casual characters, street and campus props — Quaternius, CC0.</li><li>Sheen Chair — Eric Chadwick / Wayfair, CC0.</li><li>Blouberg Sunrise 2 — Greg Zaal / Poly Haven, CC0.</li><li>Barlow — Jeremy Tribby, OFL. Icons — Lucide, ISC.</li></ul><a href="/assets/manifest.json" target="_blank" rel="noreferrer">Sources & modifications ↗</a>`,
    );
    return;
  }
}
async function click(e: MouseEvent) {
  const b = (e.target as Element).closest<HTMLElement>("button");
  if (!b) {
    if (!dialog.open) hideModes();
    return;
  }
  if (b.hasAttribute("disabled")) return;
  if (b.dataset.action !== "mode" && !b.dataset.mode) hideModes();
  if (b.dataset.nav) {
    showPage(b.dataset.nav as typeof page);
    return;
  }
  if (b.dataset.action) {
    await action(b.dataset.action);
    return;
  }
  if (b.dataset.district) {
    selected = b.dataset.district as District;
    spawnChanged = true;
    render();
    toast(`${place(selected).name} selected as spawn district`);
    return;
  }
  if (b.dataset.mode) {
    const m = b.dataset.mode as Mode;
    hideModes();
    if (m === "private") {
      modal(
        "NETWORK / PRIVATE LOBBY",
        "Private room",
        `<p class="dialog-desc">Enter a friend's room code, or leave the field empty to host a new room. The code appears on your in-game HUD.</p><label class="form-label" for="room-code">ROOM CODE</label><input class="field" id="room-code" maxlength="6" placeholder="Create a new room" autocomplete="off" autocapitalize="characters"><p class="dialog-msg" id="room-error"></p><div class="dialog-buttons"><button class="secondary" data-action="close">Cancel</button><button class="primary" data-action="confirm-room">Select room</button></div>`,
      );
    } else {
      if (mode !== m) net.leave();
      mode = m;
      code = "";
      render();
    }
    return;
  }
  if (b.dataset.mapDistrict) {
    mapSelected = b.dataset.mapDistrict as District;
    const d = place(mapSelected);
    p.waypoint = { x: d.x, z: d.z };
    render();
    autosave();
    return;
  }
  if (b.dataset.car) {
    p.car = b.dataset.car as CarId;
    autosave();
    render();
    return;
  }
  if (b.dataset.paint) {
    if (!paints.includes(b.dataset.paint)) return;
    p.paint = b.dataset.paint;
    garage?.paint(p.paint);
    for (const s of $$(".swatch")) {
      s.classList.toggle("selected", s.dataset.paint === p.paint);
      s.setAttribute("aria-pressed", String(s.dataset.paint === p.paint));
    }
    autosave();
    return;
  }
  if (b.dataset.tab) {
    tab = b.dataset.tab as SettingsTab;
    render();
    if (tab === "saves") await slots();
    return;
  }
  if (b.dataset.bind) {
    rebinding = b.dataset.bind as keyof typeof keyDefaults;
    modal(
      "INPUT / KEYBOARD",
      "Assign key",
      `<p class="dialog-desc">Press a new key for <b>${esc(rebinding)}</b>. Escape cancels. Navigation shortcuts and duplicate bindings are reserved.</p><p id="bind-error" class="dialog-msg"></p>`,
    );
    return;
  }
  if (b.dataset.job) {
    p.job = b.dataset.job as "delivery" | "race";
    p.stage = 0;
    p.raceTime = 0;
    autosave();
    closeModal();
    toast(jobText(p));
    return;
  }
  if (b.dataset.save) {
    const slot = Number(b.dataset.save);
    const store = async () => {
      await save(slot);
      await slots();
      toast(`Saved to slot 0${slot}`);
    };
    if (slotList[slot]) {
      modal(
        "STORAGE / MANUAL SAVE",
        "Replace this save?",
        `<p class="dialog-desc">Overwrite slot 0${slot} with your current session?</p><div class="dialog-buttons"><button class="secondary" data-action="close">Cancel</button><button class="primary" id="overwrite">Replace save</button></div>`,
      );
      $("#overwrite").onclick = () => {
        closeModal();
        void store().catch((e) => toast(errorText(e)));
      };
    } else await store();
    return;
  }
  if (b.dataset.load !== undefined) {
    const s = await readSlot(Number(b.dataset.load));
    if (s) confirmRestore(s, "Load saved session");
    return;
  }
}
function hideModes() {
  const l = $("#mode-list");
  if (l && !l.hidden) {
    l.hidden = true;
    $(".mode-toggle")?.setAttribute("aria-expanded", "false");
  }
}
document.addEventListener(
  "click",
  (e) => void click(e).catch((err) => toast(errorText(err))),
);
document.addEventListener("change", (e) => {
  const input = e.target as HTMLSelectElement;
  if (input.dataset.setting === "Quality") {
    pref.quality = input.value as Quality;
    prefSave();
  }
  if (input.dataset.setting === "Touch") {
    pref.touch = input.value as "Auto" | "Always";
    prefSave();
  }
  if (input.dataset.setting === "Weather" && !net.room) {
    p.weather = input.value as Weather;
    autosave();
  }
});
document.addEventListener("input", (e) => {
  const input = e.target as HTMLInputElement;
  switch (input.dataset.range) {
    case "volume":
      pref.volume = clamp(+input.value / 100, 0, 1);
      prefSave();
      break;
    case "sensitivity":
      pref.sensitivity = clamp(+input.value / 100, 0.3, 2);
      prefSave();
      break;
    case "minutes":
      if (!net.room) {
        p.minutes = clamp(+input.value, 0, 1439);
        $("#time-value").textContent = clock(p.minutes);
      }
      break;
  }
});
dialog.addEventListener("close", () => {
  rebinding = null;
  net.onMessage = null;
  if (inGame && !launching && !dialog.open && !game?.running) {
    game?.start();
    game?.canvas.focus({ preventScroll: true });
  } else if (!inGame && page === "settings" && !dialog.open) render();
  autosave();
});
dialog.addEventListener("click", (e) => {
  if (e.target === dialog) {
    const r = dialog.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      closeModal();
  }
});
window.addEventListener(
  "keydown",
  (e) => {
    if (rebinding && dialog.open) {
      if (e.code === "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (
        [
          "Escape",
          "Tab",
          "Backquote",
          "MetaLeft",
          "MetaRight",
          "ControlLeft",
          "ControlRight",
          "AltLeft",
          "AltRight",
          "Enter",
        ].includes(e.code) ||
        /^F\d+$/.test(e.code) ||
        Object.entries(pref.keys).some(
          ([k, v]) => k !== rebinding && v === e.code,
        )
      ) {
        $("#bind-error").textContent =
          "That key is already in use or reserved.";
        return;
      }
      pref.keys[rebinding] = e.code;
      prefSave();
      closeModal();
      toast("Binding saved");
      return;
    }
    if (
      dialog.open ||
      inGame ||
      launching ||
      e.repeat ||
      e.ctrlKey ||
      e.metaKey ||
      e.altKey ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(
        (e.target as HTMLElement).tagName,
      )
    )
      return;
    if (
      e.code === "Enter" &&
      page === "play" &&
      (e.target === document.body || e.target === document.documentElement)
    ) {
      e.preventDefault();
      void launch();
    } else if (e.code === pref.keys.map) {
      e.preventDefault();
      showPage(page === "map" ? "play" : "map");
    } else if (e.code === "Escape") {
      if (!$("#mode-list")?.hidden && $("#mode-list")) hideModes();
      else if (fromGame) void launch();
      else showPage("play");
    } else if (e.code === "Backquote") {
      e.preventDefault();
      sandbox();
    }
  },
  { capture: true },
);
net.onLoss = () => {
  mode = "solo";
  toast("Room disconnected · continuing solo");
  if (!inGame) render();
};
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    autosave();
    game?.controls.reset();
    if (inGame && !launching && !dialog.open) showPage("play");
  }
});
window.addEventListener("pagehide", () => {
  autosave();
  net.leave();
});
setInterval(autosave, 60000);
render();
const ready = (async () => {
  try {
    const s = await readSlot(0);
    if (s) {
      Object.assign(p, s.progress);
      selected = p.district;
      mapSelected = selected;
    }
  } catch {
    storageError = true;
    toast("Local saves are unavailable in this browser");
  } finally {
    loaded = true;
    if (!inGame && !launching) render();
  }
})();
