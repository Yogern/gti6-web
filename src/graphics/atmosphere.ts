import * as T from "three";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
import type { Weather } from "../core/state";
import { random } from "../world/geometry";
let hdr: Promise<T.DataTexture> | null = null;
export function coastHDR() {
  return (hdr ??= new HDRLoader().loadAsync("/assets/coast.hdr").then((t) => {
    t.mapping = T.EquirectangularReflectionMapping;
    return t;
  }));
}
export class Atmosphere {
  sun = new T.DirectionalLight("#ffe0bc", 2.4);
  ambient = new T.HemisphereLight("#ffd6c5", "#786372", 1.65);
  private fog = new T.FogExp2("#deb7b2", 0.006);
  private rain: T.Points;
  private rng = random(62);
  private day = new T.Color("#ecc4bb");
  private night = new T.Color("#25283d");
  constructor(private scene: T.Scene) {
    scene.fog = this.fog;
    scene.add(this.ambient, this.sun, this.sun.target);
    const arr = new Float32Array(750 * 3);
    for (let i = 0; i < arr.length; i += 3) {
      arr[i] = this.rng() * 70 - 35;
      arr[i + 1] = this.rng() * 32;
      arr[i + 2] = this.rng() * 70 - 35;
    }
    const geom = new T.BufferGeometry();
    geom.setAttribute("position", new T.BufferAttribute(arr, 3));
    this.rain = new T.Points(
      geom,
      new T.PointsMaterial({
        color: "#bacadf",
        size: 0.1,
        transparent: true,
        opacity: 0.64,
        depthWrite: false,
      }),
    );
    this.rain.frustumCulled = false;
    scene.add(this.rain);
    this.sun.castShadow = true;
    Object.assign(this.sun.shadow.camera, {
      left: -38,
      right: 38,
      top: 38,
      bottom: -38,
      far: 140,
    });
    this.sun.shadow.normalBias = 0.05;
    this.sun.shadow.bias = -0.00015;
    this.sun.shadow.mapSize.set(1024, 1024);
  }
  async init() {
    const [hdr, sky] = await Promise.all([
      coastHDR(),
      new T.TextureLoader().loadAsync("/assets/art/sunset-sky.webp"),
    ]);
    sky.mapping = T.EquirectangularReflectionMapping;
    sky.colorSpace = T.SRGBColorSpace;
    this.scene.environment = hdr;
    this.scene.background = sky;
    this.scene.backgroundBlurriness = 0;
  }
  update(minutes: number, w: Weather, x: number, z: number, dt: number) {
    const angle = ((minutes - 360) / 1440) * Math.PI * 2,
      day = T.MathUtils.clamp(Math.sin(angle) * 1.36 + 0.68, 0.055, 1),
      dusk = Math.max(0, 1 - Math.abs(minutes - 1110) / 170),
      wet = w === "Rain";
    this.sun.position.set(x - 38, 24 + day * 43, z + 22);
    this.sun.target.position.set(x, 0, z);
    this.sun.color.setRGB(1, 0.86 - dusk * 0.18, 0.72 - dusk * 0.2);
    this.sun.intensity = (wet ? 0.74 : 2.1) * day;
    this.ambient.intensity = 0.58 + day * 0.94;
    this.scene.environmentIntensity = 0.42 + day * 0.76;
    this.scene.backgroundIntensity = (0.33 + day * 1.45) * (wet ? 0.7 : 1);
    this.fog.color.copy(this.night).lerp(this.day, day);
    this.fog.density = wet ? 0.013 : w === "Haze" ? 0.012 : 0.0053;
    this.rain.visible = wet;
    if (wet) {
      this.rain.position.set(x, 0, z);
      const p = this.rain.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        let y = p.getY(i) - dt * 19;
        if (y < 0) y += 32;
        p.setY(i, y);
      }
      p.needsUpdate = true;
    }
  }
}
