import * as T from "three";
import type { WebGPURenderer } from "three/webgpu";
import type { Quality } from "../core/state";
export type EngineRenderer = T.WebGLRenderer | WebGPURenderer;
export async function rendererFor(
  canvas: HTMLCanvasElement,
): Promise<{ renderer: EngineRenderer; api: string }> {
  const gpu = (
    navigator as Navigator & {
      gpu?: { requestAdapter: () => Promise<unknown> };
    }
  ).gpu;
  if (gpu && (await gpu.requestAdapter().catch(() => null))) {
    try {
      const { WebGPURenderer } = await import("three/webgpu");
      const r = new WebGPURenderer({
        canvas,
        antialias: true,
        powerPreference: "high-performance",
      });
      await r.init();
      r.toneMapping = T.ACESFilmicToneMapping;
      return {
        renderer: r,
        api: (r.backend as unknown as { isWebGPUBackend?: boolean })
          .isWebGPUBackend
          ? "WebGPU"
          : "WebGL2",
      };
    } catch {
      /* A device may disappear between adapter negotiation and initialization. */
    }
  }
  if (
    !canvas.getContext("webgl2", {
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    })
  )
    throw Error(
      "3D rendering needs WebGL 2 or WebGPU. Enable hardware acceleration in your browser.",
    );
  const r = new T.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  r.toneMapping = T.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.15;
  return { renderer: r, api: "WebGL2" };
}
export const resolution = (q: Quality) =>
  Math.min(
    window.devicePixelRatio || 1,
    { Ultra: 2, High: 1.5, Balanced: 1.15, "Max FPS": 0.8 }[q],
  );
export function environment() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const c = canvas.getContext("2d")!;
  const g = c.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, "#746aa7");
  g.addColorStop(0.43, "#ffaf96");
  g.addColorStop(0.51, "#ffdad0");
  g.addColorStop(0.54, "#766473");
  g.addColorStop(1, "#463d46");
  c.fillStyle = g;
  c.fillRect(0, 0, 1024, 512);
  c.fillStyle = "#ffefa1";
  c.fillRect(200, 175, 50, 38);
  c.fillStyle = "#ecf6ff";
  c.fillRect(30, 200, 150, 18);
  c.fillStyle = "#9cdcf6";
  c.fillRect(755, 140, 145, 42);
  c.fillStyle = "#ff76bf";
  c.fillRect(685, 155, 45, 100);
  const t = new T.CanvasTexture(canvas);
  t.mapping = T.EquirectangularReflectionMapping;
  t.colorSpace = T.SRGBColorSpace;
  return t;
}
