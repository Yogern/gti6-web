import {
  districts,
  roadsX,
  roadsZ,
  bounds,
  type District,
} from "../world/atlas";
import type { Progress, Point } from "../core/state";
import { objective } from "../systems/activities";
export function drawMap(
  canvas: HTMLCanvasElement,
  p: Progress,
  mini = false,
  selected: District = p.district,
) {
  const rect = canvas.getBoundingClientRect(),
    dpr = mini ? 1 : Math.min(devicePixelRatio, 1.7);
  if (!rect.width || !rect.height) return;
  const W = Math.round(rect.width * dpr),
    H = Math.round(rect.height * dpr);
  if (canvas.width !== W || canvas.height !== H) {
    canvas.width = W;
    canvas.height = H;
  }
  const g = canvas.getContext("2d")!;
  const s = mini ? Math.max(W, H) / 114 : Math.min(W / 330, H / 353);
  const cx = mini ? p.player.x : 0,
    cz = mini ? p.player.z : 0,
    ox = W / 2 - cx * s,
    oz = H / 2 - cz * s;
  const X = (v: number) => ox + v * s,
    Z = (v: number) => oz + v * s;
  g.fillStyle = "#142e37";
  g.fillRect(0, 0, W, H);
  function box(x: number, z: number, w: number, d: number, c: string) {
    g.fillStyle = c;
    g.fillRect(X(x), Z(z), w * s, d * s);
  }
  box(-1200, -1200, 1331, 2400, "#242831");
  box(100, -250, 30, 500, "#716857");
  box(121, -250, 8, 500, "#a19171");
  for (let x = -140; x < 80; x += 64)
    for (let z = -160; z < 147; z += 64) {
      box(x - 24, z - 24, 48, 48, "#343842");
      if (x === -12 && z === -32) {
        box(-33, -50, 42, 28, "#68624e");
        box(-35, -22, 45, 16, "#36544e");
      } else {
        box(x - 18, z - 18, 18, 28, "#494954");
        box(x + 6, z - 7, 14, 23, "#444750");
      }
    }
  for (const x of roadsX) {
    box(x - 4.9, -193, 9.8, 385, "#585765");
    box(x - 0.25, -193, 0.5, 385, "#77707c");
  }
  for (const z of roadsZ) {
    box(-169, z - 4.9, 266, 9.8, "#585765");
    box(-169, z - 0.25, 266, 0.5, "#77707c");
  }
  for (let i = 0; i < 16; i++) {
    const z = -148 + i * 7;
    box(101, z, 8, 3, "#755b57");
    box(115, z, 6, 4, "#556c70");
  }
  g.strokeStyle = "#c9e0e20c";
  g.lineWidth = 1;
  for (let x = ox % (16 * s); x < W; x += 16 * s) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, H);
    g.stroke();
  }
  for (let z = oz % (16 * s); z < H; z += 16 * s) {
    g.beginPath();
    g.moveTo(0, z);
    g.lineTo(W, z);
    g.stroke();
  }
  if (!mini) {
    g.font = `${10 * dpr}px monospace`;
    g.fillStyle = "#7aa0a9";
    g.textAlign = "center";
    g.save();
    g.translate(X(148), Z(34));
    g.rotate(-Math.PI / 2);
    g.fillText("A T L A N T I C   O C E A N", 0, 0);
    g.restore();
    for (const d of districts) {
      let x = X(d.x),
        z = Z(d.z);
      g.beginPath();
      g.arc(x, z, 5 * dpr, 0, Math.PI * 2);
      g.fillStyle = selected === d.id ? "#ff759e" : "#c1b3bb";
      g.fill();
      g.textAlign = "center";
      g.font = `600 ${13 * dpr}px Barlow, sans-serif`;
      const w = g.measureText(d.name).width;
      g.fillStyle = "#13131cde";
      g.fillRect(x - w / 2 - 6 * dpr, z + 8 * dpr, w + 12 * dpr, 20 * dpr);
      g.fillStyle = "#f2e8ee";
      g.fillText(d.name, x, z + 22 * dpr);
    }
  }
  const target = objective(p) ?? p.waypoint;
  if (target) {
    g.setLineDash([3 * dpr, 4 * dpr]);
    g.strokeStyle = "#fa88b7";
    g.lineWidth = 1.7 * dpr;
    g.beginPath();
    g.moveTo(X(p.player.x), Z(p.player.z));
    g.lineTo(X(target.x), Z(target.z));
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = "#ff719c";
    g.beginPath();
    const x = X(target.x),
      z = Z(target.z);
    g.moveTo(x, z - 5 * dpr);
    g.lineTo(x + 5 * dpr, z);
    g.lineTo(x, z + 5 * dpr);
    g.lineTo(x - 5 * dpr, z);
    g.fill();
  }
  g.save();
  g.translate(X(p.player.x), Z(p.player.z));
  g.rotate(-p.player.yaw);
  g.scale(dpr, dpr);
  g.fillStyle = "#83efc3";
  g.strokeStyle = "#18322c";
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(0, -7);
  g.lineTo(5.7, 5.7);
  g.lineTo(0, 3);
  g.lineTo(-5.7, 5.7);
  g.closePath();
  g.fill();
  g.stroke();
  g.restore();
  if (mini) {
    g.fillStyle = "#f5ebed";
    g.font = "9px monospace";
    g.textAlign = "right";
    g.fillText("N", W - 7, 13);
  }
  return (clientX: number, clientY: number): Point | null => {
    const x = ((clientX - rect.left) * dpr - ox) / s,
      z = ((clientY - rect.top) * dpr - oz) / s;
    return x < bounds.left ||
      x > bounds.right ||
      z < bounds.top ||
      z > bounds.bottom
      ? null
      : { x, z };
  };
}
