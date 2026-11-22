import * as T from "three";
import { rendererFor, resolution } from "./renderer";
import { coastHDR } from "./atmosphere";
import { vehicle, paintVehicle } from "../core/assets";
import type { CarId } from "../world/atlas";
import type { Quality } from "../core/state";
export async function openGarage(
  canvas: HTMLCanvasElement,
  id: CarId,
  color: string,
  quality: Quality,
) {
  const [{ renderer }, car, hdr] = await Promise.all([
    rendererFor(canvas),
    vehicle(id, color),
    coastHDR(),
  ]);
  if (!canvas.isConnected) {
    renderer.dispose();
    throw new DOMException("Showroom closed", "AbortError");
  }
  const scene = new T.Scene();
  scene.background = new T.Color("#24212c");
  scene.environment = hdr;
  scene.environmentIntensity = 1.6;
  scene.fog = new T.FogExp2("#24212c", 0.055);
  const root = car.root;
  scene.add(root);
  const hemi = new T.HemisphereLight("#ffdacf", "#746378", 1.4);
  const key = new T.DirectionalLight("#ffe6d5", 2.9);
  key.position.set(4, 7, 2);
  scene.add(hemi, key);
  const floor = new T.Mesh(
    new T.CylinderGeometry(3.7, 3.8, 0.18, 80),
    new T.MeshStandardMaterial({
      color: "#4b424d",
      roughness: 0.38,
      metalness: 0.45,
    }),
  );
  floor.position.y = -0.11;
  scene.add(floor);
  const ring = new T.Mesh(
    new T.TorusGeometry(3.66, 0.012, 5, 120),
    new T.MeshBasicMaterial({ color: "#c68199" }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.01;
  scene.add(ring);
  const grid = new T.GridHelper(120, 80, "#564857", "#38323f");
  grid.position.y = -0.21;
  scene.add(grid);
  const camera = new T.PerspectiveCamera(36, 1, 0.1, 130);
  let frame = 0,
    angle = 0.82,
    last = performance.now(),
    drag = false,
    lastX = 0,
    disposed = false;
  renderer.setPixelRatio(Math.min(resolution(quality), 1.35));
  function resize() {
    const r = canvas.getBoundingClientRect();
    renderer.setSize(Math.max(1, r.width), Math.max(1, r.height), false);
    camera.aspect = r.width / Math.max(1, r.height);
    camera.updateProjectionMatrix();
  }
  const ob = new ResizeObserver(resize);
  ob.observe(canvas.parentElement!);
  resize();
  canvas.onpointerdown = (e) => {
    canvas.setPointerCapture(e.pointerId);
    lastX = e.clientX;
    drag = true;
  };
  canvas.onpointermove = (e) => {
    if (drag) {
      angle -= (e.clientX - lastX) * 0.012;
      lastX = e.clientX;
    }
  };
  canvas.onlostpointercapture = () => (drag = false);
  function render(t: number) {
    if (disposed) return;
    const dt = Math.min(0.1, (t - last) / 1000);
    if (!drag && !matchMedia("(prefers-reduced-motion: reduce)").matches)
      angle += dt * 0.11;
    last = t;
    const d = camera.aspect < 1.3 ? 9.2 : 7.7;
    camera.position.set(Math.sin(angle) * d, 3.0, Math.cos(angle) * d);
    camera.lookAt(0, id === "courier" ? 1.1 : 0.65, 0);
    renderer.render(scene, camera);
    frame = requestAnimationFrame(render);
  }
  render(last);
  return {
    paint(c: string) {
      paintVehicle(root, id, c);
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      ob.disconnect();
      renderer.dispose();
      if (renderer instanceof T.WebGLRenderer) renderer.forceContextLoss();
      floor.geometry.dispose();
      floor.material.dispose();
      ring.geometry.dispose();
      ring.material.dispose();
      grid.dispose();
      root.traverse((n) => {
        if (
          n instanceof T.Mesh &&
          !Array.isArray(n.material) &&
          n.material.userData.localPaint
        )
          n.material.dispose();
      });
    },
  };
}
