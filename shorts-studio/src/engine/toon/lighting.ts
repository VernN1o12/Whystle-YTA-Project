// The world light rig: camera-relative key light (frozen per shot), two-tone uniforms, fog.
// Lifted from the proven bridge world so the painted sets and character cards match that look exactly.

import * as THREE from "three";
import { LIGHTS, LOOK, LightPreset } from "../bridge/lights";
import { TONE, CHAR, untone } from "../bridge/shade";
import { NOINK } from "../bridge/ink";
import type { LightName } from "./types";

/** an interior preset in the same shape as the outdoor ones: warm window key, cool plaster shade */
export const STUDIO_LIGHT: LightPreset = {
  ...LIGHTS.day,
  az: -58,
  el: 27,
  lit: [1.56, 1.43, 1.2],
  shade: [0.47, 0.43, 0.46],
  lift: [0.07, 0.065, 0.1],
  lambert: 0.42,
  sideK: 0.82,
  term: 0.26,
  charTint: [1.0, 0.95, 0.9],
  charShade: 0.88,
  charGrad: 0.09,
  bodyGrad: 0.22,
  sideTint: [0.9, 0.9, 0.98],
  blob: [0.5, 0.47, 0.52],
  actorShadow: true,
  top: "#4c7fbe",
  hor: "#d3e2ee",
  fog: "#cfd8de",
  fogNear: 12,
  fogFar: 60,
  sunCol: "#fff0d2",
  sunI: 3.1,
  sky: "#eaf3ff",
  ground: "#a98a68",
  hemiI: 0.5,
  bias: -0.0003,
  normalBias: 0.02,
};

/** the colour void: a cool key from the lens side, deep indigo shade, no sky */
export const VOID_LIGHT: LightPreset = {
  ...LIGHTS.day,
  az: -64,
  el: 26,
  lit: [1.42, 1.36, 1.52],
  shade: [0.3, 0.26, 0.46],
  lift: [0.06, 0.05, 0.12],
  lambert: 0.4,
  sideK: 0.84,
  term: 0.24,
  charTint: [1.0, 0.97, 0.96],
  charShade: 0.84,
  charGrad: 0.1,
  bodyGrad: 0.24,
  sideTint: [0.88, 0.9, 1.0],
  blob: [0.24, 0.2, 0.34],
  actorShadow: true,
  top: "#1a1430",
  hor: "#2c2044",
  fog: "#141119",
  fogNear: 6,
  fogFar: 19,
  sunCol: "#dfe6ff",
  sunI: 2.0,
  sky: "#3c3766",
  ground: "#1e1628",
  hemiI: 0.35,
  bias: -0.0003,
  normalBias: 0.02,
};

const preset = (name: LightName): LightPreset => {
  if (name === "studio") return STUDIO_LIGHT;
  if (name === "void") return VOID_LIGHT;
  if (name === "habitat") return LIGHTS.habitat;
  if (name === "mars") return LIGHTS.mars;
  if (name === "greenhouse") return LIGHTS.greenhouse;
  if (name === "schematic") return LIGHTS.schematic;
  return LIGHTS.day;
};

const look = (name: LightName) => {
  if (name === "studio") return LOOK.day;
  if (name === "void") return LOOK.golden;
  if (name in LOOK) return LOOK[name as keyof typeof LOOK];
  return LOOK.day;
};

/** direction TOWARD the sun: az degrees from the shot's forward axis (0 = ahead/backlight, +90 = screen right) */
const sunDir = (cam: THREE.PerspectiveCamera, focus: THREE.Vector3, az: number, el: number) => {
  const fx = focus.x - cam.position.x, fz = focus.z - cam.position.z;
  const n = Math.hypot(fx, fz) || 1;
  const ux = fx / n, uz = fz / n;
  const a = THREE.MathUtils.degToRad(az), e = THREE.MathUtils.degToRad(el);
  const hx = ux * Math.cos(a) - uz * Math.sin(a);
  const hz = uz * Math.cos(a) + ux * Math.sin(a);
  return new THREE.Vector3(hx * Math.cos(e), Math.sin(e), hz * Math.cos(e)).normalize();
};

export class LightRig {
  hemi: THREE.HemisphereLight;
  sun: THREE.DirectionalLight;
  fill: THREE.DirectionalLight;
  fog: THREE.Fog;

  constructor(root: THREE.Object3D) {
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.0);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.fill = new THREE.DirectionalLight("#9fb8ff", 0.3);
    this.fog = new THREE.Fog("#cfd8de", 12, 60);
    root.add(this.hemi, this.sun, this.sun.target, this.fill, this.fill.target);
  }

  /** call once per frame, after the camera is placed */
  apply(name: LightName, cam: THREE.PerspectiveCamera, focus: THREE.Vector3, dist: number, scene: THREE.Scene) {
    const L = preset(name);
    const K = look(name);
    const dir = sunDir(cam, focus, L.az, L.el);

    this.hemi.color.set(L.sky);
    this.hemi.groundColor.set(L.ground);
    this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol);
    this.sun.intensity = L.sunI;
    this.fill.intensity = 0;

    const R = THREE.MathUtils.clamp(dist * 1.15 + 6, 8, 42);
    this.sun.position.copy(focus).addScaledVector(dir, 160);
    this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -R;
    sc.right = R;
    sc.top = R;
    sc.bottom = -R;
    sc.near = 20;
    sc.far = 360;
    sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias;
    this.sun.shadow.normalBias = L.normalBias * (R / 12);

    TONE.uLitCol.value.set(L.lit[0], L.lit[1], L.lit[2]);
    TONE.uShadeCol.value.set(L.shade[0], L.shade[1], L.shade[2]);
    TONE.uShadeLift.value.set(L.lift[0], L.lift[1], L.lift[2]);
    TONE.uLambert.value = L.lambert;
    TONE.uSideK.value = L.sideK;
    TONE.uTerm.value = L.term;
    TONE.uBounce.value.set(K.bounce[0], K.bounce[1], K.bounce[2]);
    TONE.uSat.value = K.sat;

    CHAR.uCharTint.value.set(L.charTint[0], L.charTint[1], L.charTint[2]);
    CHAR.uCharShade.value = L.charShade;
    CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad;
    CHAR.uSideTint.value.set(L.sideTint[0], L.sideTint[1], L.sideTint[2]);

    untone(L.fog, this.fog.color);
    this.fog.near = L.fogNear;
    this.fog.far = L.fogFar;
    scene.fog = this.fog;
    scene.background = untone(L.fog, new THREE.Color());

    cam.layers.enable(NOINK);
  }
}
