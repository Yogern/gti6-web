import {
  clock,
  keyLabel,
  money,
  controlIds,
  type Prefs,
  type Progress,
} from "../core/state";
import { districtAt, place } from "../world/atlas";
import { icon, $, $$ } from "./shared";
import { jobText, objective } from "../systems/activities";
import { drawMap } from "./map";
import type { Controls } from "../systems/input";
export class Hud {
  private mode = false;
  private lastTouch = matchMedia("(pointer:coarse)").matches;
  private abort = new AbortController();
  constructor(
    private p: Progress,
    private pref: Prefs,
    private controls: Controls,
    private action: (name: string) => void,
  ) {
    window.addEventListener(
      "pointerdown",
      (e) => {
        const t = e.pointerType === "touch";
        if (this.lastTouch !== t && controls.active) {
          this.lastTouch = t;
          this.touchMode();
        }
      },
      { signal: this.abort.signal },
    );
    this.build();
  }
  build() {
    const h = $("#hud");
    h.innerHTML = `<div class="hud-top"><div class="hud-brand hud-panel"><img src="/mark.svg" alt=""><div><small id="hud-room">LOCAL SESSION</small><b id="hud-area"></b></div></div><div class="hud-actions">${[
      ["phone", "smartphone", "Phone"],
      ["map", "map", "World map"],
      ["fullscreen", "maximize", "Fullscreen"],
      ["pause", "pause", "Pause game"],
    ]
      .map(
        ([a, i, t]) =>
          `<button class="hud-panel" data-game="${a}" title="${t}" aria-label="${t}">${icon(i, 16)}</button>`,
      )
      .join(
        "",
      )}</div></div><div class="hud-job hud-panel" hidden></div><div class="hud-bottom"><button class="minimap" data-game="map" aria-label="Open radar map"><canvas id="radar"></canvas><i class="healthline"></i></button><div class="hud-panel"><small id="hud-clock"></small><span class="telemetry"></span></div></div><div class="hud-right hud-panel"><small id="hud-motion"></small><strong id="hud-cash"></strong></div><button data-game="interact" class="hud-prompt hud-panel"></button><div id="touch-layer"></div>`;
    for (const b of $$("[data-game]", h))
      b.onclick = () => this.action(b.dataset.game!);
    this.touchMode();
  }
  touchMode() {
    this.mode = this.pref.touch === "Always" || this.lastTouch;
    $("#hud").classList.toggle("touch-mode", this.mode);
    const layer = $("#touch-layer");
    layer.innerHTML = "";
    if (!this.mode) return;
    const names = {
      stick: "Move",
      look: "Look",
      jump: this.p.driving ? "Brake" : "Jump",
      interact: this.p.driving ? "Exit" : "Use",
      sprint: "Sprint",
      camera: "View",
    };
    for (const id of controlIds) {
      const c = this.pref.layout[id];
      if (c.hide) continue;
      const el = document.createElement("button");
      el.className = `touchpad ${id === "stick" ? "touch-stick" : id === "look" ? "touch-look" : "touch-action"}`;
      el.setAttribute("aria-label", names[id]);
      Object.assign(el.style, {
        left: c.x + "%",
        top: c.y + "%",
        opacity: String(c.opacity),
        transform: `translate(-50%, -50%) scale(${c.scale})`,
      });
      el.innerHTML =
        id === "stick"
          ? "<i></i>"
          : id === "look"
            ? icon("eye", 17)
            : names[id];
      layer.append(el);
      let pid = -1,
        lx = 0,
        ly = 0;
      const update = (e: PointerEvent) => {
        if (pid !== e.pointerId) return;
        if (id === "stick") {
          const r = el.getBoundingClientRect(),
            dx = (e.clientX - r.x - r.width / 2) / (r.width * 0.34),
            dy = (e.clientY - r.y - r.height / 2) / (r.height * 0.34),
            m = Math.max(1, Math.hypot(dx, dy));
          this.controls.x = dx / m;
          this.controls.y = dy / m;
          const i = el.firstElementChild as HTMLElement;
          i.style.transform = `translate(${(dx / m) * 26}px,${(dy / m) * 26}px)`;
        }
        if (id === "look") {
          this.controls.look(e.clientX - lx, e.clientY - ly);
          lx = e.clientX;
          ly = e.clientY;
        }
      };
      el.onpointerdown = (e) => {
        el.setPointerCapture(e.pointerId);
        pid = e.pointerId;
        lx = e.clientX;
        ly = e.clientY;
        this.controls.lastUse = performance.now();
        if (id === "jump") this.controls.touchJump = true;
        if (id === "sprint") this.controls.touchSprint = true;
        if (id === "interact" || id === "camera")
          this.action(id === "camera" ? "view" : id);
        update(e);
      };
      el.onpointermove = update;
      el.onlostpointercapture = () => {
        pid = -1;
        if (id === "jump") this.controls.touchJump = false;
        if (id === "sprint") this.controls.touchSprint = false;
        if (id === "stick") {
          this.controls.x = this.controls.y = 0;
          (el.firstElementChild as HTMLElement).style.transform = "";
        }
      };
    }
  }
  refresh(
    fps: number,
    api: string,
    speed: number,
    near: boolean,
    social: boolean,
    room: string,
  ) {
    const p = this.p;
    $("#hud-area").textContent = place(districtAt(p.player.x, p.player.z)).area;
    $("#hud-room").textContent = room ? "ROOM " + room : "LOCAL SESSION";
    $("#hud-cash").textContent = money(p.cash);
    $("#hud-motion").textContent = p.driving
      ? `${Math.round(Math.abs(speed) * 3.6)} KM/H`
      : "ON FOOT";
    $("#hud-clock").textContent =
      `${clock(p.minutes)} · ${p.weather.toUpperCase()}`;
    $(".telemetry").textContent = this.pref.showFps
      ? `${fps.toFixed(0)} FPS · ${api}`
      : "";
    const prompt = $(".hud-prompt");
    prompt.innerHTML = p.driving
      ? `<kbd>${keyLabel(this.pref.keys.interact)}</kbd> Exit vehicle`
      : near
        ? `<kbd>${keyLabel(this.pref.keys.interact)}</kbd> Enter vehicle`
        : social
          ? `<kbd>${keyLabel(this.pref.keys.interact)}</kbd> Say hello`
          : `<kbd>${keyLabel(this.pref.keys.phone)}</kbd> Open phone`;
    prompt.dataset.game = p.driving || near || social ? "interact" : "phone";
    const target = objective(p) ?? p.waypoint,
      j = $(".hud-job");
    j.hidden = !target;
    if (target)
      j.textContent =
        (jobText(p) || "GPS waypoint") +
        ` · ${Math.round(Math.hypot(target.x - p.player.x, target.z - p.player.z))} m`;
    $("#hud").classList.toggle(
      "idle",
      performance.now() - this.controls.lastUse > 7000,
    );
    drawMap($<HTMLCanvasElement>("#radar"), p, true);
  }
}
