import {
  bounds,
  districts,
  districtAt,
  type District,
  type CarId,
} from "../world/atlas";
import metadata from "../../package.json";
export const VERSION = metadata.version;
export type Weather = "Clear" | "Haze" | "Rain";
export type Quality = "Ultra" | "High" | "Balanced" | "Max FPS";
export type Point = { x: number; z: number };
export type Pose = Point & { y: number; yaw: number };
export type Mode = "solo" | "public" | "private";
export const keyDefaults = {
  forward: "KeyW",
  back: "KeyS",
  left: "KeyA",
  right: "KeyD",
  sprint: "ShiftLeft",
  jump: "Space",
  interact: "KeyE",
  view: "KeyV",
  map: "KeyM",
  phone: "KeyP",
  gesture: "KeyG",
};
export const controlIds = [
  "stick",
  "look",
  "jump",
  "interact",
  "sprint",
  "camera",
] as const;
export type ControlId = (typeof controlIds)[number];
export type Layout = Record<
  ControlId,
  { x: number; y: number; scale: number; opacity: number; hide: boolean }
>;
export function layoutDefault(mirror = false): Layout {
  const p = (x: number, y: number) => ({
    x: mirror ? 100 - x : x,
    y,
    scale: 1,
    opacity: 0.78,
    hide: false,
  });
  return {
    stick: p(15, 72),
    look: p(82, 50),
    jump: p(89, 72),
    interact: p(77, 78),
    sprint: p(66, 80),
    camera: p(93, 36),
  };
}
export interface Prefs {
  quality: Quality;
  volume: number;
  muted: boolean;
  touch: "Auto" | "Always";
  keys: typeof keyDefaults;
  layout: Layout;
  showFps: boolean;
  sensitivity: number;
}
export interface Progress {
  schema: 1;
  started: boolean;
  district: District;
  player: Pose;
  vehicle: Pose;
  driving: boolean;
  car: CarId;
  paint: string;
  cash: number;
  minutes: number;
  weather: Weather;
  waypoint: Point | null;
  job: "none" | "delivery" | "race";
  stage: number;
  raceTime: number;
  completed: number;
  boost: boolean;
  moon: boolean;
  view: "Chase" | "Hood";
  health: number;
  armor: number;
  station: number;
  cameraYaw: number;
  cameraPitch: number;
  zoom: number;
  updated: number;
}
export const paints = ["#e8496f", "#2fc4bd", "#c2d0e4", "#5b4c88", "#eca856"];
export const defaultPrefs = (): Prefs => ({
  quality: "Balanced",
  volume: 0.45,
  muted: true,
  touch: "Auto",
  keys: { ...keyDefaults },
  layout: layoutDefault(),
  showFps: false,
  sensitivity: 1,
});
export const newProgress = (): Progress => ({
  schema: 1,
  started: false,
  district: "beach",
  player: { x: 84, y: 1.02, z: 50, yaw: 0 },
  vehicle: { x: 81, y: 0.74, z: 46, yaw: 0 },
  driving: false,
  car: "veloce",
  paint: paints[0],
  cash: 2500,
  minutes: 18 * 60 + 42,
  weather: "Clear",
  waypoint: null,
  job: "none",
  stage: 0,
  raceTime: 0,
  completed: 0,
  boost: false,
  moon: false,
  view: "Chase",
  health: 100,
  armor: 0,
  station: 0,
  cameraYaw: 0,
  cameraPitch: 0.27,
  zoom: 6.5,
  updated: Date.now(),
});
const obj = (o: unknown): o is Record<string, unknown> =>
  !!o && typeof o === "object" && !Array.isArray(o);
const num = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const point = (v: unknown): v is Point =>
  obj(v) &&
  num(v.x, bounds.left - 8, bounds.right + 8) &&
  num(v.z, bounds.top - 8, bounds.bottom + 8);
const pose = (v: unknown): v is Pose =>
  point(v) && num((v as Pose).y, -3, 60) && num((v as Pose).yaw, -1e8, 1e8);
export function validProgress(v: unknown): v is Progress {
  return (
    obj(v) &&
    v.schema === 1 &&
    typeof v.started === "boolean" &&
    districts.some((d) => d.id === v.district) &&
    pose(v.player) &&
    pose(v.vehicle) &&
    typeof v.driving === "boolean" &&
    ["veloce", "courier"].includes(String(v.car)) &&
    paints.includes(String(v.paint)) &&
    num(v.cash, 0, 1e10) &&
    num(v.minutes, 0, 1440) &&
    ["Clear", "Haze", "Rain"].includes(String(v.weather)) &&
    (v.waypoint === null || point(v.waypoint)) &&
    ["none", "delivery", "race"].includes(String(v.job)) &&
    Number.isInteger(v.stage) &&
    num(v.stage, 0, 4) &&
    num(v.raceTime, 0, 1e8) &&
    num(v.completed, 0, 1e8) &&
    typeof v.boost === "boolean" &&
    typeof v.moon === "boolean" &&
    ["Chase", "Hood"].includes(String(v.view)) &&
    num(v.health, 0, 100) &&
    num(v.armor, 0, 100) &&
    Number.isInteger(v.station) &&
    num(v.station, 0, 2) &&
    num(v.cameraYaw, -1e8, 1e8) &&
    num(v.cameraPitch, -0.25, 1.25) &&
    num(v.zoom, 2, 14) &&
    num(v.updated, 0, 9e15)
  );
}
export function validPrefs(v: unknown): v is Prefs {
  if (
    !obj(v) ||
    !["Ultra", "High", "Balanced", "Max FPS"].includes(String(v.quality)) ||
    !num(v.volume, 0, 1) ||
    typeof v.muted !== "boolean" ||
    !["Auto", "Always"].includes(String(v.touch)) ||
    typeof v.showFps !== "boolean" ||
    !num(v.sensitivity, 0.3, 2) ||
    !obj(v.keys) ||
    !obj(v.layout)
  )
    return false;
  const keys = v.keys,
    layout = v.layout;
  return (
    Object.keys(keyDefaults).every(
      (k) =>
        typeof keys[k] === "string" &&
        /^[A-Za-z0-9]{1,24}$/.test(keys[k] as string),
    ) &&
    controlIds.every((k) => {
      const c = layout[k];
      return (
        obj(c) &&
        num(c.x, 3, 97) &&
        num(c.y, 5, 95) &&
        num(c.scale, 0.5, 1.7) &&
        num(c.opacity, 0.15, 1) &&
        typeof c.hide === "boolean"
      );
    })
  );
}
export function clock(m: number) {
  return `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(Math.floor(m) % 60).padStart(2, "0")}`;
}
export function money(n: number) {
  return "$" + Math.floor(n).toLocaleString("en-US");
}
export function locate(p: Progress) {
  return districtAt(p.player.x, p.player.z);
}
export const clamp = (n: number, a: number, b: number) =>
  Math.min(b, Math.max(a, n));
export const keyLabel = (s: string) =>
  s
    .replace(/^Key|^Digit/, "")
    .replace("Left", "")
    .replace("Arrow", "")
    .replace("Backquote", "~");
