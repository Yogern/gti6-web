import type { Point, Progress } from "../core/state";
const dispatch = [
  { x: 84, z: -94, name: "Port dispatch" },
  { x: -12, z: -7, name: "Sharaga courtyard" },
];
const circuit = [
  { x: 84, z: 64, name: "Ocean Drive" },
  { x: 84, z: 0, name: "Coastal crossing" },
  { x: 20, z: 0, name: "West avenue" },
  { x: 20, z: 64, name: "Mirage turn" },
  { x: 84, z: 64, name: "Finish line" },
];
export function objective(p: Progress): null | (Point & { name: string }) {
  return p.job === "delivery"
    ? dispatch[Math.min(1, p.stage)]
    : p.job === "race"
      ? circuit[Math.min(4, p.stage)]
      : null;
}
export function jobText(p: Progress) {
  const o = objective(p);
  return o
    ? (p.job === "delivery"
        ? p.stage
          ? "Deliver parcel"
          : "Collect parcel"
        : "Checkpoint " + (p.stage + 1) + "/5") +
        " · " +
        o.name
    : "";
}
export function advanceJob(p: Progress, dt: number) {
  const target = objective(p);
  if (!target) return "";
  if (p.job === "race" && p.stage > 0) p.raceTime += dt;
  if (
    Math.hypot(p.player.x - target.x, p.player.z - target.z) >
    (p.job === "race" ? 6 : 4)
  )
    return "";
  if (p.job === "race" && !p.driving) return "";
  p.stage++;
  if (p.stage >= (p.job === "race" ? 5 : 2)) {
    const reward = p.job === "delivery" ? 750 : 1200;
    const note =
      p.job === "race"
        ? `Circuit finished in ${p.raceTime.toFixed(1)}s`
        : "Parcel delivered";
    p.cash += reward;
    p.completed++;
    p.job = "none";
    p.stage = 0;
    return `${note} · +$${reward}`;
  }
  return p.job === "delivery"
    ? "Parcel collected. Head to Sharaga College."
    : `Checkpoint ${p.stage} cleared`;
}
