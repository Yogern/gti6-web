import test from "node:test";
import assert from "node:assert/strict";
import {
  newProgress,
  defaultPrefs,
  validProgress,
  validPrefs,
  layoutDefault,
} from "../src/core/state";
import { objective, advanceJob } from "../src/systems/activities";
import { Simulation, initPhysics, STEP } from "../src/physics/simulation";
import { isNetPose } from "../src/multiplayer/protocol";
test("save schema validates supported shapes and rejects invalid positions, slots and controls", () => {
  const p = newProgress(),
    f = defaultPrefs();
  assert.ok(validProgress(p));
  assert.ok(validPrefs(f));
  assert.equal(validProgress({ ...p, player: { ...p.player, y: NaN } }), false);
  assert.equal(validProgress({ ...p, car: "unknown" }), false);
  assert.equal(validProgress({ ...p, stage: 9 }), false);
  assert.equal(validPrefs({ ...f, layout: {} }), false);
  assert.equal(validPrefs({ ...f, volume: 5 }), false);
  assert.equal(layoutDefault(true).stick.x, 100 - layoutDefault().stick.x);
});
test("dispatch pays once and circuit requires a vehicle at every stop", () => {
  const p = newProgress();
  p.job = "delivery";
  for (let i = 0; i < 2; i++) {
    Object.assign(p.player, objective(p));
    assert.ok(advanceJob(p, STEP));
  }
  assert.equal(p.cash, 3250);
  assert.equal(advanceJob(p, STEP), "");
  assert.equal(p.completed, 1);
  p.job = "race";
  Object.assign(p.player, objective(p));
  assert.equal(advanceJob(p, STEP), "");
  p.driving = true;
  for (let i = 0; i < 5; i++) {
    Object.assign(p.player, objective(p));
    assert.ok(advanceJob(p, STEP));
  }
  assert.equal(p.cash, 4450);
  assert.equal(p.completed, 2);
});
test("network transform contract bounds positions and vehicle states", () => {
  const p = {
    x: 0,
    y: 1,
    z: 0,
    yaw: 0,
    moving: false,
    car: "",
    gesture: false,
  };
  assert.ok(isNetPose(p));
  assert.equal(isNetPose({ ...p, x: Infinity }), false);
  assert.equal(isNetPose({ ...p, car: 27 }), false);
});
test("fixed-step movement, wall collision, spring-arm occlusion, jump and ray-suspended driving", async () => {
  await initPhysics();
  const p = newProgress();
  p.player = { x: 0, y: 1, z: 3, yaw: 0 };
  p.vehicle = { x: 3, y: 0.7, z: 3, yaw: 0 };
  const sim = new Simulation(
    [
      { x: 0, y: -0.5, z: 0, w: 100, h: 1, d: 100, yaw: 0 },
      { x: 0, y: 2, z: -4, w: 5, h: 4, d: 1, yaw: 0 },
    ],
    p,
  );
  const input = {
    forward: 0,
    side: 0,
    sprint: false,
    jump: false,
    handbrake: false,
  };
  for (let i = 0; i < 36; i++) sim.step(input, 0);
  assert(sim.grounded);
  const y = p.player.y;
  for (let i = 0; i < 9; i++) sim.step({ ...input, jump: i === 0 }, 0);
  assert(p.player.y > y + 0.5);
  for (let i = 0; i < 150; i++) sim.step({ ...input, forward: 1 }, 0);
  assert(p.player.z >= -3.2 && p.player.z < 0);
  assert(sim.cameraDistance(0, 1.5, 0, 0, 0, -1, 8) < 4);
  p.player = { x: 2.5, y: 1, z: 5, yaw: 0 };
  sim.restore();
  assert(sim.toggleCar());
  const z = p.vehicle.z;
  for (let i = 0; i < 120; i++) sim.step({ ...input, forward: 1 }, 0);
  assert(p.vehicle.z < z - 3);
  assert(p.vehicle.y > 0.2 && p.vehicle.y < 2);
  assert(sim.toggleCar());
  assert.equal(p.driving, false);
  sim.world.free();
});
