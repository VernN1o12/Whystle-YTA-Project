// Light presets per time of day. The sun is CAMERA-RELATIVE and frozen per shot (world.ts update()):
// az = degrees from the shot camera's forward axis (0 = sun straight ahead = backlight, +90 = screen right,
// 180 = behind camera), el = elevation. lit/shade/lift are LINEAR RGB multipliers for shade.ts (may exceed 1).
// Field names follow lighting.md 9.1 exactly (the CHAR and POST agents read them); values are tuned on renders.
type C3 = [number, number, number];
export type LightPreset = {
  az: number; el: number;
  lit: C3; shade: C3; lift: C3; lambert: number; sideK: number; term: number;      // world two-tone (shade.ts)
  charTint: C3; charShade: number; charGrad: number; bodyGrad: number; sideTint: C3; // character cards (cast.ts)
  blob: C3; actorShadow: boolean;                                                    // contact blobs / card shadows
  top: string; hor: string; skyCurve: C3; fog: string; fogNear: number; fogFar: number; sunDisc: string; // depth.md 6.5
  sunCol: string; sunI: number; sky: string; ground: string; hemiI: number;         // three lights (unpatched mats only)
  bias: number; normalBias: number;
};
export const LIGHTS: Record<"day" | "golden" | "habitat" | "mars" | "greenhouse" | "schematic", LightPreset> = {
  day: {
    az: 75, el: 48,
    lit: [1.58, 1.5, 1.33], shade: [0.3, 0.29, 0.36], lift: [0.05, 0.06, 0.11], lambert: 0.35, sideK: 0.84, term: 0.2,
    charTint: [1.0, 0.94, 0.92], charShade: 0.86, charGrad: 0.07, bodyGrad: 0.2, sideTint: [0.92, 0.90, 0.96],
    blob: [0.62, 0.58, 0.58], actorShadow: false,
    top: "#3e7fd2", hor: "#b8d0ec", skyCurve: [0.0, 0.5, 0.6], fog: "#b8d0ec", fogNear: 25, fogFar: 300, sunDisc: "#000000",
    sunCol: "#fff3e0", sunI: 2.8, sky: "#dcecff", ground: "#b49a78", hemiI: 0.55,
    bias: -0.00025, normalBias: 0.015,
  },
  golden: {
    az: 6, el: 7,
    lit: [1.5, 0.68, 0.24], shade: [0.15, 0.15, 0.3], lift: [0.04, 0.06, 0.17], lambert: 0.35, sideK: 0.82, term: 0.07,
    charTint: [1.0, 0.78, 0.56], charShade: 0.88, charGrad: 0.1, bodyGrad: 0.25, sideTint: [0.85, 0.80, 0.95],
    blob: [0.75, 0.74, 0.9], actorShadow: true,
    top: "#6a4f8c", hor: "#ffd08a", skyCurve: [0.05, 0.6, 1.0], fog: "#efb489", fogNear: 50, fogFar: 380, sunDisc: "#ffcf9e",
    sunCol: "#ffab5e", sunI: 5.5, sky: "#d8b0b8", ground: "#8a6a60", hemiI: 0.5,
    bias: -0.0006, normalBias: 0.03,
  },
  // Mars habitat interior: warm emergency lighting, red O2 warning glows
  habitat: {
    az: 25, el: 45,
    lit: [1.42, 0.95, 0.82], shade: [0.42, 0.28, 0.25], lift: [0.06, 0.04, 0.03], lambert: 0.38, sideK: 0.78, term: 0.18,
    charTint: [1.0, 0.95, 0.93], charShade: 0.82, charGrad: 0.08, bodyGrad: 0.18, sideTint: [0.92, 0.88, 0.86],
    blob: [0.58, 0.48, 0.45], actorShadow: true,
    top: "#ff5533", hor: "#b8523a", skyCurve: [0.0, 0.3, 0.5], fog: "#3a1f18", fogNear: 8, fogFar: 60, sunDisc: "#ff3333",
    sunCol: "#ff9a80", sunI: 2.2, sky: "#2a1a1a", ground: "#2a2a2a", hemiI: 0.35,
    bias: -0.0004, normalBias: 0.02,
  },
  // Mars surface: dusty orange key, cold blue shadows, distant Earth glow
  mars: {
    az: 110, el: 35,
    lit: [1.45, 1.25, 0.95], shade: [0.32, 0.28, 0.38], lift: [0.06, 0.05, 0.08], lambert: 0.32, sideK: 0.81, term: 0.16,
    charTint: [1.0, 0.96, 0.92], charShade: 0.84, charGrad: 0.07, bodyGrad: 0.22, sideTint: [0.9, 0.88, 0.92],
    blob: [0.55, 0.48, 0.45], actorShadow: true,
    top: "#c98a3a", hor: "#e0b86a", skyCurve: [0.0, 0.4, 0.7], fog: "#6b420a", fogNear: 15, fogFar: 300, sunDisc: "#ffcc66",
    sunCol: "#ffaa66", sunI: 2.5, sky: "#8a6c42", ground: "#6b4e25", hemiI: 0.42,
    bias: -0.0003, normalBias: 0.018,
  },
  // Greenhouse: cool green key, bioluminescent accents
  greenhouse: {
    az: -20, el: 55,
    lit: [1.35, 1.45, 1.35], shade: [0.28, 0.35, 0.28], lift: [0.05, 0.06, 0.05], lambert: 0.42, sideK: 0.88, term: 0.22,
    charTint: [1.0, 0.98, 1.0], charShade: 0.88, charGrad: 0.06, bodyGrad: 0.18, sideTint: [0.88, 0.92, 0.88],
    blob: [0.48, 0.52, 0.48], actorShadow: true,
    top: "#4a8c3a", hor: "#6ab04a", skyCurve: [0.0, 0.35, 0.6], fog: "#2a3a2a", fogNear: 10, fogFar: 100, sunDisc: "#00ff88",
    sunCol: "#66ff66", sunI: 3.2, sky: "#1a2a1a", ground: "#1a2a1a", hemiI: 0.45,
    bias: -0.00035, normalBias: 0.015,
  },
  // Schematic/control panel: clinical blue-white
  schematic: {
    az: 75, el: 50,
    lit: [1.5, 1.5, 1.5], shade: [0.28, 0.28, 0.32], lift: [0.05, 0.05, 0.07], lambert: 0.4, sideK: 0.85, term: 0.18,
    charTint: [1.0, 0.99, 0.99], charShade: 0.86, charGrad: 0.05, bodyGrad: 0.2, sideTint: [0.9, 0.9, 0.95],
    blob: [0.5, 0.5, 0.55], actorShadow: true,
    top: "#5a7bd0", hor: "#d0e0f8", skyCurve: [0.0, 0.4, 0.7], fog: "#1a1a2a", fogNear: 12, fogFar: 80, sunDisc: "#ffffff",
    sunCol: "#f0f8ff", sunI: 2.9, sky: "#0d1a2a", ground: "#151a25", hemiI: 0.48,
    bias: -0.0004, normalBias: 0.012,
  },
};

/** world-only look per light (sky stops by elevation in degrees, river colours, cloud palette). All colours are
 *  ON-SCREEN targets under the current PBR-Neutral tone map; world.ts pre-inverts the tone map (shade.ts untone). */
export type WorldLook = {
  sky: { c: string[]; e: number[] };                         // 5 stops: c[i] at elevation e[i] (deg), smoothstep between
  water: { near: string; mid: string; far: string; crest: string; trough: string; glint: string; shade: C3 };
  bounce: C3;                                                 // shade.ts uBounce: albedo x bounce on shaded faces turned to the lens
  sat: number;                                                // shade.ts uSat: world albedo saturation (1 = as painted)
  cloud: { lit: string; mid: string; shade: string };
};
export const LOOK: Record<"day" | "golden" | "habitat" | "mars" | "greenhouse" | "schematic", WorldLook> = {
  day: {
    // depth.md 2.2: horizon #9fb6e6 just above the skyline, upper sky #5e93d9 at ~20 deg (grade: frame top #5997e2)
    sky: { c: ["#b8d0ec", "#9cbfea", "#6a9fe0", "#4f8cdb", "#3373cc"], e: [0, 3, 8, 16, 40] },
    water: { near: "#22a7b6", mid: "#167fb2", far: "#1a5596", crest: "#7ddfe8", trough: "#0e4a80", glint: "#ffffff", shade: [0.5, 0.56, 0.72] },
    cloud: { lit: "#fbf8f1", mid: "#e1e5f3", shade: "#c3cbe9" },
    bounce: [0, 0, 0],
    sat: 1.08,
  },
  golden: {
    // sunset, not dusk: #ffd08a horizon, peach/orange through ~10 deg, warm rose at 20, muted warm mauve only near the top
    // (the golden grade adds ~+11/255 blue to shadows/mids, so these lean warm)
    sky: { c: ["#ffc47c", "#f7ae78", "#e8967c", "#c4848e", "#8a6f8a"], e: [0, 4, 10, 20, 40] },
    water: { near: "#1e3a6e", mid: "#355f96", far: "#d4a48e", crest: "#d9a088", trough: "#16294f", glint: "#ffe2b0", shade: [0.42, 0.46, 0.72] },
    cloud: { lit: "#ffd2a8", mid: "#f2a08f", shade: "#a98fc4" },
    bounce: [0.04, 0.02, 0.0],
    sat: 1.1,
  },
  // Mars habitat: warm amber emergency lighting, dim atmosphere
  habitat: {
    sky: { c: ["#3a1f18", "#5a2a20", "#7a3a2a", "#5a3a28", "#3a2a22"], e: [0, 5, 15, 30, 45] },
    water: { near: "#ff5533", mid: "#ff7a5e", far: "#ff5533", crest: "#ffaa66", trough: "#cc331a", glint: "#ffcc99", shade: [0.6, 0.2, 0.15] },
    cloud: { lit: "#ff9a80", mid: "#ff7a5e", shade: "#cc5533" },
    bounce: [0.08, 0.03, 0.02],
    sat: 0.7,
  },
  // Mars surface: dusty orange sky, deep blue shadows
  mars: {
    sky: { c: ["#8a6c42", "#a87c4d", "#c89a5a", "#a87c42", "#6b4e25"], e: [0, 4, 10, 25, 45] },
    water: { near: "#ffaa66", mid: "#ffcc99", far: "#e0b066", crest: "#ffdd88", trough: "#cc9944", glint: "#ffffcc", shade: [0.55, 0.42, 0.3] },
    cloud: { lit: "#ffaa66", mid: "#e0904a", shade: "#cc7a3a" },
    bounce: [0.12, 0.08, 0.05],
    sat: 0.95,
  },
  // Greenhouse: cool green tint, bioluminescent highlights
  greenhouse: {
    sky: { c: ["#2a3a2a", "#3a5a3a", "#4a7a4a", "#3a6a3a", "#2a4a2a"], e: [0, 5, 12, 28, 42] },
    water: { near: "#30c974", mid: "#40d884", far: "#20b864", crest: "#50e894", trough: "#10a844", glint: "#a0ffca", shade: [0.3, 0.5, 0.35] },
    cloud: { lit: "#40d884", mid: "#30c974", shade: "#20a854" },
    bounce: [0.03, 0.12, 0.03],
    sat: 1.25,
  },
  // Schematic: clinical blue-white lab lighting
  schematic: {
    sky: { c: ["#1a1a2a", "#2a3a4a", "#3a5a6a", "#2a4a5a", "#1a2a3a"], e: [0, 6, 14, 30, 46] },
    water: { near: "#d0e0f8", mid: "#c0d0e8", far: "#b0c0d8", crest: "#e0f0f8", trough: "#a0b0c0", glint: "#f0f8ff", shade: [0.3, 0.3, 0.42] },
    cloud: { lit: "#e0f0f8", mid: "#d0e0f8", shade: "#b0c0d8" },
    bounce: [0.02, 0.05, 0.1],
    sat: 0.85,
  },
};
