import * as T from "three";
import { model } from "../core/assets";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { random } from "../world/geometry";
import type { Peer } from "../multiplayer/protocol";
class Rig {
  object: T.Object3D;
  mixer: T.AnimationMixer;
  actions: Record<string, T.AnimationAction> = {};
  private current = "";
  constructor(template: T.Object3D, clips: T.AnimationClip[]) {
    this.object = clone(template);
    this.mixer = new T.AnimationMixer(this.object);
    for (const c of clips) this.actions[c.name] = this.mixer.clipAction(c);
    this.pose("Idle");
    this.mixer.update(0.01);
  }
  pose(name: string) {
    if (this.current === name || !this.actions[name]) return;
    const prev = this.actions[this.current],
      next = this.actions[name];
    next.reset().play();
    if (prev) prev.crossFadeTo(next, 0.22, false);
    this.current = name;
  }
}
interface Walker {
  rig: Rig;
  phase: number;
  x: number;
  z: number;
  length: number;
  campus: boolean;
  seated: boolean;
  reactUntil: number;
}
interface Remote {
  root: T.Group;
  rig: Rig;
  to: T.Vector3;
  yaw: number;
  previous: T.Vector3;
  previousT: number;
  velocity: T.Vector3;
  car: string;
  mesh?: T.Object3D;
}
export class Actors {
  hero!: T.Object3D;
  private heroRig!: Rig;
  private people: Walker[] = [];
  private peers = new Map<string, Remote>();
  private template!: T.Object3D;
  private clips: T.AnimationClip[] = [];
  private vehicles: Record<string, T.Object3D> = {};
  private vec = new T.Vector3();
  constructor(private scene: T.Scene) {}
  async init() {
    const [m, w] = await Promise.all([
      model("pedestrian", 1.81),
      model("pedestrian-f", 1.69),
    ]);
    this.template = m.root;
    this.clips = m.clips;
    this.heroRig = new Rig(m.root, m.clips);
    this.hero = this.heroRig.object;
    this.scene.add(this.hero);
    const r = random(36);
    for (let i = 0; i < 26; i++) {
      const template = i % 2 ? w : m,
        rig = new Rig(template.root, template.clips);
      rig.object.scale.setScalar(0.94 + r() * 0.09);
      rig.mixer.update(r() * 2);
      this.scene.add(rig.object);
      const campus = i % 3 === 0,
        seated = i >= 20 && campus;
      this.people.push({
        rig,
        phase: r() * 20,
        x: seated ? -25 : campus ? -30 : i % 2 ? 75 : 94,
        z: seated
          ? -42 + (i - 21) * 1.4
          : campus
            ? -9 - r() * 3
            : -142 + r() * 215,
        length: campus ? 13 : 18 + r() * 27,
        campus,
        seated,
        reactUntil: 0,
      });
    }
  }
  setVehicleTemplates(models: Record<string, T.Object3D>) {
    this.vehicles = models;
  }
  update(
    dt: number,
    t: number,
    heroX: number,
    heroZ: number,
    moving: boolean,
    sprint: boolean,
    gesture: boolean,
  ) {
    if (this.hero.visible) {
      this.heroRig.pose(
        gesture ? "Clapping" : moving ? (sprint ? "Run" : "Walk") : "Idle",
      );
      this.heroRig.mixer.update(dt * (sprint ? 1.35 : 1));
    }
    for (const n of this.people) {
      const phase = (t * 0.073 + n.phase) % (Math.PI * 2),
        u = (Math.sin(phase) * 0.5 + 0.5) * n.length,
        x = n.x + (n.campus && !n.seated ? u : 0),
        z = n.z + (n.campus ? 0 : u),
        obj = n.rig.object;
      obj.visible = (x - heroX) ** 2 + (z - heroZ) ** 2 < 2350;
      if (!obj.visible) continue;
      obj.position.set(x, n.seated ? 0.79 : n.campus ? 0.19 : 0.12, z);
      obj.rotation.y =
        (n.campus ? Math.PI / 2 : 0) + (Math.cos(phase) < 0 ? Math.PI : 0);
      n.rig.pose(
        n.reactUntil > t
          ? "Clapping"
          : n.seated
            ? "Sitting"
            : Math.abs(Math.cos(phase)) < 0.15
              ? "Idle"
              : "Walk",
      );
      n.rig.mixer.update(dt * (0.45 + 0.7 * Math.abs(Math.cos(phase))));
    }
  }
  sync(peers: Peer[], self: string | undefined, now: number) {
    const ids = new Set(peers.map((p) => p.id));
    for (const [k, v] of this.peers)
      if (!ids.has(k)) {
        this.scene.remove(v.root);
        this.peers.delete(k);
      }
    for (const p of peers) {
      if (p.id === self) continue;
      let n = this.peers.get(p.id);
      if (!n) {
        const root = new T.Group(),
          rig = new Rig(this.template, this.clips);
        root.position.set(p.x, p.y - 0.92, p.z);
        root.add(rig.object);
        this.scene.add(root);
        n = {
          root,
          rig,
          to: new T.Vector3(p.x, p.y - 0.92, p.z),
          yaw: p.yaw,
          previous: new T.Vector3(),
          previousT: now,
          velocity: new T.Vector3(),
          car: "",
        };
        this.peers.set(p.id, n);
      }
      if (n.car !== p.car) {
        if (n.mesh) n.root.remove(n.mesh);
        n.mesh = undefined;
        n.rig.object.visible = !p.car;
        if (p.car) {
          n.mesh = this.vehicles[p.car].clone();
          n.mesh.position.set(0, 0, 0);
          n.mesh.rotation.set(0, 0, 0);
          n.mesh.visible = true;
          n.root.add(n.mesh);
        }
        n.car = p.car;
      }
      n.rig.pose(p.gesture ? "Clapping" : p.moving ? "Walk" : "Idle");
      n.previous.copy(n.to);
      n.to.set(p.x, p.y - (p.car ? 0.52 : 0.92), p.z);
      n.velocity
        .subVectors(n.to, n.previous)
        .multiplyScalar(1000 / Math.max(50, now - n.previousT));
      if (n.velocity.lengthSq() > 2500) n.velocity.set(0, 0, 0);
      n.previousT = now;
      n.yaw = p.yaw;
    }
  }
  renderPeers(dt: number, now: number) {
    for (const n of this.peers.values()) {
      this.vec
        .copy(n.to)
        .addScaledVector(
          n.velocity,
          Math.min(0.1, Math.max(0, (now - n.previousT) / 1000)),
        );
      n.root.position.lerp(this.vec, 1 - Math.exp(-dt * 16));
      n.root.rotation.y +=
        Math.atan2(
          Math.sin(n.yaw + Math.PI - n.root.rotation.y),
          Math.cos(n.yaw + Math.PI - n.root.rotation.y),
        ) *
        (1 - Math.exp(-dt * 15));
      if (!n.car) n.rig.mixer.update(dt);
    }
  }
  near(x: number, z: number) {
    return this.people.some(
      (n) =>
        n.rig.object.visible &&
        Math.hypot(n.rig.object.position.x - x, n.rig.object.position.z - z) <
          4,
    );
  }
  greet(x: number, z: number, t: number) {
    for (const n of this.people)
      if (
        Math.hypot(n.rig.object.position.x - x, n.rig.object.position.z - z) < 4
      )
        n.reactUntil = t + 2.2;
  }
}
