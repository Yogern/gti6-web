import {
  controlIds,
  layoutDefault,
  clamp,
  type ControlId,
  type Prefs,
} from "../core/state";
import { modal, $, $$, icon } from "./shared";
export function editLayout(
  prefs: Prefs,
  save: () => void,
  id: ControlId = "stick",
) {
  const l = prefs.layout,
    c = l[id];
  modal(
    "INPUT / TOUCH CONFIGURATION",
    "HUD layout",
    `<p class="dialog-desc">Drag a control inside the preview, then adjust its scale and opacity.</p><div class="row"><button data-preset="right" class="small-button">Right-handed</button><button data-preset="left" class="small-button">Left-handed</button></div><div class="editor-board">${controlIds.map((k) => `<button class="editpad ${id === k ? "selected" : ""}" data-edit="${k}" style="left:${l[k].x}%;top:${l[k].y}%;opacity:${Math.max(l[k].opacity, 0.4)};font-size:${9 * l[k].scale}px">${k}${l[k].hide ? " ×" : ""}</button>`).join("")}</div><h3 style="text-transform:capitalize">${id}</h3><div class="setting-row"><label for="edit-scale">Scale</label><input id="edit-scale" type="range" min="50" max="170" value="${c.scale * 100}"></div><div class="setting-row"><label for="edit-opacity">Opacity</label><input id="edit-opacity" type="range" min="15" max="100" value="${c.opacity * 100}"></div><div class="setting-row"><label for="edit-hide">Hide control</label><input id="edit-hide" type="checkbox" ${c.hide ? "checked" : ""}></div><div class="dialog-buttons"><button class="secondary" data-preset="right">${icon("rotate-ccw", 14)} Reset to default</button><button class="primary" data-action="close">Done</button></div>`,
  );
  const board = $(".editor-board");
  for (const b of $$("[data-preset]"))
    b.onclick = () => {
      prefs.layout = layoutDefault(b.dataset.preset === "left");
      save();
      editLayout(prefs, save, id);
    };
  for (const el of $$("[data-edit]")) {
    const key = el.dataset.edit as ControlId;
    let active = false;
    el.onpointerdown = (e) => {
      active = true;
      el.setPointerCapture(e.pointerId);
    };
    el.onpointermove = (e) => {
      if (!active) return;
      const r = board.getBoundingClientRect();
      l[key].x = clamp(((e.clientX - r.left) / r.width) * 100, 3, 97);
      l[key].y = clamp(((e.clientY - r.top) / r.height) * 100, 5, 95);
      el.style.left = l[key].x + "%";
      el.style.top = l[key].y + "%";
    };
    el.onlostpointercapture = () => {
      if (!active) return;
      active = false;
      save();
      editLayout(prefs, save, key);
    };
  }
  for (const k of ["scale", "opacity"] as const)
    $<HTMLInputElement>("#edit-" + k).oninput = (e) => {
      c[k] = Number((e.target as HTMLInputElement).value) / 100;
      const b = $(`[data-edit="${id}"]`);
      b.style.opacity = String(c.opacity);
      b.style.fontSize = 9 * c.scale + "px";
      save();
    };
  $<HTMLInputElement>("#edit-hide").onchange = (e) => {
    c.hide = (e.target as HTMLInputElement).checked;
    save();
    editLayout(prefs, save, id);
  };
}
