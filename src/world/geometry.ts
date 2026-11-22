import * as T from "three";
export interface Solid {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  yaw: number;
}
const matCache = new Map<string, T.MeshStandardMaterial>();
export function mat(color: string, glow = 0, rough = 0.83) {
  const key = color + glow + rough;
  let m = matCache.get(key);
  if (!m) {
    m = new T.MeshStandardMaterial({
      color,
      roughness: rough,
      metalness: rough < 0.4 ? 0.4 : 0.06,
      emissive: color,
      emissiveIntensity: glow,
    });
    m.userData.batchColor = true;
    matCache.set(key, m);
  }
  return m;
}
export function random(seed: number) {
  return () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
const box = new T.BoxGeometry(),
  cylinder = new T.CylinderGeometry(0.5, 0.5, 1, 10),
  tmp = new T.Object3D();
type Batch = {
  g: T.BufferGeometry;
  m: T.Material | T.Material[];
  ms: T.Matrix4[];
  colors: T.Color[];
};
const solidBatch = new T.MeshLambertMaterial({ color: 0xffffff }),
  lightBatch = new T.MeshBasicMaterial({ color: 0xffffff });
export class Builder {
  solids: Solid[] = [];
  private batches = new Map<string, Map<string, Batch>>();
  cells: { x: number; z: number; group: T.Group }[] = [];
  part(
    g: T.BufferGeometry,
    m: T.Material | T.Material[],
    x: number,
    y: number,
    z: number,
    w = 1,
    h = 1,
    d = 1,
    yaw = 0,
  ) {
    let tint: T.Color | undefined;
    if (Array.isArray(m)) {
      m = m[0];
    }
    if (m instanceof T.MeshStandardMaterial && m.userData.batchColor) {
      tint = m.color;
      m = m.emissiveIntensity > 0.1 ? lightBatch : solidBatch;
    }
    const cell = `${Math.floor(x / 100)},${Math.floor(z / 100)}`;
    let layer = this.batches.get(cell);
    if (!layer) {
      layer = new Map();
      this.batches.set(cell, layer);
    }
    const key = g.uuid + m.uuid;
    let b = layer.get(key);
    if (!b) {
      b = { g, m, ms: [], colors: [] };
      layer.set(key, b);
    }
    tmp.position.set(x, y, z);
    tmp.rotation.set(0, yaw, 0);
    tmp.scale.set(w, h, d);
    tmp.updateMatrix();
    b.ms.push(tmp.matrix.clone());
    if (tint) b.colors.push(tint);
  }
  block(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    m: T.Material | T.Material[],
    solid = false,
    yaw = 0,
  ) {
    this.part(box, m, x, y, z, w, h, d, yaw);
    if (solid) this.solids.push({ x, y, z, w, h, d, yaw });
  }
  post(x: number, y: number, z: number, w: number, h: number, m: T.Material) {
    this.part(cylinder, m, x, y, z, w, h, w);
  }
  finish(scene: T.Scene) {
    for (const [key, batches] of this.batches) {
      const [cx, cz] = key.split(",").map(Number);
      const group = new T.Group();
      for (const { g, m, ms, colors } of batches.values()) {
        const inst = new T.InstancedMesh(g, m, ms.length);
        ms.forEach((mx, i) => {
          inst.setMatrixAt(i, mx);
          if (colors[i]) inst.setColorAt(i, colors[i]);
        });
        inst.computeBoundingSphere();
        inst.receiveShadow = true;
        inst.castShadow = true;
        group.add(inst);
      }
      scene.add(group);
      this.cells.push({ x: cx * 100 + 50, z: cz * 100 + 50, group });
    }
    this.batches.clear();
  }
  stream(x: number, z: number, r = 220) {
    for (const cell of this.cells)
      cell.group.visible = (cell.x - x) ** 2 + (cell.z - z) ** 2 < r * r;
  }
}
const fcache = new Map<string, T.Material>();
export function facade(base: string, glass: string, tower = false) {
  const key = base + glass + tower;
  if (fcache.has(key)) return fcache.get(key)!;
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const g = c.getContext("2d")!,
    rng = random(base.charCodeAt(1) * 7 + glass.charCodeAt(2));
  g.fillStyle = base;
  g.fillRect(0, 0, 512, 512);
  const cols = tower ? 9 : 5,
    rows = tower ? 15 : 5;
  for (let i = 0; i < 5000; i++) {
    g.fillStyle = rng() > 0.5 ? "#ffffff0b" : "#302b3d0d";
    g.fillRect(rng() * 512, rng() * 512, 2, 2);
  }
  for (let r = 0; r < rows; r++) {
    const dh = 512 / rows,
      dw = 512 / cols,
      y = r * dh;
    g.fillStyle = "#39323a33";
    g.fillRect(0, y + dh - 5, 512, 4);
    g.fillStyle = "#fff5cf50";
    g.fillRect(0, y + dh - 1, 512, 1);
    for (let j = 0; j < cols; j++) {
      const x = j * dw + dw * 0.14,
        w = dw * 0.72,
        h = dh * 0.67;
      g.fillStyle = "#232735";
      g.fillRect(x - 2, y + dh * 0.13 - 2, w + 4, h + 5);
      g.fillStyle = glass;
      g.fillRect(x, y + dh * 0.13, w, h);
      const grad = g.createLinearGradient(x, y, x + w, y + h);
      grad.addColorStop(0, rng() > 0.5 ? "#ffd4a76b" : "#95d9ef70");
      grad.addColorStop(0.65, "#28394c66");
      grad.addColorStop(1, "#0c14253d");
      g.fillStyle = grad;
      g.fillRect(x, y + dh * 0.13, w, h);
      g.fillStyle = "#e3d5be88";
      g.fillRect(x + w * 0.5, y + dh * 0.13, 1.6, h);
      g.fillRect(x, y + dh * 0.34, w, 1.5);
      if (rng() > 0.5) {
        g.fillStyle = "#dabfae7d";
        g.fillRect(x, y + dh * 0.13, w, h * rng() * 0.6);
      }
      g.fillStyle = "#eee0c4aa";
      g.fillRect(x - 3, y + dh * 0.13 + h + 1, w + 6, 3);
    }
  }
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = 4;
  const m = new T.MeshLambertMaterial({ map: t });
  fcache.set(key, m);
  return m;
}
const signCache = new Map<string, T.Material>();
export function sign(text: string, bg: string, ink: string) {
  const key = text + bg + ink;
  if (signCache.has(key)) return signCache.get(key)!;
  const c = document.createElement("canvas");
  c.width = 768;
  c.height = 160;
  const g = c.getContext("2d")!;
  g.fillStyle = bg;
  g.fillRect(0, 0, 768, 160);
  g.strokeStyle = ink;
  g.lineWidth = 3;
  g.strokeRect(9, 10, 750, 140);
  g.fillStyle = ink;
  g.font = "bold 68px sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, 384, 82, 708);
  const tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace;
  const m = new T.MeshBasicMaterial({ map: tex });
  signCache.set(key, m);
  return m;
}
const trunkGeom = (() => {
  const curve = new T.CatmullRomCurve3([
    new T.Vector3(0, 0, 0),
    new T.Vector3(0.16, 2, 0),
    new T.Vector3(0.48, 4.4, 0),
    new T.Vector3(0.86, 6.9, 0.12),
  ]);
  const p = [],
    inds = [],
    colors = [];
  for (let i = 0; i <= 22; i++) {
    const v = curve.getPoint(i / 22),
      r = (0.24 - (i / 22) * 0.11) * (i % 2 ? 1.1 : 0.94);
    const col = new T.Color(i % 2 ? "#806c52" : "#b19369");
    for (let j = 0; j < 9; j++) {
      const a = (j / 9) * Math.PI * 2;
      p.push(v.x + Math.cos(a) * r, v.y, v.z + Math.sin(a) * r);
      colors.push(col.r, col.g, col.b);
      if (i < 22) {
        const k = i * 9 + j,
          n = i * 9 + ((j + 1) % 9);
        inds.push(k, k + 9, n, n, k + 9, n + 9);
      }
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(p, 3));
  g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  g.setIndex(inds);
  g.computeVertexNormals();
  return g;
})();
const leafGeom = (() => {
  const pos: number[] = [],
    colors: number[] = [];
  const rng = random(81);
  function tri(a: T.Vector3, b: T.Vector3, c: T.Vector3, tint: T.Color) {
    pos.push(...a.toArray(), ...b.toArray(), ...c.toArray());
    for (let k = 0; k < 3; k++) colors.push(tint.r, tint.g, tint.b);
  }
  for (let f = 0; f < 12; f++) {
    const a = f * 2.4,
      L = 2.8 + rng() * 1.6,
      raise = 1.2 + rng() * 1.6,
      fall = 1.3 + rng() * 1.1;
    const mid = (t: number) =>
      new T.Vector3(
        Math.cos(a) * L * t,
        Math.sin(t * 2.65) * raise - fall * t * t,
        Math.sin(a) * L * t,
      );
    const side = new T.Vector3(-Math.sin(a), 0, Math.cos(a));
    const color = new T.Color(
      ["#416c43", "#62804b", "#305e44", "#729258"][f % 4],
    );
    for (let k = 0; k < 13; k++) {
      const t = k / 13,
        t2 = (k + 1) / 13,
        v = mid(t),
        end = mid(t2),
        w = Math.sin((t + 0.06) * Math.PI) * 0.6 + 0.09;
      tri(
        v.clone().addScaledVector(side, -0.04),
        v.clone().addScaledVector(side, 0.04),
        end,
        color,
      );
      for (const s of [-1, 1]) {
        const tip = mid(Math.min(1, t + 0.12)).addScaledVector(side, w * s);
        tip.y -= 0.16 + t * 0.22;
        tri(v, end, tip, color);
      }
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
})();
const bark = new T.MeshLambertMaterial({ vertexColors: true }),
  leaves = new T.MeshLambertMaterial({
    vertexColors: true,
    side: T.DoubleSide,
  });
export function palm(
  b: Builder,
  x: number,
  z: number,
  scale: number,
  yaw: number,
) {
  b.part(trunkGeom, bark, x, 0.1, z, scale, scale, scale, yaw);
  b.part(
    leafGeom,
    leaves,
    x + (0.86 * Math.cos(yaw) + 0.12 * Math.sin(yaw)) * scale,
    6.9 * scale,
    z + (-0.86 * Math.sin(yaw) + 0.12 * Math.cos(yaw)) * scale,
    scale,
    scale,
    scale,
    yaw,
  );
  b.solids.push({ x, y: 2.4, z, w: 0.37, h: 4.8, d: 0.37, yaw: 0 });
}
