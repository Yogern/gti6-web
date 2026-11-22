import { clamp, type Prefs } from "../core/state";
import type { InputState } from "../physics/simulation";
export class Controls {
  keys = new Set<string>();
  x = 0;
  y = 0;
  touchJump = false;
  touchSprint = false;
  lookAt = 0;
  lastUse = performance.now();
  active = false;
  private drag: { x: number; y: number; id: number } | null = null;
  private abort = new AbortController();
  constructor(
    private prefs: Prefs,
    canvas: HTMLCanvasElement,
    private turn: (dx: number, dy: number) => void,
    private zoom: (n: number) => void,
    private action: (s: string) => void,
  ) {
    const s = { signal: this.abort.signal };
    window.addEventListener(
      "keydown",
      (e) => {
        if (
          !this.active ||
          document.querySelector("dialog[open]") ||
          (e.target instanceof HTMLElement &&
            ["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName))
        )
          return;
        const found = Object.entries(prefs.keys).find(
          ([, v]) => v === e.code,
        )?.[0];
        if (
          found ||
          [
            "ArrowUp",
            "ArrowDown",
            "ArrowLeft",
            "ArrowRight",
            "Space",
            "Escape",
            "Backquote",
            "KeyF",
          ].includes(e.code)
        )
          e.preventDefault();
        this.keys.add(e.code);
        this.lastUse = performance.now();
        if (e.repeat) return;
        if (
          found &&
          !["forward", "left", "right", "back", "sprint", "jump"].includes(
            found,
          )
        )
          this.action(found);
        else if (e.code === "KeyF") this.action("interact");
        else if (e.code === "Backquote") this.action("cheats");
        else if (e.code === "Escape") this.action("pause");
      },
      s,
    );
    window.addEventListener("keyup", (e) => this.keys.delete(e.code), s);
    window.addEventListener("blur", () => this.reset(), s);
    canvas.addEventListener(
      "pointerdown",
      (e) => {
        if (!this.active) return;
        this.lastUse = performance.now();
        this.drag = { x: e.clientX, y: e.clientY, id: e.pointerId };
        canvas.setPointerCapture(e.pointerId);
        if (
          e.pointerType === "mouse" &&
          e.button === 0 &&
          !document.pointerLockElement
        ) {
          try {
            const pending = canvas.requestPointerLock?.();
            if (pending) pending.catch(() => undefined);
          } catch {
            /* Drag-to-look remains available in embedded browsers. */
          }
        }
      },
      s,
    );
    window.addEventListener(
      "pointermove",
      (e) => {
        if (!this.active) return;
        if (document.pointerLockElement === canvas) {
          this.look(e.movementX, e.movementY);
        } else if (this.drag && this.drag.id === e.pointerId) {
          this.look(e.clientX - this.drag.x, e.clientY - this.drag.y);
          this.drag.x = e.clientX;
          this.drag.y = e.clientY;
        }
      },
      s,
    );
    window.addEventListener("pointerup", () => (this.drag = null), s);
    window.addEventListener("pointercancel", () => (this.drag = null), s);
    canvas.addEventListener(
      "wheel",
      (e) => {
        if (this.active) {
          e.preventDefault();
          this.zoom(e.deltaY * 0.012);
        }
      },
      { ...s, passive: false },
    );
    canvas.addEventListener("contextmenu", (e) => e.preventDefault(), s);
  }
  look(x: number, y: number) {
    if (x || y) {
      this.lastUse = this.lookAt = performance.now();
      this.turn(
        -x * 0.0045 * this.prefs.sensitivity,
        y * 0.0037 * this.prefs.sensitivity,
      );
    }
  }
  state(out: InputState) {
    const k = this.keys,
      p = this.prefs.keys;
    out.forward = clamp(
      Number(k.has(p.forward) || k.has("ArrowUp")) -
        Number(k.has(p.back) || k.has("ArrowDown")) -
        this.y,
      -1,
      1,
    );
    out.side = clamp(
      Number(k.has(p.right) || k.has("ArrowRight")) -
        Number(k.has(p.left) || k.has("ArrowLeft")) +
        this.x,
      -1,
      1,
    );
    out.sprint = this.touchSprint || k.has(p.sprint);
    out.jump = this.touchJump || k.has(p.jump);
    out.handbrake = out.jump;
    if (out.forward || out.side) this.lastUse = performance.now();
    return out;
  }
  reset() {
    this.keys.clear();
    this.x = this.y = 0;
    this.touchJump = this.touchSprint = false;
    this.drag = null;
  }
  pause() {
    this.active = false;
    this.reset();
    if (document.pointerLockElement) document.exitPointerLock();
  }
}
