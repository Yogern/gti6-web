import * as T from "three";
import { QualityMaterials } from "../graphics/quality";
import {
  rendererFor,
  resolution,
  type EngineRenderer,
} from "../graphics/renderer";
import { makeCity } from "../world/city";
import { Atmosphere } from "../graphics/atmosphere";
import { Actors } from "../entities/actors";
import {
  Simulation,
  initPhysics,
  STEP,
  type InputState,
} from "../physics/simulation";
import { Controls } from "../systems/input";
import { Hud } from "../ui/hud";
import { advanceJob, objective } from "../systems/activities";
import { clamp, type Progress, type Prefs } from "./state";
import { vehicle, paintVehicle } from "./assets";
import { cars, districtAt, type CarId } from "../world/atlas";
import type { Session } from "../multiplayer/client";
import type { Soundscape } from "../systems/audio";
import { toast } from "../ui/shared";
import type { NetPose } from "../multiplayer/protocol";
const lerpAngle = (a: number, b: number, t: number) =>
  a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;
export class Game {
  readonly scene = new T.Scene();
  readonly camera = new T.PerspectiveCamera(60, 1, 0.09, 740);
  private renderer!: EngineRenderer;
  api = "";
  private atmosphere = new Atmosphere(this.scene);
  private city!: Awaited<ReturnType<typeof makeCity>>;
  private actors = new Actors(this.scene);
  private carGroups = {} as Record<CarId, T.Group>;
  private carMix?: T.AnimationMixer;
  sim!: Simulation;
  controls!: Controls;
  hud!: Hud;
  private qualityMaterials = new QualityMaterials();
  private acc = 0;
  private last = 0;
  private total = 0;
  private viewPos = new T.Vector3();
  private target = new T.Vector3();
  private offset = new T.Vector3();
  private carPos = new T.Vector3();
  private dest = new T.Vector3();
  private input: InputState = {
    forward: 0,
    side: 0,
    sprint: false,
    jump: false,
    handbrake: false,
  };
  private ring: T.Mesh;
  private beam: T.Mesh;
  private frameId = 0;
  private uiAt = 0;
  private sent = 0;
  private synced = 0;
  private sampleStart = 0;
  private samples = 0;
  private lastWater = 0;
  private gestureUntil = 0;
  private lastStep = 0;
  private scale = 1;
  private nextScale = 0;
  running = false;
  fps = 0;
  frames = 0;
  private activeCar: CarId = "veloce";
  private blobCar!: T.Mesh;
  private blobPlayer!: T.Mesh;
  private lastPaint = "";
  private snap = true;
  constructor(
    readonly canvas: HTMLCanvasElement,
    private p: Progress,
    private prefs: Prefs,
    private net: Session,
    private audio: Soundscape,
    private onAction: (a: string) => void,
    private onSave: () => void,
  ) {
    this.ring = new T.Mesh(
      new T.TorusGeometry(2, 0.11, 8, 48),
      new T.MeshBasicMaterial({ color: "#ff80a1" }),
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.beam = new T.Mesh(
      new T.CylinderGeometry(0.28, 0.62, 3.2, 12, 1, true),
      new T.MeshBasicMaterial({
        color: "#ffa1bf",
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
      }),
    );
    this.scene.add(this.ring, this.beam);
  }
  async init() {
    const [r, city, , v, c] = await Promise.all([
      rendererFor(this.canvas),
      makeCity(this.scene),
      Promise.all([initPhysics(), this.atmosphere.init(), this.actors.init()]),
      vehicle("veloce", this.p.paint),
      vehicle("courier", this.p.paint),
    ]);
    const shadow = document.createElement("canvas");
    shadow.width = shadow.height = 64;
    const ctx = shadow.getContext("2d")!,
      gradient = ctx.createRadialGradient(32, 32, 5, 32, 32, 32);
    gradient.addColorStop(0, "rgba(20,14,27,.66)");
    gradient.addColorStop(0.63, "rgba(28,18,30,.42)");
    gradient.addColorStop(1, "rgba(22,15,25,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const sm = new T.MeshBasicMaterial({
      map: new T.CanvasTexture(shadow),
      transparent: true,
      depthWrite: false,
    });
    const plane = new T.PlaneGeometry(1, 1);
    plane.rotateX(-Math.PI / 2);
    this.blobCar = new T.Mesh(plane, sm);
    this.blobPlayer = new T.Mesh(plane, sm);
    this.blobCar.scale.set(3.4, 1, 5.8);
    this.blobPlayer.scale.set(1.6, 1, 1.25);
    this.scene.add(this.blobCar, this.blobPlayer);
    this.renderer = r.renderer;
    this.api = r.api;
    this.renderer.toneMappingExposure = 1.2;
    this.city = city;
    this.carGroups = { veloce: v.root, courier: c.root };
    for (const car of Object.values(this.carGroups)) this.scene.add(car);
    if (c.clips[0]) {
      this.carMix = new T.AnimationMixer(c.root);
      this.carMix.clipAction(c.clips[0]).play();
    }
    this.actors.setVehicleTemplates(this.carGroups);
    this.sim = new Simulation(city.b.solids, this.p);
    this.controls = new Controls(
      this.prefs,
      this.canvas,
      (dx, dy) => {
        this.p.cameraYaw += dx;
        this.p.cameraPitch = clamp(this.p.cameraPitch + dy, -0.16, 1.18);
      },
      (n) => (this.p.zoom = clamp(this.p.zoom + n, 2, 14)),
      (a) => this.action(a),
    );
    this.hud = new Hud(this.p, this.prefs, this.controls, (a) =>
      this.action(a),
    );
    this.net.onCorrect = (q) => {
      Object.assign(this.p.player, { x: q.x, y: q.y, z: q.z, yaw: q.yaw });
      if (this.p.driving) Object.assign(this.p.vehicle, this.p.player);
      this.sim.restore();
      this.snap = true;
    };
    this.canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.pause();
      this.onAction("lost");
    });
    window.addEventListener("resize", () => {
      if (this.running) this.resize();
    });
    this.qualityMaterials.capture(this.scene);
    this.apply();
    this.canvas.dataset.api = this.api;
  }
  private resize() {
    const w = this.canvas.parentElement!.clientWidth,
      h = this.canvas.parentElement!.clientHeight;
    this.renderer.setPixelRatio(resolution(this.prefs.quality) * this.scale);
    this.renderer.setSize(Math.max(1, w), Math.max(1, h), false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }
  apply() {
    this.qualityMaterials.restore();
    this.activeCar = this.p.car;
    for (const id of ["veloce", "courier"] as const)
      this.carGroups[id].visible = id === this.activeCar;
    if (this.lastPaint !== this.p.paint) {
      for (const id of ["veloce", "courier"] as const)
        paintVehicle(this.carGroups[id], id, this.p.paint);
      this.lastPaint = this.p.paint;
    }
    this.qualityMaterials.apply(this.prefs.quality === "Max FPS");
    this.renderer.shadowMap.enabled = ["High", "Ultra"].includes(
      this.prefs.quality,
    );
    this.renderer.shadowMap.type = T.PCFShadowMap;
    this.scale = 1;
    this.hud.touchMode();
    this.resize();
  }
  restore() {
    this.sim.restore();
    this.apply();
    this.snap = true;
  }
  start() {
    if (this.running) return;
    this.p.started = true;
    this.running = true;
    this.canvas.dataset.state = "running";
    this.controls.active = true;
    this.snap = true;
    this.apply();
    this.acc = 0;
    this.last = this.sampleStart = performance.now();
    this.samples = 0;
    this.nextScale = this.last + 4000;
    this.frameId = requestAnimationFrame(this.frame);
  }
  pause() {
    this.running = false;
    this.canvas.dataset.state = "paused";
    cancelAnimationFrame(this.frameId);
    this.controls?.pause();
    this.audio.stop();
  }
  action(s: string) {
    const p = this.p;
    if (s === "interact") {
      if (p.driving || this.sim.nearCar()) {
        if (this.sim.toggleCar()) {
          this.hud.touchMode();
          p.cameraYaw = this.sim.vehicleCurrent.yaw;
          this.snap = true;
          this.onSave();
          toast(
            p.driving
              ? `Driving ${cars[p.car].name} · V to change view`
              : "On foot",
          );
        } else toast("Find a clear space to exit");
      } else if (this.actors.near(p.player.x, p.player.z)) this.greet();
      else toast("Approach your vehicle or a pedestrian");
    } else if (s === "gesture") this.greet();
    else if (s === "view") {
      if (p.driving) {
        p.view = p.view === "Chase" ? "Hood" : "Chase";
        toast(`${p.view} camera`);
      } else {
        p.zoom = p.zoom < 5 ? 7 : 3.6;
        toast(p.zoom < 5 ? "Close camera" : "Exploration camera");
      }
      this.snap = true;
    } else this.onAction(s);
  }
  private greet() {
    this.gestureUntil = this.total + 2.2;
    this.actors.greet(this.p.player.x, this.p.player.z, this.total);
    this.audio.note(460, 0.12, 0.07);
    toast(
      this.actors.near(this.p.player.x, this.p.player.z)
        ? "Local: “Enjoy the coast!”"
        : "You clap a greeting",
    );
    if (this.net.room) this.net.chat("claps a greeting 👏");
  }
  pose(): NetPose {
    const p = this.p;
    return {
      x: p.player.x,
      y: p.player.y,
      z: p.player.z,
      yaw: p.player.yaw,
      moving: this.sim.moving,
      car: p.driving ? p.car : "",
      gesture: this.gestureUntil > this.total,
    };
  }
  private frame = (now: number) => {
    if (!this.running) return;
    const elapsed = Math.max(0, (now - this.last) / 1000),
      dt = Math.min(0.15, elapsed);
    this.last = now;
    this.acc += dt;
    this.total += dt;
    this.controls.state(this.input);
    const p = this.p;
    const state = this.net.latest;
    for (; this.acc >= STEP; this.acc -= STEP) {
      this.sim.step(this.input, p.cameraYaw);
      const msg = advanceJob(p, STEP);
      if (msg) {
        toast(msg);
        this.audio.note(660);
        this.onSave();
      }
    }
    const f = this.acc / STEP,
      pr = this.sim.previous,
      cur = this.sim.current,
      cr = this.sim.vehiclePrevious,
      cc = this.sim.vehicleCurrent;
    this.viewPos.set(
      T.MathUtils.lerp(pr.x, cur.x, f),
      T.MathUtils.lerp(pr.y, cur.y, f),
      T.MathUtils.lerp(pr.z, cur.z, f),
    );
    this.carPos.set(
      T.MathUtils.lerp(cr.x, cc.x, f),
      T.MathUtils.lerp(cr.y, cc.y, f) - 0.52,
      T.MathUtils.lerp(cr.z, cc.z, f),
    );
    const car = this.carGroups[this.activeCar];
    car.position.copy(this.carPos);
    this.blobCar.position.set(this.carPos.x, 0.04, this.carPos.z);
    this.blobCar.rotation.y = cc.yaw;
    this.blobPlayer.visible = !p.driving;
    this.blobPlayer.position.set(cur.x, Math.max(0.04, cur.y - 0.9), cur.z);
    car.rotation.y = lerpAngle(cr.yaw, cc.yaw, f) + Math.PI;
    if (this.activeCar === "courier")
      this.carMix?.update(dt * this.sim.speed * 0.3);
    this.actors.hero.visible = !p.driving;
    this.actors.hero.position.copy(this.viewPos);
    this.actors.hero.position.y -= 0.91;
    this.actors.hero.rotation.y = lerpAngle(pr.yaw, cur.yaw, f) + Math.PI;
    this.actors.update(
      dt,
      this.total,
      cur.x,
      cur.z,
      this.sim.moving,
      this.input.sprint,
      this.total < this.gestureUntil,
    );
    if (state) {
      if (state.time !== this.synced) {
        this.actors.sync(state.peers, this.net.socket?.id, this.net.received);
        this.synced = state.time;
      }
      p.minutes =
        (state.minutes + Math.min(1, (now - this.net.received) / 1000) * 0.32) %
        1440;
      p.weather = state.weather;
    } else {
      p.minutes = (p.minutes + dt * 0.32) % 1440;
      if (this.synced) {
        this.actors.sync([], undefined, now);
        this.synced = 0;
      }
    }
    this.actors.renderPeers(dt, now);
    if (this.net.room && now - this.sent > 66) {
      this.net.send(this.pose());
      this.sent = now;
    }
    const goal = objective(p) ?? p.waypoint;
    this.ring.visible = this.beam.visible = !!goal;
    if (goal) {
      this.ring.position.set(goal.x, 0.34, goal.z);
      this.ring.scale.setScalar(1 + Math.sin(this.total * 3) * 0.05);
      this.beam.position.set(goal.x, 1.9, goal.z);
      if (!objective(p) && Math.hypot(cur.x - goal.x, cur.z - goal.z) < 2) {
        p.waypoint = null;
        toast("Waypoint reached");
        this.onSave();
      }
    }
    if (
      p.driving &&
      Math.abs(this.sim.speed) > 1.5 &&
      now - this.controls.lookAt > 1900
    )
      p.cameraYaw = lerpAngle(p.cameraYaw, cc.yaw, 1 - Math.exp(-dt * 2.8));
    const hood = p.driving && p.view === "Hood";
    this.target.copy(this.viewPos);
    this.target.y += p.driving ? 0.95 : 0.57;
    const dist = p.driving ? p.zoom + 2.8 : p.zoom,
      cp = Math.cos(p.cameraPitch);
    this.offset.set(
      Math.sin(p.cameraYaw) * cp,
      Math.sin(p.cameraPitch),
      Math.cos(p.cameraYaw) * cp,
    );
    if (hood) {
      this.dest.copy(this.viewPos);
      this.dest.y += this.activeCar === "courier" ? 1.86 : 1.04;
      this.dest.x -= Math.sin(cc.yaw) * 0.9;
      this.dest.z -= Math.cos(cc.yaw) * 0.9;
      this.target.copy(this.dest).addScaledVector(this.offset, -9);
      this.target.y += 1.9;
    } else {
      const len = this.sim.cameraDistance(
        this.target.x,
        this.target.y,
        this.target.z,
        this.offset.x,
        this.offset.y,
        this.offset.z,
        dist,
      );
      this.dest.copy(this.target).addScaledVector(this.offset, len);
      this.dest.y = Math.max(0.4, this.dest.y);
    }
    if (this.snap || hood) this.camera.position.copy(this.dest);
    else this.camera.position.lerp(this.dest, 1 - Math.exp(-dt * 13));
    this.snap = false;
    this.camera.lookAt(this.target);
    const vf =
      60 + (p.driving ? Math.min(12, Math.abs(this.sim.speed) * 0.29) : 0);
    if (Math.abs(this.camera.fov - vf) > 0.08) {
      this.camera.fov = vf;
      this.camera.updateProjectionMatrix();
    }
    this.city.roadMat.roughness = p.weather === "Rain" ? 0.35 : 0.9;
    this.city.roadMat.metalness = p.weather === "Rain" ? 0.45 : 0.15;
    this.atmosphere.update(p.minutes, p.weather, cur.x, cur.z, dt);
    if (this.total - this.lastWater > 0.1) {
      this.city.updateWater(this.total);
      this.lastWater = this.total;
    }
    this.city.b.stream(
      cur.x,
      cur.z,
      this.prefs.quality === "Max FPS" ? 116 : 205,
    );
    this.audio.station = p.station;
    this.audio.update(this.sim.speed, p.driving, cur.x > 55);
    if (
      this.sim.moving &&
      !p.driving &&
      this.sim.grounded &&
      this.total - this.lastStep > (this.input.sprint ? 0.28 : 0.42)
    ) {
      this.audio.note(cur.x > 100 ? 65 : 95, 0.055, 0.045);
      this.lastStep = this.total;
    }
    this.frames++;
    this.samples++;
    if (now - this.sampleStart >= 850) {
      this.fps = (this.samples * 1000) / (now - this.sampleStart);
      this.samples = 0;
      this.sampleStart = now;
      if (
        (this.prefs.quality === "Balanced" ||
          this.prefs.quality === "Max FPS") &&
        now > this.nextScale
      ) {
        const scale = clamp(
          this.scale * (this.fps < 40 ? 0.84 : this.fps > 55 ? 1.06 : 1),
          0.55,
          1,
        );
        if (Math.abs(scale - this.scale) > 0.01) {
          this.scale = scale;
          this.resize();
        }
        this.nextScale = now + 2500;
      }
    }
    this.renderer.render(this.scene, this.camera);
    if (now - this.uiAt > 210) {
      this.hud.refresh(
        this.fps,
        this.api,
        this.sim.speed,
        !p.driving && this.sim.nearCar(),
        this.actors.near(cur.x, cur.z),
        this.net.room,
      );
      this.uiAt = now;
      Object.assign(this.canvas.dataset, {
        frames: String(this.frames),
        draws: String(
          this.renderer instanceof T.WebGLRenderer
            ? this.renderer.info.render.calls
            : "GPU",
        ),
        triangles: String(
          this.renderer instanceof T.WebGLRenderer
            ? this.renderer.info.render.triangles
            : "GPU",
        ),
        fps: this.fps.toFixed(1),
        district: districtAt(cur.x, cur.z),
        driving: String(p.driving),
        position: `${cur.x.toFixed(2)},${cur.z.toFixed(2)}`,
      });
    }
    this.frameId = requestAnimationFrame(this.frame);
  };
}
