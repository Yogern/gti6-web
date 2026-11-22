import R from "@dimforge/rapier3d-compat";
import type { Pose, Progress } from "../core/state";
import { clamp } from "../core/state";
import { bounds, cars } from "../world/atlas";
import type { Solid } from "../world/geometry";
export const STEP = 1 / 60;
let initialized: Promise<void> | null = null;
export function initPhysics() {
  return (initialized ??= R.init());
}
export interface InputState {
  forward: number;
  side: number;
  sprint: boolean;
  jump: boolean;
  handbrake: boolean;
}
const vec = { x: 0, y: 0, z: 0 };
export class Simulation {
  world = new R.World({ x: 0, y: -20, z: 0 });
  player: R.RigidBody;
  car: R.RigidBody;
  playerShape: R.Collider;
  carShape: R.Collider;
  private down = new R.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 });
  private sight = new R.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 });
  speed = 0;
  moving = false;
  grounded = false;
  previous: Pose;
  current: Pose;
  vehiclePrevious: Pose;
  vehicleCurrent: Pose;
  private yaw = 0;
  private vehicleYaw = 0;
  private cooldown = 0;
  constructor(
    solids: Solid[],
    private p: Progress,
  ) {
    this.world.timestep = STEP;
    for (const s of solids) {
      this.world.createCollider(
        R.ColliderDesc.cuboid(s.w / 2, s.h / 2, s.d / 2)
          .setTranslation(s.x, s.y, s.z)
          .setRotation({
            x: 0,
            y: Math.sin(s.yaw / 2),
            z: 0,
            w: Math.cos(s.yaw / 2),
          })
          .setFriction(0.25),
      );
    }
    this.player = this.world.createRigidBody(
      R.RigidBodyDesc.dynamic()
        .lockRotations()
        .setCanSleep(false)
        .setCcdEnabled(true),
    );
    this.playerShape = this.world.createCollider(
      R.ColliderDesc.capsule(0.58, 0.34)
        .setMass(72)
        .setFriction(0)
        .setRestitution(0),
      this.player,
    );
    this.car = this.world.createRigidBody(
      R.RigidBodyDesc.dynamic()
        .enabledRotations(false, true, false)
        .setCanSleep(false)
        .setCcdEnabled(true),
    );
    this.carShape = this.world.createCollider(
      R.ColliderDesc.cuboid(1.03, 0.34, 2.04)
        .setTranslation(0, 0.2, 0)
        .setMass(1100)
        .setFriction(0.3)
        .setRestitution(0.01),
      this.car,
    );
    this.previous = { ...p.player };
    this.current = { ...p.player };
    this.vehicleCurrent = { ...p.vehicle };
    this.vehiclePrevious = { ...p.vehicle };
    this.restore();
  }
  restore() {
    const p = this.p;
    this.yaw = p.player.yaw;
    this.vehicleYaw = p.vehicle.yaw;
    this.speed = 0;
    this.player.setEnabled(!p.driving);
    this.player.setTranslation(p.player, true);
    this.player.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.car.setTranslation(p.vehicle, true);
    this.car.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.car.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.car.setRotation(
      {
        x: 0,
        y: Math.sin(this.vehicleYaw / 2),
        z: 0,
        w: Math.cos(this.vehicleYaw / 2),
      },
      true,
    );
    Object.assign(this.current, p.player);
    Object.assign(this.previous, p.player);
    Object.assign(this.vehicleCurrent, p.vehicle);
    Object.assign(this.vehiclePrevious, p.vehicle);
  }
  toggleCar() {
    if (this.p.driving) {
      const v = this.car.translation(),
        rightX = Math.cos(this.vehicleYaw),
        rightZ = -Math.sin(this.vehicleYaw);
      let found = false;
      for (const dir of [1, -1]) {
        const p = {
          x: clamp(
            v.x + dir * rightX * 2.65,
            bounds.left + 1,
            bounds.right - 1,
          ),
          z: clamp(
            v.z + dir * rightZ * 2.65,
            bounds.top + 1,
            bounds.bottom - 1,
          ),
          y: v.y + 0.8,
        };
        this.sight.origin = v;
        this.sight.dir = { x: rightX * dir, y: 0, z: rightZ * dir };
        if (
          this.world.castRay(
            this.sight,
            2.7,
            true,
            undefined,
            undefined,
            undefined,
            this.car,
          )
        )
          continue;
        this.player.setEnabled(true);
        this.player.setTranslation(p, true);
        this.player.setLinvel({ x: 0, y: 0, z: 0 }, true);
        this.yaw = this.vehicleYaw;
        Object.assign(this.current, p, { yaw: this.yaw });
        Object.assign(this.previous, this.current);
        found = true;
        break;
      }
      if (!found) return false;
      this.p.driving = false;
    } else {
      if (!this.nearCar()) return false;
      this.player.setEnabled(false);
      this.p.driving = true;
    }
    this.sync();
    return true;
  }
  nearCar() {
    const a = this.player.translation(),
      b = this.car.translation();
    return Math.hypot(a.x - b.x, a.z - b.z) < 6.7 && Math.abs(a.y - b.y) < 3;
  }
  step(input: InputState, cameraYaw: number) {
    const p = this.p,
      dt = STEP;
    Object.assign(this.previous, this.current);
    Object.assign(this.vehiclePrevious, this.vehicleCurrent);
    this.cooldown = Math.max(0, this.cooldown - dt);
    const op = this.player.translation(),
      ov = this.player.linvel();
    if (!p.driving) {
      const mag = Math.max(1, Math.hypot(input.forward, input.side)),
        f = input.forward / mag,
        s = input.side / mag;
      const vx = -Math.sin(cameraYaw) * f + Math.cos(cameraYaw) * s,
        vz = -Math.cos(cameraYaw) * f - Math.sin(cameraYaw) * s;
      const rate = (input.sprint ? 7.5 : 4.1) * (p.boost ? 2 : 1);
      this.moving = Math.abs(f) + Math.abs(s) > 0.04;
      if (this.moving) {
        const target = Math.atan2(-vx, -vz);
        this.yaw +=
          Math.atan2(Math.sin(target - this.yaw), Math.cos(target - this.yaw)) *
          0.24;
      }
      this.down.origin = op;
      this.grounded = !!this.world.castRay(
        this.down,
        1.03,
        true,
        undefined,
        undefined,
        undefined,
        this.player,
      );
      this.player.setGravityScale(p.moon ? 0.32 : 1, true);
      const jump = input.jump && this.grounded && this.cooldown <= 0;
      if (jump) this.cooldown = 0.3;
      vec.x = vx * rate;
      vec.z = vz * rate;
      vec.y = jump ? (p.boost ? 11.5 : 7) : ov.y;
      this.player.setLinvel(vec, true);
    }
    const cv = this.car.linvel(),
      cp = this.car.translation(),
      q = this.car.rotation();
    this.vehicleYaw = 2 * Math.atan2(q.y, q.w);
    const sn = Math.sin(this.vehicleYaw),
      cs = Math.cos(this.vehicleYaw),
      fx = -sn,
      fz = -cs;
    let forward = cv.x * fx + cv.z * fz;
    let spring = 0,
      contacts = 0;
    for (let i = 0; i < 4; i++) {
      const sx = i % 2 ? 0.89 : -0.89,
        sz = i < 2 ? -1.4 : 1.4;
      this.down.origin = {
        x: cp.x + sx * cs + sz * sn,
        y: cp.y + 0.14,
        z: cp.z - sx * sn + sz * cs,
      };
      const hit = this.world.castRay(
        this.down,
        1.08,
        true,
        R.QueryFilterFlags.ONLY_FIXED,
      );
      if (hit) {
        contacts++;
        spring += clamp(
          (0.8 - hit.timeOfImpact) * 18000 - cv.y * 2100,
          0,
          26000,
        );
      }
    }
    if (contacts) {
      vec.x = 0;
      vec.z = 0;
      vec.y = spring * dt;
      this.car.applyImpulse(vec, true);
      const inputF = p.driving ? input.forward : 0;
      forward += inputF * cars[p.car].accel * dt;
      forward *=
        1 -
        dt *
          (p.driving ? (input.handbrake ? 3.8 : inputF === 0 ? 0.8 : 0.12) : 4);
      forward = clamp(forward, -12, cars[p.car].top);
      const lateral = cv.x * cs - cv.z * sn;
      const grip =
        1 - Math.min(1, dt * (p.driving && input.handbrake ? 1.9 : 10.5));
      this.car.setLinvel(
        {
          x: fx * forward + cs * lateral * grip,
          y: this.car.linvel().y,
          z: fz * forward - sn * lateral * grip,
        },
        true,
      );
      this.car.setAngvel(
        {
          x: 0,
          y: p.driving
            ? -input.side *
              clamp(forward / 5, -1, 1) *
              (1.65 - Math.min(Math.abs(forward) / 85, 0.48))
            : 0,
          z: 0,
        },
        true,
      );
    }
    this.world.step();
    const cc = this.car.translation(),
      cr = this.car.rotation();
    this.vehicleCurrent.x = cc.x;
    this.vehicleCurrent.y = cc.y;
    this.vehicleCurrent.z = cc.z;
    this.vehicleCurrent.yaw = 2 * Math.atan2(cr.y, cr.w);
    this.speed = forward;
    if (p.driving) {
      Object.assign(this.current, this.vehicleCurrent);
      this.moving = Math.abs(forward) > 0.5;
    } else {
      Object.assign(this.current, this.player.translation());
      this.current.yaw = this.yaw;
    }
    this.sync();
  }
  private sync() {
    Object.assign(this.p.player, this.current);
    Object.assign(this.p.vehicle, this.vehicleCurrent);
  }
  groundAt(x: number, z: number) {
    this.down.origin = { x, y: 65, z };
    const hit = this.world.castRay(
      this.down,
      70,
      true,
      R.QueryFilterFlags.ONLY_FIXED,
    );
    return hit ? 65 - hit.timeOfImpact : 0;
  }
  cameraDistance(
    x: number,
    y: number,
    z: number,
    dx: number,
    dy: number,
    dz: number,
    length: number,
  ) {
    this.sight.origin = { x, y, z };
    this.sight.dir = { x: dx, y: dy, z: dz };
    const hit = this.world.castRay(
      this.sight,
      length,
      true,
      R.QueryFilterFlags.ONLY_FIXED,
    );
    return hit ? Math.max(0.5, hit.timeOfImpact - 0.2) : length;
  }
}
