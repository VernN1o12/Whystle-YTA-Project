// The colour void: a dark painted stage where each colour is a floating orb. The orbs are painted
// (a lit gradient baked into a texture) so they stay vivid and still take an ink outline; the sound
// rings are 2D effect cards placed in front of them.

import * as THREE from "three";
import { lam } from "../../bridge/build";
import { ctex, rep } from "../../bridge/paint";
import type { SetHandle } from "../types";

const ORBS: { x: number; y: number; z: number; r: number; col: string; hi: string; lo: string; key: string }[] = [
  { x: -2.4, y: 2.75, z: -3.2, r: 1.15, col: "#d9352f", hi: "#ff7a5e", lo: "#7d1230", key: "red" },
  { x: 2.6, y: 2.35, z: -3.6, r: 1.25, col: "#2f5fc4", hi: "#6ea4ff", lo: "#122a6e", key: "blue" },
  { x: 0.15, y: 2.2, z: -2.55, r: 1.05, col: "#e0b62c", hi: "#ffe873", lo: "#8a5c10", key: "yellow" },
  { x: -4.4, y: 3.5, z: -7.6, r: 0.95, col: "#3f9a5c", hi: "#84d98a", lo: "#17482c", key: "green" },
  { x: 4.3, y: 3.8, z: -8.0, r: 1.05, col: "#7a52c4", hi: "#b391ff", lo: "#3a1f72", key: "violet" },
  { x: 0.9, y: 4.1, z: -9.4, r: 1.15, col: "#d97a2c", hi: "#ffb56a", lo: "#7d3a0e", key: "orange" },
];

const backdrop = () =>
  ctex("voidBackdrop", 1024, 1024, (g, r) => {
    const gr = g.createLinearGradient(0, 0, 0, 1024);
    gr.addColorStop(0, "#14102a");
    gr.addColorStop(0.45, "#171421");
    gr.addColorStop(0.65, "#131020");
    gr.addColorStop(0.85, "#100d18");
    gr.addColorStop(1, "#0d0a18");
    g.fillStyle = gr;
    g.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 2200; i++) {
      const x = r() * 1024, y = r() * 1024, s = 1 + r() * 3;
      g.fillStyle = r() < 0.55 ? `rgba(255,240,220,${0.04 + r() * 0.12})` : `rgba(170,140,255,${0.03 + r() * 0.09})`;
      g.beginPath();
      g.arc(x, y, s, 0, Math.PI * 2);
      g.fill();
    }
  });

const floorTex = () =>
  ctex("voidFloor", 1024, 1024, (g, r) => {
    const gr = g.createRadialGradient(512, 512, 40, 512, 512, 560);
    gr.addColorStop(0, "#2b2438");
    gr.addColorStop(0.45, "#1d1828");
    gr.addColorStop(0.75, "#141119");
    gr.addColorStop(1, "#141119");
    g.fillStyle = gr;
    g.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = `rgba(200,180,255,${0.01 + r() * 0.03})`;
      g.fillRect(r() * 1024, r() * 1024, 2, 1);
    }
  });

/** a painted sphere: warm highlight upper-left, saturated body, deep rim lower-right */
const orbTex = (o: (typeof ORBS)[number]) =>
  ctex(`voidOrb${o.key}`, 512, 512, (g, r) => {
    const gr = g.createRadialGradient(196, 180, 10, 256, 256, 300);
    gr.addColorStop(0, o.hi);
    gr.addColorStop(0.35, o.col);
    gr.addColorStop(0.8, o.col);
    gr.addColorStop(1, o.lo);
    g.fillStyle = gr;
    g.fillRect(0, 0, 512, 512);
    // brush dabs so the sphere reads painted, not plastic
    for (let i = 0; i < 150; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 220;
      const x = 256 + Math.cos(a) * d, y = 256 + Math.sin(a) * d;
      const lit = 1 - d / 260;
      g.fillStyle = r() < 0.5 ? `rgba(255,255,255,${0.015 + lit * 0.035})` : `rgba(20,0,20,${0.012 + (1 - lit) * 0.035})`;
      g.beginPath();
      g.ellipse(x, y, 6 + r() * 16, 3 + r() * 8, r() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
  });

const halo = () =>
  ctex("voidHalo", 512, 512, (g) => {
    const gr = g.createRadialGradient(256, 256, 10, 256, 256, 250);
    gr.addColorStop(0, "rgba(214,228,255,0.5)");
    gr.addColorStop(0.4, "rgba(214,228,255,0.14)");
    gr.addColorStop(1, "rgba(214,228,255,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 512, 512);
  });

export const buildVoid = (): SetHandle => {
  const root = new THREE.Group();

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(30, 32, 20),
    new THREE.MeshBasicMaterial({ map: backdrop(), side: THREE.BackSide, fog: false }),
  );
  root.add(sky);

  const floor = new THREE.Mesh(new THREE.CircleGeometry(25, 64), lam("voidFloor", () => ({ map: rep(floorTex(), 1, 1) })));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  root.add(floor);

  for (const o of ORBS) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(o.r, 48, 32),
      new THREE.MeshBasicMaterial({ map: orbTex(o), fog: false }),
    );
    m.position.set(o.x, o.y, o.z);
    m.castShadow = true;
    root.add(m);
  }

  // soft halos behind the three hero orbs
  for (const key of ["red", "blue", "yellow"]) {
    const o = ORBS.find((v) => v.key === key)!;
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(o.r * 5.4, o.r * 5.4),
      new THREE.MeshBasicMaterial({ map: halo(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.25, fog: false }),
    );
    m.position.set(o.x, o.y, o.z - o.r - 0.4);
    root.add(m);
  }

  return { root, update: () => {} };
};
