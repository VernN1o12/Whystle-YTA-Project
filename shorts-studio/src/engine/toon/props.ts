// Reusable props: 3D set dressing (jars, plants, books) and 2D effect cards (sound rings, notes).
// Everything is procedural; no downloaded models are needed for the studio.

import * as THREE from "three";
import { Batch, V, boxGeo } from "../bridge/build";
import { Pen, fxBurst, fxNote, fxStars } from "../bridge/toon";
import type { FxKind } from "./types";

/** axis box centred on (cx, cz), sitting on y */
export const addBox = (b: Batch, mat: THREE.Material, cx: number, y: number, cz: number, w: number, h: number, d: number, tile = 0) =>
  b.add(boxGeo(V(cx - w / 2, y, cz - d / 2), V(cx + w / 2, y + h, cz + d / 2), tile), mat);

/** upright cylinder sitting on y */
export const addCyl = (b: Batch, mat: THREE.Material, cx: number, y: number, cz: number, r: number, h: number, seg = 18) => {
  const g = new THREE.CylinderGeometry(r, r, h, seg, 1, false);
  g.translate(cx, y + h / 2, cz);
  b.add(g, mat);
};

/** squashed sphere (a leaf, a cushion, a bush) */
export const addBlob = (b: Batch, mat: THREE.Material, cx: number, y: number, cz: number, rx: number, ry: number, rz: number, rot = 0) => {
  const g = new THREE.SphereGeometry(1, 12, 9);
  g.scale(rx, ry, rz);
  if (rot) g.rotateZ(rot);
  g.translate(cx, y, cz);
  b.add(g, mat);
};

/** glass jar with a lid */
export const jar = (b: Batch, glass: THREE.Material, lid: THREE.Material, cx: number, y: number, cz: number, r: number, h: number) => {
  addCyl(b, glass, cx, y, cz, r, h, 20);
  addCyl(b, lid, cx, y + h, cz, r * 1.04, Math.max(0.03, h * 0.1), 20);
};

/** a potted plant: terracotta pot + a fan of painted leaves */
export const plant = (b: Batch, pot: THREE.Material, soil: THREE.Material, leaf: THREE.Material, cx: number, y: number, cz: number, s = 1) => {
  addCyl(b, pot, cx, y, cz, 0.19 * s, 0.26 * s, 18);
  addCyl(b, soil, cx, y + 0.25 * s, cz, 0.17 * s, 0.03 * s, 18);
  const base = y + 0.27 * s;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.4;
    const len = (0.26 + 0.16 * ((i * 37) % 7) / 7) * s;
    const lean = 0.5 + 0.35 * ((i * 53) % 5) / 5;
    const lx = cx + Math.cos(a) * len * 0.55;
    const lz = cz + Math.sin(a) * len * 0.55;
    addBlob(b, leaf, lx, base + len * lean, lz, len * 0.42, len * 0.16, len * 0.28, a);
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.9;
    addBlob(b, leaf, cx + Math.cos(a) * 0.1 * s, base + (0.36 + 0.1 * i) * s, cz + Math.sin(a) * 0.1 * s, 0.16 * s, 0.07 * s, 0.11 * s, a);
  }
};

/** three stacked books lying flat */
export const bookStack = (b: Batch, mats: THREE.Material[], cx: number, y: number, cz: number, s = 1) => {
  const cols = ["#8c3b4a", "#3f6fb5", "#b5653f", "#5d7a3a"];
  for (let i = 0; i < 3; i++) {
    addBox(b, mats[i % mats.length], cx + (i % 2 ? 0.015 : -0.01) * s, y + i * 0.055 * s, cz, (0.26 - i * 0.02) * s, 0.05 * s, 0.19 * s);
    void cols;
  }
};

// ---------------- 2D effect cards ----------------
/** expanding sound rings on a 512 canvas; u = 0..1 */
export const soundRing = (p: Pen, u: number, col = "#e8b84a") => {
  const c = 256;
  for (let k = 0; k < 3; k++) {
    const v = u - k * 0.2;
    if (v <= 0 || v >= 1) continue;
    const r = 34 + 205 * v;
    const w = 12 * (1 - v) + 2.5;
    const a = Math.max(0, 1 - v);
    p.arc(c, c, r, r, 0, 360, w, k === 0 ? `rgba(255,244,214,${a.toFixed(3)})` : col);
  }
};

export const drawFx = (kind: FxKind, p: Pen, u: number, seed = 0) => {
  if (kind === "ring") soundRing(p, u);
  else if (kind === "note") fxNote(p, seed % 2, "#f0e6c4");
  else if (kind === "burst") fxBurst(p, u);
  else fxStars(p, u);
};
