import * as T from "three";
import { Builder, facade, mat, palm, random, sign } from "./geometry";
import { roadsX, roadsZ } from "./atlas";
import { model } from "../core/assets";
export const plots: { x: number; z: number; w: number; d: number }[] = [];
const seaColor = "#588f9d",
  sidewalk = "#b8acac";
function hotel(
  b: Builder,
  x: number,
  z: number,
  w: number,
  d: number,
  h: number,
  i: number,
  tower = false,
) {
  const bases = ["#e3b8ab", "#c3cfc3", "#c1b7cb", "#d5cbae", "#b4c6cf"],
    base = bases[i % bases.length],
    window = facade(base, tower ? "#496374" : "#556d76", tower);
  const stone = mat(base),
    trim = mat("#ebe0ce"),
    neon = mat(i % 2 ? "#ff649e" : "#79e2dc", 0.85);
  b.block(
    x,
    h / 2 + 0.19,
    z,
    w,
    h,
    d,
    [window, window, stone, stone, window, window],
    true,
  );
  plots.push({ x, z, w, d });
  b.block(x, h + 0.3, z, w + 0.6, 0.5, d + 0.6, trim);
  b.block(x, h + 1.4, z, w * 0.7, 2.1, d * 0.66, stone);
  b.block(x, h + 2.52, z, w * 0.74, 0.15, d * 0.7, neon);
  b.block(x + 2, h + 3.35, z, 3, 1.6, 2, mat("#887e83"));
  b.block(x, 3.25, z + d / 2 + 0.5, w * 0.89, 0.28, 2, trim);
  b.block(x, 3.06, z + d / 2 + 1.35, w * 0.89, 0.1, 0.28, neon);
  if (!tower) {
    for (let j = -1; j <= 1; j++) {
      b.block(
        x + w * 0.18 * j,
        h * 0.51 + 0.5,
        z + d * 0.505,
        0.39,
        h * 0.98,
        0.32,
        trim,
      );
    }
    for (let k = 0; k < 3; k++)
      b.block(x, h * 0.55 + k * 0.43, z + d * 0.505, w + 1, 0.16, 0.48, trim);
    b.block(x, 1.45, z + d / 2 + 0.018, 2.2, 2.6, 0.08, mat("#354858", 0, 0.3));
    b.block(x + w * 0.51, h * 0.57, z, 0.48, h * 0.75, 0.32, neon);
    const names = [
      "OCEANA",
      "MARLIN",
      "MIRAGE",
      "PALM CLUB",
      "SOLANA",
      "THE RIVIERA",
    ];
    b.block(
      x,
      h * 0.67,
      z + d / 2 + 0.3,
      w * 0.7,
      1.8,
      0.22,
      sign(names[i % 6], "#353044", i % 2 ? "#ffb1d1" : "#9afff4"),
    );
  } else {
    const h2 = h * 0.42;
    b.block(x - w * 0.34, h2 * 0.5, z + d * 0.33, w * 0.42, h2, d * 0.5, [
      window,
      window,
      stone,
      stone,
      window,
      window,
    ]);
    for (const sx of [-1, 1])
      b.block(x + sx * w * 0.5, h / 2, z + d * 0.34, 0.14, h, 0.22, neon);
  }
}
function bench(b: Builder, x: number, z: number) {
  for (const s of [-0.7, 0.7])
    b.block(x + s, 0.36, z, 0.12, 0.6, 0.45, mat("#514d55"));
  for (let i = 0; i < 4; i++)
    b.block(x, 0.68, z + i * 0.12 - 0.18, 1.95, 0.09, 0.1, mat("#9e745a"));
  for (let i = 0; i < 3; i++)
    b.block(x, 0.81 + i * 0.14, z + 0.25, 1.95, 0.12, 0.1, mat("#a77e60"));
}
function light(b: Builder, x: number, z: number) {
  const steel = mat("#666972", 0, 0.36);
  b.post(x, 2.9, z, 0.13, 5.8, steel);
  b.post(x, 0.32, z, 0.3, 0.65, steel);
  b.block(x - 0.5, 5.8, z, 1.13, 0.12, 0.13, steel);
  b.block(x - 1.1, 5.73, z, 0.62, 0.18, 0.37, mat("#444952"));
  b.block(x - 1.1, 5.62, z, 0.53, 0.045, 0.29, mat("#ffddab", 1.2));
}
function campus(b: Builder) {
  const x = -12,
    z = -36,
    wall = mat("#dec9ac"),
    slate = mat("#52686b"),
    wood = mat("#aa7550"),
    floor = mat("#b6b5aa");
  const y = 0.18;
  b.block(x, y, z, 43, 0.32, 29, floor, true);
  b.block(x, 3.2, z - 14, 42, 6, 0.45, wall, true);
  for (const sx of [-1, 1]) {
    b.block(
      x + sx * 21,
      3.1,
      z,
      0.45,
      5.9,
      28,
      facade("#d8c4ae", "#718d92"),
      true,
    );
    b.block(
      x + sx * 13,
      3.1,
      z + 13.8,
      16,
      6,
      0.45,
      facade("#d8c4ae", "#718d92"),
      true,
    );
    b.block(x + sx * 6, 2.0, z - 5, 0.25, 3.7, 13, wall, true);
    b.post(x + sx * 5.5, 2.9, z + 16, 1.0, 5.5, wall);
    b.post(x + sx * 11.5, 2.9, z + 16, 1.0, 5.5, wall);
  }
  b.block(x, 6.2, z, 43.7, 0.45, 29.2, slate, true);
  b.block(x, 6.0, z + 15, 27, 0.43, 6, slate);
  b.block(
    x,
    5.08,
    z + 17.9,
    18,
    1.38,
    0.19,
    sign("ШАРАГА", "#42434b", "#f9dab1"),
  );
  b.block(
    x,
    2.0,
    z - 13.7,
    7,
    2.0,
    0.13,
    sign("В А Х Т А", "#574e4e", "#ffe5bd"),
  );
  b.block(x, 1.05, z - 9, 4.7, 1.5, 1.25, wood, true);
  for (const sx of [-13, 13]) {
    b.block(
      x + sx,
      3,
      z - 13.7,
      8.7,
      2.05,
      0.12,
      sx < 0
        ? sign("ЛЕКТОРИЙ", "#284b47", "#c8dece")
        : sign("СТОЛОВАЯ", "#57423f", "#ecd4b0"),
    );
    for (let j = 0; j < 3; j++)
      for (let k = -1; k <= 1; k++) {
        const dx = x + sx + k * 3.3,
          dz = z - 7 + j * 4.5;
        b.block(dx, 1.1, dz, 2.05, 0.13, 1.12, wood, true);
        for (const a of [-0.75, 0.75])
          b.block(dx + a, 0.67, dz, 0.11, 0.85, 0.75, slate);
        b.block(dx, 0.71, dz + 1.03, 0.8, 0.13, 0.75, mat("#7e635a"));
        b.block(dx, 0.45, dz + 1.03, 0.47, 0.5, 0.48, slate);
        b.block(dx, 0.99, dz + 1.37, 0.8, 0.56, 0.1, mat("#7e635a"));
      }
  }
  bench(b, x - 11, -11);
  bench(b, x + 10, -10);
  plots.push({ x, z, w: 42, d: 28 });
}
function port(b: Builder) {
  const colors = ["#975c56", "#5a8282", "#657691", "#a88b68"];
  for (let j = 0; j < 5; j++)
    for (let k = 0; k < 2; k++) {
      const x = 103 + k * 12,
        z = -146 + j * 15;
      b.block(x, 1.6, z, 5, 3.1, 11, mat(colors[(j + k) % 4]), true);
      for (let n = 0; n < 19; n++)
        b.block(
          x,
          1.6,
          z - 5.2 + n * 0.57,
          5.12,
          2.8,
          0.1,
          mat(colors[(j + k) % 4]),
        );
      b.block(x, 3.17, z, 5.15, 0.14, 11.13, mat("#797b7d"));
      if ((j + k) % 3 === 0)
        b.block(x, 4.8, z, 5, 3.1, 11, mat(colors[(j + 1) % 4]), true);
    }
  const steel = mat("#af7160"),
    dark = mat("#52515d");
  for (const z of [-130, -78]) {
    for (const x of [99, 120])
      for (const dz of [-3.2, 3.2])
        b.block(x, 8.6, z + dz, 0.72, 17, 0.72, steel, true);
    b.block(115, 17, z, 39, 0.9, 7.6, steel);
    for (const dz of [-3.5, 3.5]) {
      b.block(116, 19.7, z + dz, 36, 0.38, 0.33, steel);
      for (let k = 0; k < 13; k++)
        b.block(100 + k * 2.6, 18.5, z + dz, 0.18, 2.5, 0.18, steel);
    }
    b.block(110, 15.3, z, 3.5, 2.75, 3, facade("#bba99a", "#6c8a97"));
    b.block(130, 11.4, z, 0.08, 11, 0.08, dark);
    b.block(130, 5.7, z, 3, 0.26, 0.75, dark);
  }
}
function cabin(b: Builder, x: number, z: number) {
  const wood = mat("#ad836b"),
    mint = mat("#82babb");
  for (const xx of [-1.8, 1.8])
    for (const zz of [-1.55, 1.55]) b.post(x + xx, 1.0, z + zz, 0.25, 2, wood);
  b.block(x, 2.05, z, 5.6, 0.25, 5.2, wood, true);
  b.block(x, 3.36, z, 4.25, 2.45, 3.6, facade("#88c6c4", "#779caa"), true);
  b.block(x, 4.69, z, 5.4, 0.28, 4.75, mat("#d99389"));
  b.block(x, 2.6, z + 2.24, 5.4, 0.1, 0.12, mint);
  for (let j = 0; j < 8; j++)
    b.block(x - 2.4 + j * 0.68, 2.36, z + 2.2, 0.08, 0.62, 0.08, mint);
  b.block(
    x,
    2.83,
    z + 1.88,
    2.8,
    0.65,
    0.1,
    sign("OCEAN RESCUE", "#ad625e", "#ffebd0"),
  );
}
export async function makeCity(scene: T.Scene) {
  const loader = new T.TextureLoader();
  const tex = await Promise.all(
    ["asphalt-color", "asphalt-roughness", "asphalt-normal"].map((n) =>
      loader.loadAsync("/assets/surfaces/" + n + ".webp"),
    ),
  );
  for (const t of tex) {
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.repeat.set(32, 40);
    t.anisotropy = 2;
  }
  tex[0].colorSpace = T.SRGBColorSpace;
  const roadMat = new T.MeshStandardMaterial({
    map: tex[0],
    roughnessMap: tex[1],
    normalMap: tex[2],
    normalScale: new T.Vector2(0.32, 0.32),
    roughness: 0.87,
    metalness: 0.14,
  });
  const b = new Builder(),
    rng = random(1933);
  plots.length = 0;
  b.block(-15, -0.43, 0, 282, 0.8, 365, mat("#9da587"), true);
  b.block(115, -0.2, 0, 37, 0.44, 365, mat("#dcc6a1"), true);
  b.block(-14, -0.012, 0, 267, 0.05, 321, roadMat);
  for (const x of roadsX)
    for (let z = -153; z < 157; z += 5) {
      if (roadsZ.some((v) => Math.abs(v - z) < 9)) continue;
      for (const k of [-0.2, 0.2])
        b.block(x + k, 0.023, z, 0.095, 0.014, 2.9, mat("#d7bf8c"));
      for (const dx of [-5.8, 5.8])
        b.block(x + dx, 0.022, z, 0.1, 0.013, 4.99, mat("#cac0b8"));
    }
  for (const z of roadsZ)
    for (let x = -140; x < 96; x += 5) {
      if (roadsX.some((v) => Math.abs(v - x) < 9)) continue;
      b.block(x, 0.025, z, 2.8, 0.015, 0.13, mat("#d7bf8c"));
    }
  for (const x of roadsX)
    for (const z of roadsZ) {
      for (let k = -5; k <= 5; k += 1.45) {
        b.block(x + k, 0.028, z + 8, 0.68, 0.018, 2.5, mat("#ccc4bd"));
        b.block(x + 8, 0.029, z + k, 2.5, 0.018, 0.68, mat("#ccc4bd"));
      }
      light(b, x + 8.4, z + 9.5);
    }
  let idx = 0;
  for (let i = -1; i < 3; i++)
    for (let j = -1; j < 4; j++) {
      const x = -76 + i * 64,
        z = -96 + j * 64;
      b.block(x, 0.086, z, 50.5, 0.2, 50.5, mat(sidewalk), true);
      b.block(x, 0.2, z, 44, 0.1, 44, mat("#a7ab93"));
      if (x === -12 && z === -32) {
        campus(b);
        continue;
      }
      const high = z > 10 && x < 15;
      const waterfront = x === 52;
      const h1 = high ? 24 + rng() * 33 : 6 + rng() * 9;
      hotel(b, x - 9, z - 4, 17.5, 27, h1, idx++, high);
      hotel(
        b,
        x + 13,
        z + 4,
        13.2,
        22,
        high ? 17 + rng() * 28 : 6 + rng() * 8,
        idx++,
        high && !waterfront,
      );
      if (j % 2 === 0) {
        bench(b, x + 4, z + 21);
        light(b, x - 21, z + 16);
      }
    }
  port(b);
  for (let z = -148; z < 156; z += 13.5) {
    palm(b, 93 + rng(), z, 0.91 + rng() * 0.27, rng() * 6);
    palm(b, 74.5, z + 4, 0.85 + rng() * 0.33, rng() * 6);
    if (z > 0 && Math.floor(z) % 3 !== 0)
      palm(b, 112 + rng() * 7, z, 0.95 + rng() * 0.38, rng() * 6);
  }
  for (let x = -129; x < 66; x += 16) {
    palm(b, x, 8.8, 1 + rng() * 0.24, rng() * 6);
    palm(b, x, 56, 0.86 + rng() * 0.24, rng() * 6);
  }
  for (const z of [20, 93, 145]) cabin(b, 111, z);
  b.block(99, 0.1, 42, 4, 0.2, 220, mat("#bb9c83"), true);
  for (let z = -62; z < 151; z += 2.6)
    b.block(99, 0.217, z, 3.9, 0.025, 0.07, mat("#957b68"));
  for (let z = -52; z < 151; z += 21) bench(b, 96, z);
  // Transparent map boundaries follow the sea wall and the edge of the playable district.
  for (const x of [-146, 125])
    b.solids.push({ x, y: 6, z: 0, w: 1, h: 12, d: 316, yaw: 0 });
  for (const z of [-156, 156])
    b.solids.push({ x: -10, y: 6, z, w: 273, h: 12, d: 1, yaw: 0 });
  // Flatten each imported static prop once, then instance its original triangle mesh.
  const stamps = await Promise.all(
    (["terrace", "computer", "shelf", "traffic"] as const).map((id, i) =>
      model(id, [13.7, 0.75, 2.8, 4.2][i]),
    ),
  );
  const parts = stamps.map(({ root }) => {
    const out: { g: T.BufferGeometry; m: T.Material | T.Material[] }[] = [];
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      if (o instanceof T.Mesh)
        out.push({
          g: o.geometry.clone().applyMatrix4(o.matrixWorld),
          m: o.material,
        });
    });
    return out;
  });
  const stamp = (i: number, x: number, y: number, z: number, r = 0) => {
    for (const { g, m } of parts[i]) b.part(g, m, x, y, z, 1, 1, 1, r);
  };
  for (const z of [-100, -39, 37, 103]) {
    stamp(0, -100, 0.2, z);
    b.solids.push({ x: -100, y: 6.9, z, w: 9.8, h: 13.7, d: 6.8, yaw: 0 });
  }
  for (const z of [-43, -38.5, -34])
    for (const x of [-28.3, -25, -21.7]) stamp(1, x, 1.18, z);
  stamp(2, -31, 0.36, -47);
  stamp(2, 6, 0.36, -47);
  for (const x of roadsX)
    for (const z of roadsZ) stamp(3, x - 8.0, 0.13, z - 8.7, Math.PI / 2);
  b.finish(scene);
  const chair = await model("lounge-chair", 1.2);
  chair.root.position.set(-16, 0.35, -31);
  scene.add(chair.root);
  const c2 = chair.root.clone();
  c2.position.x = -9;
  c2.rotation.y = 0.5;
  scene.add(c2);
  const waterGeom = new T.PlaneGeometry(820, 900, 52, 70);
  waterGeom.rotateX(-Math.PI / 2);
  const water = new T.Mesh(
    waterGeom,
    new T.MeshStandardMaterial({
      color: seaColor,
      metalness: 0.47,
      roughness: 0.22,
    }),
  );
  water.position.set(539, -0.03, 0);
  scene.add(water);
  const points = waterGeom.attributes.position;
  return {
    b,
    water,
    roadMat,
    updateWater(time: number) {
      for (let i = 0; i < points.count; i++) {
        const x = points.getX(i),
          z = points.getZ(i);
        points.setY(
          i,
          0.17 * Math.sin(x * 0.21 + time * 1.1 + z * 0.06) +
            0.09 * Math.cos(z * 0.29 + time * 0.8),
        );
      }
      points.needsUpdate = true;
      waterGeom.computeVertexNormals();
    },
  };
}
