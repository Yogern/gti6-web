import { art, districts, place, type District } from "../world/atlas";
import { clock, VERSION, type Mode, type Progress } from "../core/state";
import { icon } from "./shared";
export const modeName: Record<Mode, string> = {
  solo: "Singleplayer",
  public: "Public lobby",
  private: "Private room",
};
export function shell() {
  return `<header class="topbar"><button class="brand" data-nav="play" aria-label="Vice Leonida home"><img src="/mark.svg" alt=""/><span>VICE LEONIDA<small>OPEN WORLD</small></span></button><nav aria-label="Main navigation">${[
    ["play", "gamepad-2", "Play"],
    ["map", "map", "World map"],
    ["garage", "car-front", "Garage"],
    ["settings", "sliders-horizontal", "Settings"],
  ]
    .map(
      ([id, i, t]) =>
        `<button data-nav="${id}" class="nav-link" aria-label="${t}">${icon(i, 17)}<span>${t}</span></button>`,
    )
    .join(
      "",
    )}</nav><div class="system"><span class="led"></span> SYSTEM READY</div><div class="utility"><button class="iconbtn sound" data-action="sound" aria-label="Toggle sound"></button><button class="iconbtn" data-action="fullscreen" title="Toggle fullscreen" aria-label="Toggle fullscreen">${icon("maximize", 17)}</button></div></header><main id="page"></main><footer id="statusbar"><div><span class="led"></span><span>ENGINE READY</span><i></i><span>BUILD ${VERSION}</span></div><div class="footerkeys"><span><kbd>↵</kbd> Launch</span><span><kbd>M</kbd> World map</span><span><kbd>Esc</kbd> Back</span></div><b>LEONIDA ENGINE <em>//</em></b></footer><section id="play-screen" hidden><div id="surface"></div><div id="hud"></div></section>`;
}
export function hub(p: Progress, mode: Mode, selected: District) {
  const d = place(selected);
  return `<section class="hero" aria-labelledby="world-title" style="--hero:url('${art(selected === "beach" ? "ocean-drive" : d.image)}')"><div class="herofilm"></div><div class="hero-conditions"><span class="tiny-led"></span> WORLD LIVE <i></i>${icon(p.weather === "Rain" ? "cloud-rain" : p.weather === "Haze" ? "cloud-fog" : "sun", 15)} ${p.weather === "Rain" ? "24" : p.weather === "Haze" ? "30" : "28"}°C <i></i>${clock(p.minutes)}</div><div class="hero-copy"><div class="eyebrow hero-kicker"><span class="speedlines"><i></i><i></i><i></i></span> OPEN-WORLD SANDBOX</div><h1 id="world-title"><span>VICE</span><strong>LEONIDA</strong></h1><div class="edition"><i></i>SHARAGA EDITION</div><p>Sun-soaked streets. Neon nights. Your city, your rules.</p><div class="hero-actions"><button class="primary launch" data-action="launch">${icon("play", 18)} ${p.started ? "Resume game" : "Enter world"}<kbd>↵</kbd></button><div class="mode-wrap"><button class="mode-toggle" data-action="mode" aria-expanded="false" aria-haspopup="true">${icon(mode === "solo" ? "user-round" : "users", 17)} ${modeName[mode]} ${icon("chevron-down", 15)}</button><div id="mode-list" hidden>${(["solo", "public", "private"] as Mode[]).map((m) => `<button data-mode="${m}">${icon(m === "solo" ? "user-round" : m === "public" ? "globe" : "lock-keyhole", 16)}${modeName[m]}${m === mode ? icon("check", 14) : ""}</button>`).join("")}</div></div></div></div><div class="scene-tag"><span>${icon("locate-fixed", 22)}</span><div><small>LOCATION FEED <b>/ 0${districts.indexOf(d) + 1}</b></small><strong>${d.area}</strong></div></div></section><section class="directory"><div class="sectionhead"><div><div class="eyebrow"><i class="pink-rule"></i> WORLD EXPLORER</div><h2>Select a district</h2></div><button class="textlink" data-nav="map">Open world map ${icon("arrow-up-right", 16)}</button></div><div class="district-grid">${districts.map((x, i) => `<button data-district="${x.id}" class="district-card ${selected === x.id ? "selected" : ""}" aria-pressed="${selected === x.id}" aria-label="Select ${x.name} as spawn district"><img src="${art(x.image)}" alt=""/><div class="card-tint"></div><div class="card-top"><span class="district-index">DISTRICT <b>0${i + 1}</b></span>${selected === x.id ? `<span class="selected-pill"><i></i> SELECTED</span>` : ""}</div><div class="card-bottom"><div><h3>${x.name}</h3><span>${icon(x.icon, 13)} ${x.tag}</span></div><span class="card-arrow">${icon("arrow-up-right", 17)}</span></div></button>`).join("")}</div></section>`;
}
