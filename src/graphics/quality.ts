import * as T from "three";
// The fastest tier retains game geometry and skinned animation but uses vertex-lit
// materials instead of running the full image-based PBR shader per fragment.
export class QualityMaterials {
  private original = new Map<T.Mesh, T.Material | T.Material[]>();
  private fast = new Map<T.Material, T.Material>();
  capture(scene: T.Scene) {
    scene.traverse((o) => {
      if (o instanceof T.Mesh) this.original.set(o, o.material);
    });
  }
  restore() {
    for (const [mesh, material] of this.original) mesh.material = material;
  }
  apply(low: boolean) {
    if (!low) return;
    const cheap = (m: T.Material) => {
      if (!(m instanceof T.MeshStandardMaterial)) return m;
      let lit = this.fast.get(m) as T.MeshLambertMaterial | undefined;
      if (!lit) {
        lit = new T.MeshLambertMaterial({
          color: m.color,
          map: m.map,
          emissive: m.emissive,
          emissiveMap: m.emissiveMap,
          emissiveIntensity: m.emissiveIntensity,
          transparent: m.transparent,
          opacity: m.opacity,
          alphaTest: m.alphaTest,
          side: m.side,
          vertexColors: m.vertexColors,
          depthWrite: m.depthWrite,
        });
        this.fast.set(m, lit);
      }
      lit.color.copy(m.color);
      return lit;
    };
    for (const [mesh, m] of this.original)
      mesh.material = Array.isArray(m) ? m.map(cheap) : cheap(m);
  }
}
