// The scan room: a dark lab with one tall portrait monitor showing a painted brain scan.
// Two variants: "scan" (one brain, colour and sound regions firing together) and
// "scan2" (two subjects, the same three notes over both heads).

import * as THREE from "three";
import { Batch, lam } from "../../bridge/build";
import { ctex } from "../../bridge/paint";
import { addBox, addCyl } from "../props";
import type { SetHandle } from "../types";

const W = 800;
const H = 960;

/** soft painted glow: the alpha comes from the colour string, so pass "rgba(r,g,b,1)" */
const glow = (g: CanvasRenderingContext2D, x: number, y: number, r: number, col: string) => {
  const gr = g.createRadialGradient(x, y, 2, x, y, r);
  gr.addColorStop(0, col);
  gr.addColorStop(0.45, col.replace("1)", "0.45)"));
  gr.addColorStop(1, col.replace("1)", "0)"));
  g.fillStyle = gr;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
};

const brain = (g: CanvasRenderingContext2D, cx: number, cy: number, s: number) => {
  g.save();
  g.translate(cx, cy);
  g.scale(s, s);
  // two lobes
  g.strokeStyle = "#8fd0e8";
  g.lineWidth = 5;
  g.fillStyle = "rgba(28,52,80,0.62)";
  g.beginPath();
  g.moveTo(0, -95);
  g.bezierCurveTo(-95, -100, -130, -20, -105, 45);
  g.bezierCurveTo(-90, 88, -30, 105, 0, 92);
  g.bezierCurveTo(30, 105, 90, 88, 105, 45);
  g.bezierCurveTo(130, -20, 95, -100, 0, -95);
  g.closePath();
  g.fill();
  g.stroke();
  // folds
  g.lineWidth = 3;
  g.strokeStyle = "rgba(143,208,232,0.5)";
  for (let i = 0; i < 7; i++) {
    const y = -60 + i * 22;
    g.beginPath();
    g.moveTo(-95 + (i % 2) * 18, y);
    g.quadraticCurveTo(-30, y - 16, 0, y + 4);
    g.quadraticCurveTo(40, y + 18, 96 - (i % 2) * 16, y - 6);
    g.stroke();
  }
  // the two firing regions: visual (back/left) and auditory (front/right)
  glow(g, -46, -8, 62, "rgba(255,96,72,1)");
  glow(g, 48, 30, 58, "rgba(96,140,255,1)");
  // the cross-wiring between them
  g.strokeStyle = "rgba(255,236,150,0.9)";
  g.lineWidth = 4;
  g.setLineDash([9, 7]);
  g.beginPath();
  g.moveTo(-46, -8);
  g.quadraticCurveTo(0, -42, 48, 30);
  g.stroke();
  g.setLineDash([]);
  g.restore();
};

const grid = (g: CanvasRenderingContext2D) => {
  g.strokeStyle = "rgba(78,124,176,0.14)";
  g.lineWidth = 2;
  for (let x = 0; x <= W; x += 40) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, H);
    g.stroke();
  }
  for (let y = 0; y <= H; y += 40) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(W, y);
    g.stroke();
  }
};

const header = (g: CanvasRenderingContext2D, left: string, right: string) => {
  g.fillStyle = "rgba(10,22,38,0.92)";
  g.fillRect(0, 0, W, 74);
  g.fillStyle = "#e8c95a";
  g.fillRect(0, 72, W, 2);
  g.font = "bold 26px monospace";
  g.fillStyle = "#ffe9a8";
  g.fillText(left, 26, 46);
  g.font = "20px monospace";
  g.fillStyle = "rgba(180,214,240,0.72)";
  g.textAlign = "right";
  g.fillText(right, W - 26, 46);
  g.textAlign = "left";
};

const readout = (g: CanvasRenderingContext2D, text: string) => {
  g.fillStyle = "rgba(10,22,38,0.92)";
  g.fillRect(0, H - 58, W, 58);
  g.fillStyle = "#e8c95a";
  g.fillRect(0, H - 60, W, 2);
  g.font = "bold 24px monospace";
  g.fillStyle = "#ffe9a8";
  g.textAlign = "center";
  g.fillText(text, W / 2, H - 22);
  g.textAlign = "left";
};

/** a thin leader line from a region out to a label */
const leader = (g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, text: string, align: "left" | "right") => {
  g.strokeStyle = "rgba(255,236,150,0.65)";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  g.stroke();
  g.fillStyle = "rgba(255,240,205,0.9)";
  g.font = "bold 20px monospace";
  g.textAlign = align;
  g.fillText(text, x1 + (align === "left" ? 8 : -8), y1 + 7);
  g.textAlign = "left";
};

const screen = (variant: 1 | 2) =>
  ctex(`scanScreen${variant}`, W, H, (g, r) => {
    g.fillStyle = "#0b1422";
    g.fillRect(0, 0, W, H);
    grid(g);

    if (variant === 1) {
      header(g, "fMRI // LIVE", "SYNESTHESIA STUDY 04");
      // the brain, centred in the tall frame
      brain(g, W / 2, 424, 1.5);
      leader(g, W / 2 - 96, 400, 132, 300, "VISUAL", "right");
      leader(g, W / 2 + 104, 470, W - 132, 556, "AUDITORY", "left");
      // waveform along the bottom of the scan window
      g.strokeStyle = "#e8c95a";
      g.lineWidth = 4;
      g.beginPath();
      for (let x = 40; x < W - 40; x += 3) {
        const y = 748 + Math.sin(x * 0.05) * 26 * Math.sin(x * 0.011) + (r() - 0.5) * 9;
        if (x === 40) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
      g.strokeStyle = "rgba(143,208,232,0.28)";
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(40, 748);
      g.lineTo(W - 40, 748);
      g.stroke();
      readout(g, "RED \u2192 C4    BLUE \u2192 G2    YELLOW \u2192 A5");
    } else {
      header(g, "SUBJECT A // SUBJECT B", "SAME NOTES");
      // two brains side by side, each with the same three notes above it
      for (const cx of [232, 568]) {
        brain(g, cx, 470, 0.78);
        for (let i = 0; i < 3; i++) {
          const nx = cx - 44 + i * 44;
          const ny = 288 + (i % 2) * 18;
          g.fillStyle = "#ffe9a8";
          g.beginPath();
          g.ellipse(nx, ny + 20, 10, 8, -0.3, 0, Math.PI * 2);
          g.fill();
          g.fillRect(nx + 8, ny - 26, 3, 46);
        }
      }
      // the divider
      g.strokeStyle = "rgba(255,255,255,0.22)";
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(W / 2, 120);
      g.lineTo(W / 2, 790);
      g.stroke();
      g.fillStyle = "rgba(255,240,205,0.9)";
      g.font = "bold 22px monospace";
      g.textAlign = "center";
      g.fillText("SUBJECT A", 232, 726);
      g.fillText("SUBJECT B", 568, 726);
      g.textAlign = "left";
      readout(g, "SAME THREE NOTES, DIFFERENT PEOPLE");
    }
  });

/** a soft painted wall: dark panels with faint seams, so the lab does not read flat */
const wallTex = () =>
  ctex("scanWallTex", 1024, 1024, (g, r) => {
    const gr = g.createLinearGradient(0, 0, 0, 1024);
    gr.addColorStop(0, "#131a2c");
    gr.addColorStop(0.6, "#1a2238");
    gr.addColorStop(1, "#0e1424");
    g.fillStyle = gr;
    g.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 5; i++) {
      g.fillStyle = "rgba(255,255,255,0.02)";
      g.fillRect(0, i * 205 + 4, 1024, 3);
    }
    for (let i = 0; i < 2400; i++) {
      g.fillStyle = `rgba(180,210,255,${0.008 + r() * 0.02})`;
      g.fillRect(r() * 1024, r() * 1024, 2, 1);
    }
  });

export const buildScan = (variant: 1 | 2): SetHandle => {
  const root = new THREE.Group();
  const M = {
    wall: lam("scanWall", () => ({ map: wallTex() })),
    floor: lam("scanFloor", () => ({ color: "#161c2e" })),
    beam: lam("scanBeam", () => ({ color: "#39435e" })),
    metal: lam("scanMetal", () => ({ color: "#2a3350" })),
    lightA: lam("scanLightA", () => ({ color: "#d9453a" })),
    lightB: lam("scanLightB", () => ({ color: "#3f8ad9" })),
  };

  const wall = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), M.wall);
  wall.position.set(0, 3.2, -3.42);
  wall.receiveShadow = true;
  root.add(wall);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), M.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 1.6);
  floor.receiveShadow = true;
  root.add(floor);

  const b = new Batch();

  // the monitor: a slim portrait bezel on a column stand
  addBox(b, M.beam, 0, 0.18, -2.92, 2.26, 2.74, 0.14);
  addCyl(b, M.metal, 0, 0, -2.99, 0.1, 0.22, 16);
  addBox(b, M.metal, 0, 0, -2.99, 0.9, 0.06, 0.5);
  addBox(b, M.metal, 0, 0.18, -2.99, 0.18, 0.02, 0.16);

  // two tall light strips on the wall, one red one blue: the two firing regions, in the room
  addBox(b, M.lightA, -1.95, 0.5, -3.36, 0.06, 2.5, 0.04);
  addBox(b, M.lightB, 1.95, 0.5, -3.36, 0.06, 2.5, 0.04);

  // a small equipment rack at the left edge, mostly silhouette
  addBox(b, M.metal, -2.7, 0, -2.4, 0.62, 1.15, 0.55);
  addBox(b, M.beam, -2.7, 1.15, -2.4, 0.66, 0.06, 0.6);
  for (let i = 0; i < 4; i++) addBox(b, M.lightB, -2.7, 0.18 + i * 0.24, -2.12, 0.34, 0.03, 0.02);
  b.build(root, true);

  // the screen itself: a tall portrait image, slightly over-bright so it reads as a light source
  const scr = new THREE.Mesh(
    new THREE.PlaneGeometry(2.06, 2.5),
    new THREE.MeshBasicMaterial({ map: screen(variant), color: new THREE.Color(1.18, 1.18, 1.18) }),
  );
  scr.position.set(0, 1.55, -2.84);
  root.add(scr);

  // the halo around the monitor, painted into the wall
  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(5.2, 6.0),
    new THREE.MeshBasicMaterial({
      map: ctex(`scanHalo${variant}`, 512, 512, (g) => {
        const gr = g.createRadialGradient(256, 256, 40, 256, 256, 256);
        gr.addColorStop(0, "rgba(120,170,230,0.34)");
        gr.addColorStop(0.55, "rgba(90,130,200,0.12)");
        gr.addColorStop(1, "rgba(90,130,200,0)");
        g.fillStyle = gr;
        g.fillRect(0, 0, 512, 512);
      }),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.9,
      fog: false,
    }),
  );
  halo.position.set(0, 1.55, -3.0);
  root.add(halo);

  // screen light spilling onto the floor
  const spill = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 2.4),
    new THREE.MeshBasicMaterial({
      map: ctex("scanSpill", 512, 512, (g) => {
        const gr = g.createRadialGradient(256, 180, 20, 256, 256, 300);
        gr.addColorStop(0, "rgba(110,170,235,0.3)");
        gr.addColorStop(0.6, "rgba(90,140,210,0.08)");
        gr.addColorStop(1, "rgba(90,140,210,0)");
        g.fillStyle = gr;
        g.fillRect(0, 0, 512, 512);
      }),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.75,
      fog: false,
    }),
  );
  spill.rotation.x = -Math.PI / 2;
  spill.position.set(0, 0.012, -1.5);
  root.add(spill);

  return { root, update: () => {} };
};
