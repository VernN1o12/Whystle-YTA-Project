import type { SceneSpec } from "../../engine/toon/types";

// Phase 1 reference slice: one 3 s medium shot of Wren in the painted studio, holding the red fork.
export const SLICE: SceneSpec = {
  slug: "slice",
  fps: 30,
  width: 1080,
  height: 1920,
  shots: [
    {
      id: "S1",
      set: "studio",
      light: "studio",
      dur: 3,
      cam: [
        { t: 0, pos: [1.9, 1.55, 4.35], look: [0, 1.0, 0], fov: 32 },
        { t: 3, pos: [1.72, 1.52, 4.15], look: [0, 1.02, 0], fov: 31, ease: "inOut" },
      ],
      actors: [
        {
          name: "wren",
          cast: "wren",
          x: 0,
          y: 0,
          z: 0,
          expr: "smile",
          facing: 0,
          wave: 1,
          fork: true,
          headTilt: -2,
          keys: [
            { t: 0, expr: "smile", wave: 1, headTilt: -2 },
            { t: 1.4, expr: "grin", wave: 1.08, headTilt: 1 },
            { t: 2.2, expr: "smile", wave: 0.96, headTilt: -1 },
          ],
        },
      ],
      fx: [
        { kind: "ring", x: 0.37, y: 1.5, z: 0.04, t0: 0.15, t1: 1.4, size: 0.9 },
        { kind: "ring", x: 0.37, y: 1.5, z: 0.04, t0: 0.9, t1: 2.2, size: 1.05 },
        { kind: "ring", x: 0.37, y: 1.5, z: 0.04, t0: 1.7, t1: 2.9, size: 1.2 },
        { kind: "note", x: 0.62, y: 1.94, z: 0.12, t0: 0.4, t1: 1.5, size: 0.16, seed: 0 },
        { kind: "note", x: 0.2, y: 2.02, z: 0.12, t0: 1.1, t1: 2.4, size: 0.14, seed: 1 },
      ],
      dof: { track: "wren", cInf: 13 },
    },
  ],
};
