import { cars, districts, place, type District } from "../world/atlas";
import {
  clock,
  money,
  paints,
  keyDefaults,
  keyLabel,
  type Prefs,
  type Progress,
} from "../core/state";
import { icon, esc } from "./shared";
import type { StoredSave } from "../core/saves";
export function heading(
  eyebrow: string,
  title: string,
  desc: string,
  back = false,
) {
  return `<div class="sub-heading"><div><div class="eyebrow"><i class="pink-rule"></i>${eyebrow}</div><h1>${title}</h1><p>${desc}</p></div><button data-action="${back ? "launch" : "back"}" class="textlink">${icon(back ? "play" : "arrow-left", 15)} ${back ? "Resume" : "World hub"}</button></div>`;
}
export function mapPage(p: Progress, d: District, back: boolean) {
  return `<section class="subpage">${heading("NAVIGATION / GPS", "World map", "Select a district or tap the map to mark your own waypoint.", back)}<div class="map-layout"><div class="panel map-panel"><canvas id="atlas" aria-label="Map of the playable city; click to set a waypoint"></canvas><div class="map-indicator">${icon("compass", 14)} LEONIDA COUNTY</div><div class="map-hint">GRID 01–04 &nbsp; / &nbsp; NORTH UP</div></div><aside class="panel panel-pad"><div class="eyebrow">DISTRICT DIRECTORY</div><div class="stack" style="margin:15px 0">${districts.map((l, i) => `<button class="list-choice ${l.id === d ? "selected" : ""}" data-map-district="${l.id}">${icon(l.icon, 20)}<div><strong>${l.name}</strong><small>${l.area}</small></div><small>0${i + 1}</small></button>`).join("")}</div><p class="muted">${place(d).description}</p><button class="primary" data-action="district-travel">${icon("navigation-2", 16)} Travel here</button><div class="map-legend" style="margin-top:17px"><i></i> Waypoint <i></i> Player</div><div class="muted" id="waypoint-summary">${p.waypoint ? "Waypoint set · " + Math.round(Math.hypot(p.waypoint.x - p.player.x, p.waypoint.z - p.player.z)) + " m away" : "No custom waypoint"}</div>${p.waypoint ? '<button class="textlink" data-action="clear-waypoint">Clear waypoint</button>' : ""}</aside></div></section>`;
}
export function garagePage(p: Progress, back: boolean) {
  const car = cars[p.car];
  return `<section class="subpage">${heading("MOTOR POOL / COLLECTION", "Garage", "Choose your vehicle and paint finish. Drag the model to rotate.", back)}<div class="garage-layout"><div class="garage-scene panel"><canvas id="garage-view" aria-label="Interactive three-dimensional vehicle preview"></canvas><div class="map-indicator">SHOWROOM &nbsp; / &nbsp; 0${p.car === "veloce" ? 1 : 2}</div><div class="garage-caption"><span class="eyebrow">${car.tag.toUpperCase()}</span><b>${car.name}</b></div><div class="loading"><small>PREPARING SHOWROOM</small><div class="loading-bar"></div></div></div><aside class="panel panel-pad"><div class="eyebrow">OWNED VEHICLES / 02</div><div class="stack" style="margin:16px 0 24px">${Object.entries(
    cars,
  )
    .map(
      ([id, c]) =>
        `<button class="list-choice ${p.car === id ? "selected" : ""}" data-car="${id}">${icon("car-front", 21)}<div><strong>${c.name}</strong><small>${c.tag}</small></div>${p.car === id ? icon("check", 16) : ""}</button>`,
    )
    .join(
      "",
    )}</div><div class="section-label">Paint finish</div><div class="paints" style="margin:9px 0 14px">${paints.map((c, i) => `<button class="swatch ${p.paint === c ? "selected" : ""}" aria-label="${["Coral", "Lagoon", "Pearl", "Midnight", "Amber"][i]} paint" aria-pressed="${p.paint === c}" style="--swatch:${c}" data-paint="${c}"></button>`).join("")}</div><div class="setting-row"><strong>Top speed</strong><span>${Math.round(car.top * 3.6)} km/h</span></div><div class="setting-row"><strong>Drive type</strong><span>Rear wheel</span></div><button class="primary" style="width:100%;margin-top:20px" data-action="take-drive">${icon("play", 15)} Take for a drive</button></aside></div></section>`;
}
export type SettingsTab = "session" | "controls" | "saves";
export const row = (title: string, desc: string, ui: string) =>
  `<div class="setting-row"><div><strong>${title}</strong>${desc ? `<small>${desc}</small>` : ""}</div>${ui}</div>`;
export const select = (id: string, vals: string[], current: string) =>
  `<select aria-label="${id}" data-setting="${id}">${vals.map((v) => `<option ${current === v ? "selected" : ""}>${v}</option>`).join("")}</select>`;
export const toggle = (a: string, on: boolean, title: string) =>
  `<button class="toggle ${on ? "on" : ""}" role="switch" aria-checked="${on}" aria-label="${title}" data-action="${a}"></button>`;
export function settingsPage(
  p: Progress,
  f: Prefs,
  tab: SettingsTab,
  slots: (StoredSave | null)[],
  back: boolean,
) {
  let content = "";
  if (tab === "session")
    content = `<h3>Graphics & sound</h3>${row("Render quality", "Balanced adapts resolution to measured frame time.", select("Quality", ["Ultra", "High", "Balanced", "Max FPS"], f.quality))}${row("Frame telemetry", "Show measured FPS and the active renderer in game.", toggle("show-fps", f.showFps, "Frame telemetry"))}${row("Master audio", "Ocean ambience, engine audio and radio.", toggle("sound", !f.muted, "Master audio"))}${row("Volume", "Master gain for the entire soundscape.", `<input aria-label="Volume" data-range="volume" type="range" min="0" max="100" value="${Math.round(f.volume * 100)}">`)}${row("Environment", "Local time and weather in the current session.", `<button class="small-button" data-action="cheats">${icon("sunset", 16)} ${clock(p.minutes)} · ${p.weather}</button>`)}${row("Fullscreen", "Use the entire available display.", `<button class="small-button" data-action="fullscreen">${icon("maximize", 15)} Toggle</button>`)}<button class="textlink" data-action="credits">Asset credits ${icon("arrow-up-right", 14)}</button>`;
  if (tab === "controls")
    content = `<h3>Control setup</h3>${row("Touch controls", "Auto switches input when you use a mouse or touch.", select("Touch", ["Auto", "Always"], f.touch))}${row("HUD layout", "Drag, resize or hide your touch controls.", `<button class="small-button" data-action="layout">${icon("move", 15)} Edit layout</button>`)}${row("Look sensitivity", "Mouse and touch camera response.", `<input type="range" aria-label="Look sensitivity" data-range="sensitivity" min="30" max="200" value="${f.sensitivity * 100}">`)}<div class="section-label" style="margin:20px 0 4px">Keyboard mapping</div>${Object.keys(
      keyDefaults,
    )
      .map((k) =>
        row(
          (
            {
              forward: "Move forward / accelerate",
              back: "Move back / reverse",
              left: "Move / steer left",
              right: "Move / steer right",
              sprint: "Sprint",
              jump: "Jump / handbrake",
              interact: "Interact / enter vehicle",
              view: "Change camera",
              map: "World map",
              phone: "Phone",
              gesture: "Wave hello",
            } as Record<string, string>
          )[k],
          "",
          `<button class="small-button" data-bind="${k}">${keyLabel(f.keys[k as keyof typeof keyDefaults])}</button>`,
        ),
      )
      .join(
        "",
      )}<button class="textlink" data-action="reset-keys">${icon("rotate-ccw", 14)} Reset bindings</button>`;
  if (tab === "saves")
    content = `<h3>Local save slots</h3><p class="muted">Autosaved every minute and on key events. Export a backup to move between devices.</p>${Array.from(
      { length: 6 },
      (_, i) => {
        const s = slots[i]?.progress;
        return `<div class="slot-row"><div><strong>${i ? "Slot 0" + i : "Autosave"}</strong><small>${s ? esc(`${place(s.district).name} · ${money(s.cash)} · ${new Date(s.updated).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`) : "Empty slot"}</small></div><div class="row">${i ? `<button class="small-button" data-save="${i}">Save</button>` : ""}<button class="small-button" data-load="${i}" ${s ? "" : "disabled"}>Load</button></div></div>`;
      },
    ).join(
      "",
    )}<div class="row" style="margin-top:16px"><button class="small-button" data-action="export">${icon("download", 14)} Export JSON</button><button class="small-button" data-action="import">${icon("upload", 14)} Import JSON</button><input type="file" accept=".json,application/json" hidden id="import-file"></div>`;
  return `<section class="subpage">${heading("SYSTEM / PREFERENCES", "Settings", "Tune your session, configure controls and manage local progress.", back)}<div class="settings-layout"><div class="settings-tabs">${(
    [
      ["session", "sliders-horizontal", "Session"],
      ["controls", "gamepad-2", "Controls"],
      ["saves", "save", "Save data"],
    ] as const
  )
    .map(
      ([k, i, t]) =>
        `<button class="tabbtn ${k === tab ? "active" : ""}" data-tab="${k}">${icon(i, 16)} ${t}</button>`,
    )
    .join(
      "",
    )}</div><div class="panel panel-pad">${content}</div></div></section>`;
}
