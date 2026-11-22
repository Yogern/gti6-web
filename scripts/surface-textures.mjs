// Original tileable asphalt PBR set. Store the source recipe, not external hotlinks.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
const root = "public/assets/surfaces";
await mkdir(root, { recursive: true });
const n = 2048,
  color = Buffer.alloc(n * n * 3),
  rough = Buffer.alloc(n * n),
  normal = Buffer.alloc(n * n * 3);
let state = 712;
const noise = () =>
  ((state = (Math.imul(state, 1664525) + 1013904223) | 0) >>> 0) / 4294967296;
const pi = Math.PI * 2;
for (let y = 0; y < n; y++)
  for (let x = 0; x < n; x++) {
    const i = y * n + x,
      k = i * 3,
      n1 = noise(),
      n2 = noise(),
      l =
        (Math.sin((x / n) * pi * 3 + Math.sin((y / n) * pi * 2)) +
          Math.cos((y / n) * pi * 4 + Math.sin((x / n) * pi * 3))) *
        3;
    const gray = Math.round(67 + l + (n1 - 0.5) * 38 + (n1 > 0.94 ? 16 : 0));
    color[k] = gray + 3;
    color[k + 1] = gray;
    color[k + 2] = gray + 2;
    rough[i] = Math.round(90 + n1 * 100 + l * 3);
    normal[k] = Math.round(127 + (n1 - 0.5) * 52);
    normal[k + 1] = Math.round(127 + (n2 - 0.5) * 52);
    normal[k + 2] = 250;
  }
await Promise.all(
  [
    [color, 3, "asphalt-color"],
    [rough, 1, "asphalt-roughness"],
    [normal, 3, "asphalt-normal"],
  ].map(([buf, channels, name]) =>
    sharp(buf, { raw: { width: n, height: n, channels } })
      .webp({ quality: 78 })
      .toFile(`${root}/${name}.webp`),
  ),
);
