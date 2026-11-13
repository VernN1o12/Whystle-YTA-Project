// The painted studio: a warm plaster room with a tall garden window, plank floor, desk, shelf,
// swatch board, rug and a foreground plant. Every surface is a procedural painted texture, and
// the ink pass outlines it like the reference world.

import * as THREE from "three";
import { Batch, lam } from "../../bridge/build";
import { ctex, rep, beamHD } from "../../bridge/paint";
import { addBlob, addBox, addCyl, bookStack, jar, plant } from "../props";
import type { SetHandle } from "../types";

const SWATCHES = ["#c8302c", "#d9731f", "#d9b32a", "#3f8a4a", "#2f5fa8", "#6a48b8"];

const plaster = () =>
  ctex("studioPlaster", 1024, 1024, (g, r) => {
    g.fillStyle = "#dcc9a9";
    g.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 2400; i++) {
      const x = r() * 1024, y = r() * 1024, rx = 14 + r() * 74, ry = 8 + r() * 34;
      g.fillStyle = r() < 0.5 ? `rgba(255,248,228,${0.02 + r() * 0.04})` : `rgba(158,126,92,${0.012 + r() * 0.025})`;
      g.beginPath();
      g.ellipse(x, y, rx, ry, r() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 800; i++) {
      const x = r() * 1024, y = r() * 1024, l = 16 + r() * 64;
      g.strokeStyle = `rgba(255,255,255,${0.02 + r() * 0.035})`;
      g.lineWidth = 1 + r() * 2;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + l * 0.25, y + l);
      g.stroke();
    }
    g.fillStyle = "rgba(120,98,76,0.16)";
    g.fillRect(0, 872, 1024, 5);
  });

const floorBoards = () =>
  ctex("studioFloorBoards", 1024, 1024, (g, r) => {
    const COLS = ["#b5a184", "#ab977a", "#bda98c", "#a48f73", "#b29d80"];
    const bh = 128;
    for (let i = 0; i < 8; i++) {
      const y = i * bh;
      g.fillStyle = COLS[i % COLS.length];
      g.fillRect(0, y, 1024, bh);
      // grain: long soft strokes along the board
      for (let k = 0; k < 26; k++) {
        const gy = y + 6 + r() * (bh - 12);
        g.strokeStyle = r() < 0.5 ? `rgba(120,96,70,${0.03 + r() * 0.05})` : `rgba(255,248,230,${0.03 + r() * 0.05})`;
        g.lineWidth = 1 + r() * 2.2;
        g.beginPath();
        g.moveTo(-20, gy);
        g.bezierCurveTo(300, gy + (r() - 0.5) * 10, 700, gy + (r() - 0.5) * 10, 1044, gy + (r() - 0.5) * 6);
        g.stroke();
      }
      // knots
      if (i % 3 === 0) {
        const kx = 120 + r() * 780, ky = y + bh * (0.3 + r() * 0.4);
        g.strokeStyle = "rgba(122,96,68,0.22)";
        g.lineWidth = 2;
        for (let k = 0; k < 3; k++) {
          g.beginPath();
          g.ellipse(kx, ky, 8 + k * 5, 4 + k * 3, 0.3, 0, Math.PI * 2);
          g.stroke();
        }
      }
      // board seam + end joints
      g.fillStyle = "rgba(88,68,50,0.28)";
      g.fillRect(0, y + bh - 3, 1024, 3);
      const jx = (i * 331 + 90) % 1024;
      g.fillRect(jx, y, 3, bh);
    }
    for (let i = 0; i < 9000; i++) {
      g.fillStyle = `rgba(255,255,255,${0.01 + r() * 0.02})`;
      g.fillRect(r() * 1024, r() * 1024, 2, 1);
    }
  });

const rug = () =>
  ctex("studioRug", 512, 512, (g, r) => {
    g.fillStyle = "#3f5b56";
    g.fillRect(0, 0, 512, 512);
    g.strokeStyle = "#a2573d";
    g.lineWidth = 26;
    g.strokeRect(13, 13, 486, 486);
    g.strokeStyle = "#c19a54";
    g.lineWidth = 6;
    g.strokeRect(34, 34, 444, 444);
    g.fillStyle = "rgba(193,154,84,0.32)";
    for (let y = 70; y < 460; y += 90) {
      for (let x = 70; x < 460; x += 90) {
        g.beginPath();
        g.moveTo(x, y - 24);
        g.lineTo(x + 24, y);
        g.lineTo(x, y + 24);
        g.lineTo(x - 24, y);
        g.closePath();
        g.fill();
      }
    }
    for (let i = 0; i < 5000; i++) {
      const x = r() * 512, y = r() * 512;
      g.fillStyle = `rgba(255,255,255,${0.02 + r() * 0.03})`;
      g.fillRect(x, y, 2, 1);
    }
  });

const swatchBoard = () =>
  ctex("studioSwatch", 1024, 768, (g) => {
    g.fillStyle = "#efe6d2";
    g.fillRect(0, 0, 1024, 768);
    g.strokeStyle = "#2a2028";
    g.lineWidth = 10;
    g.strokeRect(10, 10, 1004, 748);
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < 6; i++) {
        const x = 70 + i * 158, y = 88 + row * 330, w = 120, h = 168;
        g.fillStyle = SWATCHES[i];
        g.fillRect(x, y, w, h);
        g.strokeStyle = "#2a2028";
        g.lineWidth = 6;
        g.strokeRect(x, y, w, h);
        g.fillStyle = "rgba(255,255,255,0.26)";
        g.fillRect(x + 8, y + 8, 26, h - 16);
        g.strokeStyle = "#5a4a40";
        g.lineWidth = 5;
        for (let k = 0; k < 3; k++) {
          g.beginPath();
          g.moveTo(x + 16, y + h + 20 + k * 14);
          g.lineTo(x + w - 16 - (k === 2 ? 30 : 0), y + h + 20 + k * 14);
          g.stroke();
        }
      }
    }
  });

const garden = () =>
  ctex("studioGarden", 512, 384, (g) => {
    const sky = g.createLinearGradient(0, 0, 0, 384);
    sky.addColorStop(0, "#8fd0f5");
    sky.addColorStop(0.62, "#d9eef7");
    sky.addColorStop(1, "#eaf3d9");
    g.fillStyle = sky;
    g.fillRect(0, 0, 512, 384);
    g.fillStyle = "#7fae74";
    g.beginPath();
    g.moveTo(0, 250);
    g.quadraticCurveTo(120, 200, 240, 245);
    g.quadraticCurveTo(380, 290, 512, 235);
    g.lineTo(512, 384);
    g.lineTo(0, 384);
    g.fill();
    g.fillStyle = "#5d8f5a";
    g.beginPath();
    g.moveTo(0, 300);
    g.quadraticCurveTo(160, 250, 320, 305);
    g.quadraticCurveTo(430, 340, 512, 300);
    g.lineTo(512, 384);
    g.lineTo(0, 384);
    g.fill();
    for (const [x, y, s] of [[90, 240, 46], [400, 230, 58], [300, 262, 34]] as [number, number, number][]) {
      g.fillStyle = "#3f6b48";
      g.beginPath();
      g.arc(x, y, s, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#55885c";
      g.beginPath();
      g.arc(x - s * 0.25, y - s * 0.25, s * 0.7, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = "rgba(255,255,255,0.86)";
    for (let i = 0; i < 4; i++) {
      const x = 60 + i * 120, y = 50 + (i % 2) * 26;
      g.beginPath();
      g.arc(x, y, 26, 0, Math.PI * 2);
      g.arc(x + 30, y + 6, 20, 0, Math.PI * 2);
      g.arc(x - 26, y + 8, 18, 0, Math.PI * 2);
      g.fill();
    }
  });

const lightPool = () =>
  ctex("studioPool", 512, 512, (g) => {
    const gr = g.createRadialGradient(256, 256, 20, 256, 256, 250);
    gr.addColorStop(0, "rgba(255,232,180,0.8)");
    gr.addColorStop(0.55, "rgba(255,224,160,0.32)");
    gr.addColorStop(1, "rgba(255,220,150,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 512, 512);
  });

export const buildStudio = (): SetHandle => {
  const root = new THREE.Group();
  const shell = new Batch();
  const furn = new Batch();

  const M = {
    floor: lam("studioFloor", () => ({ map: rep(floorBoards(), 3, 3) })),
    wall: lam("studioWall", () => ({ map: rep(plaster(), 2.4, 1.2), color: "#f2e7d6" })),
    beam: lam("studioBeam", () => ({ map: rep(beamHD(), 1, 1) })),
    rug: lam("studioRug", () => ({ map: rug() })),
    swatch: lam("studioSwatchBoard", () => ({ map: swatchBoard() })),
    wood: lam("studioWood", () => ({ map: rep(beamHD(), 1.2, 1.2) })),
    terracotta: lam("studioPot", () => ({ color: "#b5613f" })),
    soil: lam("studioSoil", () => ({ color: "#4a3528" })),
    leaf: lam("studioLeaf", () => ({ color: "#3f7a55" })),
    leaf2: lam("studioLeaf2", () => ({ color: "#5f9a62" })),
    brass: lam("studioBrass", () => ({ color: "#c9a24a" })),
    paper: lam("studioPaper", () => ({ color: "#efe7d6" })),
    mug: lam("studioMug", () => ({ color: "#c9563f" })),
    glassRed: lam("studioGlassRed", () => ({ color: "#b8413a" })),
    glassBlue: lam("studioGlassBlue", () => ({ color: "#3f6f9a" })),
    glassAmber: lam("studioGlassAmber", () => ({ color: "#c98a3a" })),
    lid: lam("studioLid", () => ({ color: "#8a7a5a" })),
    bookA: lam("studioBookA", () => ({ color: "#8c3b4a" })),
    bookB: lam("studioBookB", () => ({ color: "#3f6fb5" })),
    bookC: lam("studioBookC", () => ({ color: "#5d7a3a" })),
  };

  // ---- shell: floor, walls, skirting, window (no shadow casting, so the key light reaches the room) ----
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), M.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 1.5);
  floor.receiveShadow = true;
  root.add(floor);

  const back = new THREE.Mesh(new THREE.PlaneGeometry(12, 4), M.wall);
  back.position.set(0, 2, -3.2);
  back.receiveShadow = true;
  root.add(back);

  const left = new THREE.Mesh(new THREE.PlaneGeometry(12, 4), M.wall);
  left.rotation.y = Math.PI / 2;
  left.position.set(-4.2, 2, 1.8);
  left.receiveShadow = true;
  root.add(left);

  addBox(shell, M.beam, 0, 0, -3.1, 12, 0.14, 0.1);
  addBox(shell, M.beam, -4.1, 0, 1.8, 0.1, 0.14, 11);

  // window on the left wall
  const pane = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 1.5),
    new THREE.MeshBasicMaterial({ map: garden(), color: new THREE.Color(1.25, 1.22, 1.1) }),
  );
  pane.rotation.y = Math.PI / 2;
  pane.position.set(-4.14, 1.85, 0.7);
  root.add(pane);
  addBox(shell, M.beam, -4.12, 1.03, 0.7, 0.12, 0.09, 2.02);
  addBox(shell, M.beam, -4.12, 2.58, 0.7, 0.12, 0.09, 2.02);
  addBox(shell, M.beam, -4.12, 1.03, -0.31, 0.12, 1.64, 0.09);
  addBox(shell, M.beam, -4.12, 1.03, 1.71, 0.12, 1.64, 0.09);
  addBox(shell, M.beam, -4.1, 1.08, 0.7, 0.07, 1.48, 0.055);
  addBox(shell, M.beam, -4.1, 1.83, 0.7, 0.07, 0.055, 1.8);
  addBox(shell, M.beam, -4.02, 0.98, 0.7, 0.3, 0.06, 2.08);

  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 2.3),
    new THREE.MeshBasicMaterial({ map: lightPool(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.rotation.z = -0.35;
  pool.position.set(-1.75, 0.02, 1.05);
  root.add(pool);

  // ---- furniture ----
  // desk, right back
  addBox(furn, M.wood, 2.0, 0.78, -2.3, 1.55, 0.07, 0.72, 1);
  for (const [dx, dz] of [[-0.7, -0.28], [0.7, -0.28], [-0.7, 0.28], [0.7, 0.28]]) {
    addBox(furn, M.wood, 2.0 + dx, 0, -2.3 + dz, 0.07, 0.78, 0.07);
  }
  addBox(furn, M.wood, 2.0, 0.18, -2.62, 1.4, 0.5, 0.05);

  // swatch cards standing in a row
  for (let i = 0; i < 6; i++) {
    const mat = lam(`studioCard${i}`, () => ({ color: SWATCHES[i] }));
    addBox(furn, mat, 1.55 + i * 0.16, 0.85, -2.12, 0.12, 0.17, 0.02);
  }
  addCyl(furn, M.mug, 2.55, 0.85, -2.42, 0.07, 0.11, 18);
  jar(furn, M.glassBlue, M.lid, 1.42, 0.85, -2.5, 0.08, 0.17);
  addBox(furn, M.paper, 2.25, 0.85, -2.52, 0.3, 0.04, 0.22);

  // shelf, back wall right
  addBox(furn, M.wood, 2.7, 1.6, -3.02, 2.2, 0.06, 0.28, 1);
  addBox(furn, M.wood, 2.7, 2.2, -3.02, 2.2, 0.06, 0.28, 1);
  for (const x of [1.7, 3.7]) {
    addBox(furn, M.beam, x, 1.4, -3.1, 0.07, 0.22, 0.07);
    addBox(furn, M.beam, x, 2.0, -3.1, 0.07, 0.22, 0.07);
  }
  jar(furn, M.glassRed, M.lid, 2.0, 1.66, -3.0, 0.09, 0.2);
  jar(furn, M.glassAmber, M.lid, 2.3, 1.66, -3.0, 0.08, 0.16);
  jar(furn, M.glassBlue, M.lid, 2.58, 1.66, -3.0, 0.075, 0.13);
  bookStack(furn, [M.bookA, M.bookB, M.bookC], 3.15, 1.66, -3.0, 1.05);
  jar(furn, M.glassAmber, M.lid, 2.0, 2.26, -3.0, 0.08, 0.18);
  bookStack(furn, [M.bookB, M.bookC, M.bookA], 2.5, 2.26, -3.0, 0.95);
  plant(furn, M.terracotta, M.soil, M.leaf2, 3.35, 2.26, -3.0, 0.55);

  // swatch board: the hero's backdrop, back wall centre-left
  const board = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6), M.swatch);
  board.position.set(-1.5, 1.55, -3.13);
  root.add(board);
  addBox(shell, M.beam, -1.5, 0.72, -3.14, 2.52, 0.07, 0.07);
  addBox(shell, M.beam, -1.5, 2.38, -3.14, 2.52, 0.07, 0.07);
  addBox(shell, M.beam, -2.74, 0.72, -3.14, 0.07, 1.73, 0.07);
  addBox(shell, M.beam, -0.26, 0.72, -3.14, 0.07, 1.73, 0.07);

  // foreground plant: small, low and off to the left so it only adds a soft out-of-focus edge
  plant(furn, M.terracotta, M.soil, M.leaf, -1.75, 0, 1.45, 0.5);

  // a stool at the left edge, mid-ground
  addCyl(furn, M.wood, -1.55, 0.46, -0.5, 0.22, 0.06, 20);
  for (const [dx, dz] of [[-0.13, -0.13], [0.13, -0.13], [-0.13, 0.13], [0.13, 0.13]]) {
    addBox(furn, M.beam, -1.55 + dx, 0, -0.5 + dz, 0.035, 0.46, 0.035);
  }

  shell.build(root, false);
  furn.build(root, true);

  return { root, update: () => {} };
};
