import * as T from "three";
import measures from "../entities/model-bounds.json";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { cars, type CarId } from "../world/atlas";
const draco = new DRACOLoader()
  .setDecoderPath("/assets/draco/")
  .setWorkerLimit(1);
const loader = new GLTFLoader().setDRACOLoader(draco),
  cache = new Map<string, Promise<GLTF>>();
function load(id: string) {
  if (!cache.has(id))
    cache.set(
      id,
      loader.loadAsync(`/assets/models/${id}.glb`).catch((e) => {
        cache.delete(id);
        throw e;
      }),
    );
  return cache.get(id)!;
}
export async function model(id: keyof typeof measures, size: number) {
  const gltf = await load(id);
  const object = clone(gltf.scene);
  const range = measures[id],
    bounds = new T.Box3(
      new T.Vector3(...range.min),
      new T.Vector3(...range.max),
    ),
    dims = bounds.getSize(new T.Vector3()),
    mid = bounds.getCenter(new T.Vector3());
  const scalar = size / (id === "veloce" || id === "courier" ? dims.z : dims.y);
  object.scale.multiplyScalar(scalar);
  object.position.set(-mid.x * scalar, -bounds.min.y * scalar, -mid.z * scalar);
  const root = new T.Group();
  root.add(object);
  root.traverse((n) => {
    if (n instanceof T.Mesh) {
      n.castShadow = true;
      n.receiveShadow = true;
    }
  });
  return { root, clips: gltf.animations };
}
export function paintVehicle(root: T.Object3D, id: CarId, color: string) {
  root.traverse((n) => {
    if (!(n instanceof T.Mesh)) return;
    const apply = (m: T.Material) => {
      if (!(m instanceof T.MeshStandardMaterial)) return m;
      if (
        !/Paint [12]|truck|milk/i.test(m.name) &&
        !(id === "courier" && m.map)
      )
        return m;
      if (!m.userData.localPaint) {
        m = m.clone();
        m.userData.localPaint = true;
      }
      const mat = m as T.MeshStandardMaterial;
      mat.color.set(color);
      mat.roughness = Math.max(0.22, Math.min(0.6, mat.roughness));
      return mat;
    };
    n.material = Array.isArray(n.material)
      ? n.material.map(apply)
      : apply(n.material);
  });
}
export async function vehicle(id: CarId, color: string) {
  const m = await model(id, cars[id].length);
  paintVehicle(m.root, id, color);
  return m;
}
