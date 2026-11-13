// Shared geometry + paint helpers for the Mars sets. Kept tiny so each set file reads as staging,
// not boilerplate: beams between two points, pipes on an axis, and a soft additive glow card.

import * as THREE from "three";
import { Batch } from "../../../bridge/build";
import { ctex } from "../../../bridge/paint";

/** a cylinder between two points (dome ribs, dish struts, tower legs) */
export const beam = (b: Batch, mat: THREE.Material, a: [number, number, number], c: [number, number, number], r: number) => {
  const A = new THREE.Vector3(a[0], a[1], a[2]);
  const B = new THREE.Vector3(c[0], c[1], c[2]);
  const d = B.clone().sub(A);
  const len = d.length();
  if (len < 0.0001) return;
  const g = new THREE.CylinderGeometry(r, r, len, 8);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  g.translate((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2);
  b.add(g, mat);
};

/** an upright or horizontal pipe */
export const pipe = (
  b: Batch,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  len: number,
  r: number,
  axis: "x" | "y" | "z" = "y",
) => {
  const g = new THREE.CylinderGeometry(r, r, len, 12);
  if (axis === "x") g.rotateZ(Math.PI / 2);
  else if (axis === "z") g.rotateX(Math.PI / 2);
  g.translate(x, y, z);
  b.add(g, mat);
};

/** soft radial card used for practical light spill / glows */
export const glowTex = (key: string, rgb: string) =>
  ctex(key, 256, 256, (g) => {
    const gr = g.createRadialGradient(128, 128, 2, 128, 128, 126);
    gr.addColorStop(0, `rgba(${rgb},0.95)`);
    gr.addColorStop(0.35, `rgba(${rgb},0.34)`);
    gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 256);
  });

/** an additive glow card facing +z; rotate it in the caller if the wall faces another way */
export const glowCard = (tex: THREE.Texture, x: number, y: number, z: number, s: number, opacity = 0.65) => {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(s, s),
    new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    }),
  );
  m.position.set(x, y, z);
  return m;
};

/** a simple canvas screen: dark glass, header, rows of small painted readouts */
export const screenTex = (key: string, header: string, lines: string[], accent: string) =>
  ctex(key, 768, 512, (g, r) => {
    g.fillStyle = "#0c1418";
    g.fillRect(0, 0, 768, 512);
    g.fillStyle = "rgba(255,255,255,0.035)";
    for (let y = 0; y < 512; y += 4) g.fillRect(0, y, 768, 1);
    g.strokeStyle = accent;
    g.lineWidth = 5;
    g.strokeRect(14, 14, 740, 484);
    g.fillStyle = accent;
    g.font = "bold 42px monospace";
    g.fillText(header, 38, 74);
    g.font = "26px monospace";
    g.fillStyle = "rgba(232,240,238,0.88)";
    lines.forEach((line, i) => g.fillText(line, 42, 138 + i * 44));
    // tiny painted status blocks
    for (let i = 0; i < 12; i++) {
      g.fillStyle = i % 4 === 3 ? "#c9563f" : accent;
      g.globalAlpha = 0.3 + r() * 0.55;
      g.fillRect(600 - (i % 4) * 18, 112 + Math.floor(i / 4) * 44, 9, 20);
    }
    g.globalAlpha = 1;
  });
