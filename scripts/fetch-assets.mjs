/** Ingest only these pinned, redistributable assets. Never fetch assets at runtime. */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  dedup,
  draco,
  flatten,
  getBounds,
  join,
  joinPrimitives,
  prune,
  simplify,
  textureCompress,
  weld,
  resample,
  palette,
} from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";
import draco3d from "draco3dgltf";
import sharp from "sharp";
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { Mesh, MeshStandardMaterial } from "three";
// GLTFExporter uses FileReader for its final binary Blob, even without DOM textures.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = buffer;
      this.onloadend?.();
    });
  }
};
const F = "beep2bleep/FreeAssetsByKenneyNLandQuaternius";
const K = "KhronosGroup/glTF-Sample-Assets",
  Q = "trebeljahr/quaternius-showcase",
  T = "mrdoob/three.js";
const revisions = {
  [F]: "dea756baf3b3a4889d8c245e456a4791f961578a",
  [K]: "e124e8d8d7330a5372bc2b4d00d39a4a9d7997ea",
  [Q]: "0128ca510d653bb04d6d1e4885bd8890b5050b4f",
  [T]: "r180",
};
const root = "public/assets";
await Promise.all(
  [".cache/sources", `${root}/models`, `${root}/licenses`, `${root}/draco`].map(
    (p) => mkdir(p, { recursive: true }),
  ),
);
async function get(repo, path) {
  const rev = revisions[repo],
    route = `repos/${repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${rev}`,
    cached = `.cache/sources/${createHash("sha256").update(route).digest("hex")}`;
  try {
    return await readFile(cached);
  } catch {}
  let bytes;
  try {
    const res = await fetch(`https://api.github.com/${route}`, {
      headers: {
        Accept: "application/vnd.github.raw+json",
        "User-Agent": "vice-leonida-assets",
      },
    });
    if (!res.ok) throw Error(String(res.status));
    bytes = Buffer.from(await res.arrayBuffer());
    if (bytes[0] === 123) throw Error("Metadata response");
  } catch {
    const meta = JSON.parse(
      execFileSync("gh", ["api", route], { maxBuffer: 40e6 }),
    );
    const data = meta.content
      ? meta
      : JSON.parse(
          execFileSync("gh", ["api", `repos/${repo}/git/blobs/${meta.sha}`], {
            maxBuffer: 40e6,
          }),
        );
    bytes = Buffer.from(data.content, "base64");
  }
  await writeFile(cached, bytes);
  return bytes;
}
const assets = [
  [
    "veloce",
    K,
    "Models/CarConcept/glTF-Binary/CarConcept.glb",
    "Eric Chadwick / Darmstadt Graphics Group GmbH, 2024",
    "CC-BY-4.0",
  ],
  [
    "courier",
    K,
    "Models/CesiumMilkTruck/glTF-Binary/CesiumMilkTruck.glb",
    "Cesium, 2017",
    "CC-BY-4.0",
  ],
  [
    "lounge-chair",
    K,
    "Models/SheenChair/glTF-Binary/SheenChair.glb",
    "Eric Chadwick / Wayfair, LLC, 2020",
    "CC0-1.0",
  ],
  ...["Male", "Female"].map((sex, i) => [
    i ? "pedestrian-f" : "pedestrian",
    F,
    `FreeModels by Quaternius[Patreon]/Characters and Animals/Animated ${i ? "Women" : "Men"} Characters - Feb 2019/FBX/Smooth_${sex}_Casual.fbx`,
    "Quaternius",
    "CC0-1.0",
  ]),
  ...Object.entries({
    terrace: "buildings_pack_2/Building2_Small",
    computer: "cyberpunk_pack/Computer",
    shelf: "house_interior_pack/Bookshelf",
    traffic: "street_pack/TrafficLight",
  }).map(([id, path]) => [
    id,
    Q,
    `public/glb/${path}.glb`,
    "Quaternius",
    "CC0-1.0",
  ]),
];
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "draco3d.decoder": await draco3d.createDecoderModule(),
    "draco3d.encoder": await draco3d.createEncoderModule(),
  });
await MeshoptSimplifier.ready;
const manifest = [],
  bounds = {};
for (const [slug, repo, path, author, license] of assets) {
  let raw = await get(repo, path);
  if (path.endsWith(".fbx")) {
    const fbx = new FBXLoader().parse(
      raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length),
      "",
    );
    const converted = new Map();
    const standard = (m) => {
      if (!converted.has(m))
        converted.set(
          m,
          new MeshStandardMaterial({
            name: m.name,
            color: m.color,
            roughness: 0.85,
          }),
        );
      return converted.get(m);
    };
    fbx.traverse((o) => {
      if (o instanceof Mesh)
        o.material = Array.isArray(o.material)
          ? o.material.map(standard)
          : standard(o.material);
    });
    const clips = fbx.animations.filter((c) =>
      /_(Walk|Run|Idle|Clapping|Sitting|Jump)$/i.test(c.name),
    );
    for (const c of clips) c.name = c.name.split("_").pop();
    fbx.updateMatrixWorld(true);
    raw = new Uint8Array(
      await new GLTFExporter().parseAsync(fbx, {
        binary: true,
        animations: clips,
        trs: true,
      }),
    );
  }
  const doc = await io.readBinary(raw);
  for (const ext of doc.getRoot().listExtensionsUsed())
    if (
      [
        "KHR_materials_variants",
        "KHR_materials_iridescence",
        "KHR_materials_volume",
        "KHR_materials_transmission",
        "KHR_materials_sheen",
        "KHR_materials_anisotropy",
        "KHR_materials_clearcoat",
        "KHR_materials_specular",
        "KHR_materials_ior",
      ].includes(ext.extensionName)
    )
      ext.dispose();
  if (slug === "veloce")
    for (const mat of doc.getRoot().listMaterials())
      if (mat.getName() === "Glass") {
        mat
          .setBaseColorFactor([0.1, 0.18, 0.25, 0.62])
          .setAlphaMode("BLEND")
          .setDoubleSided(true);
      }
  if (slug.startsWith("pedestrian")) {
    for (const a of doc.getRoot().listAnimations())
      if (!/idle|walk|run|wave|jump|clap|sitting/i.test(a.getName()))
        a.dispose();
    await doc.transform(resample(), palette({ min: 2 }), dedup());
    for (const mesh of doc.getRoot().listMeshes()) {
      const parts = mesh.listPrimitives();
      if (parts.length > 1) {
        const merged = joinPrimitives(parts);
        for (const old of parts) old.dispose();
        mesh.addPrimitive(merged);
      }
    }
  }
  if (
    !doc.getRoot().listSkins().length &&
    !doc.getRoot().listAnimations().length
  )
    await doc.transform(flatten(), join());
  await doc.transform(dedup(), prune(), weld());
  if (["lounge-chair", "veloce", "terrace"].includes(slug))
    await doc.transform(
      simplify({
        simplifier: MeshoptSimplifier,
        ratio: slug === "veloce" ? 0.19 : 0.38,
        error: 0.012,
      }),
    );
  bounds[slug] = getBounds(doc.getRoot().listScenes()[0]);
  await doc.transform(
    textureCompress({
      encoder: sharp,
      targetFormat: "webp",
      resize: [1024, 1024],
      quality: 84,
    }),
    draco(),
  );
  const file = `models/${slug}.glb`;
  await io.write(`${root}/${file}`, doc);
  manifest.push({
    file,
    source: `https://github.com/${repo}/blob/${revisions[repo]}/${path}`,
    author,
    license,
    modifications:
      "Game LOD, welded/Draco-compressed geometry and WebP textures. Character clips limited to locomotion and social poses.",
    sha256: createHash("sha256")
      .update(await readFile(`${root}/${file}`))
      .digest("hex"),
  });
  console.log(
    slug,
    bounds[slug],
    doc
      .getRoot()
      .listAnimations()
      .map((a) => a.getName()),
  );
}
for (const l of [
  "CC-BY-4.0",
  "CC0-1.0",
  "LicenseRef-LegalMark-Cesium",
  "LicenseRef-LegalMark-Khronos",
])
  await writeFile(
    `${root}/licenses/${l}.txt`,
    await get(K, `LICENSES/${l}.txt`),
  );
for (const n of [
  "draco_wasm_wrapper.js",
  "draco_decoder.wasm",
  "draco_decoder.js",
])
  await copyFile(
    `node_modules/three/examples/jsm/libs/draco/gltf/${n}`,
    `${root}/draco/${n}`,
  );
const sky = "examples/textures/equirectangular/blouberg_sunrise_2_1k.hdr";
await writeFile(`${root}/coast.hdr`, await get(T, sky));
manifest.push({
  file: "coast.hdr",
  source: "https://polyhaven.com/a/blouberg_sunrise_2",
  author: "Greg Zaal / Poly Haven",
  license: "CC0-1.0",
  modifications: "Local 1K HDRI from the Three.js r180 distribution.",
});
await writeFile(
  `${root}/manifest.json`,
  JSON.stringify(manifest, null, 2) + "\n",
);
await writeFile(
  "src/entities/model-bounds.json",
  JSON.stringify(bounds, null, 2) + "\n",
);
