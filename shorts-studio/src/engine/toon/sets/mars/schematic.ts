// The power board: a dark control bay with one physical battery and five labelled loads.
// P1 is the wide read, P2 lights the branches in sequence, P3 kills four of them. The set's
// update(t, phase) is the only thing that changes: 0 = cell only, 1 = sequence, 2 = all dead.
//
// The board is portrait (3.0 x 3.6 m) on purpose: a Shorts frame is 9:16, so a landscape
// five-across schematic would lose its outer labels. Loads sit two-left, two-right, one-below.

import * as THREE from "three";
import { Batch, lam } from "../../../bridge/build";
import { ctex, rep } from "../../../bridge/paint";
import { addBox, addCyl } from "../../props";
import type { SetHandle } from "../../types";
import { glowCard, glowTex, pipe } from "./shared";

const BOARD_W = 3.0;
const BOARD_H = 3.6;
const BOARD_Y = 2.05;
const BOARD_Z = -3.28;

/** board pixel -> world, shared by the painted texture and the animated lamps */
const wx = (px: number) => (px / 768 - 0.5) * BOARD_W;
const wy = (py: number) => BOARD_Y + (0.5 - py / 1024) * BOARD_H;

const LOADS = [
  { name: "ROVER", sub: "MOTORS", px: 150, py: 300 },
  { name: "GREENHOUSE", sub: "SEALS", px: 150, py: 560 },
  { name: "SUIT HEAT", sub: "CREW", px: 618, py: 300 },
  { name: "COMMS", sub: "ARRAY", px: 618, py: 560 },
  { name: "HABITAT", sub: "LIFE SUPPORT", px: 384, py: 700 },
].map((l) => ({ ...l, x: wx(l.px), y: wy(l.py) }));

const boardTex = () =>
  ctex("schematicPowerBoard", 768, 1024, (g, r) => {
    g.fillStyle = "#08141a";
    g.fillRect(0, 0, 768, 1024);
    // technical grid
    g.strokeStyle = "rgba(80,180,190,0.12)";
    g.lineWidth = 1;
    for (let x = 0; x < 768; x += 32) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, 1024);
      g.stroke();
    }
    for (let y = 0; y < 1024; y += 32) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(768, y);
      g.stroke();
    }
    // header
    g.fillStyle = "#9fe8e8";
    g.font = "bold 34px monospace";
    g.textAlign = "left";
    g.fillText("POWER GRID", 40, 66);
    g.fillStyle = "rgba(159,232,232,0.55)";
    g.font = "20px monospace";
    g.fillText("ARES PRIME // EMERGENCY BUS", 40, 98);
    g.strokeStyle = "rgba(159,232,232,0.5)";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(40, 116);
    g.lineTo(728, 116);
    g.stroke();

    // central battery
    g.strokeStyle = "#ffd06a";
    g.lineWidth = 8;
    g.strokeRect(309, 442, 150, 140);
    g.fillStyle = "#ffd06a";
    g.fillRect(350, 426, 68, 18);
    g.font = "bold 88px monospace";
    g.textAlign = "center";
    g.fillText("1", 384, 538);
    g.font = "bold 24px monospace";
    g.fillText("CELL", 384, 568);
    g.fillStyle = "rgba(255,208,106,0.7)";
    g.font = "20px monospace";
    g.fillText("1 OF 5 AVAILABLE", 384, 616);

    // branch lines from the cell to each painted socket
    for (const l of LOADS) {
      const n = { x: l.px, y: l.py };
      g.strokeStyle = "rgba(80,200,210,0.42)";
      g.lineWidth = 6;
      g.beginPath();
      g.moveTo(384, 512);
      if (l.py > 700) {
        g.lineTo(384, n.y - 46);
        g.lineTo(n.x, n.y - 46);
        g.lineTo(n.x, n.y);
      } else {
        g.lineTo(384, n.y);
        g.lineTo(n.x, n.y);
      }
      g.stroke();
      g.fillStyle = "#0b2028";
      g.strokeStyle = "#5ad0d8";
      g.lineWidth = 5;
      g.beginPath();
      g.arc(n.x, n.y, 46, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.fillStyle = "rgba(159,232,232,0.9)";
      g.font = "bold 30px monospace";
      g.textAlign = "center";
      g.fillText(l.name, n.x, n.y + 78);
      g.fillStyle = "rgba(159,232,232,0.5)";
      g.font = "20px monospace";
      g.fillText(l.sub, n.x, n.y + 104);
    }

    // footer warning
    g.fillStyle = "#c9563f";
    g.fillRect(36, 948, 696, 46);
    g.fillStyle = "#ffe8d2";
    g.font = "bold 24px monospace";
    g.textAlign = "center";
    g.fillText("ONE CELL. FIVE LOADS. CHOOSE.", 384, 979);

    // dust / scratches so it reads painted, not a clean vector
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(160,230,230,${0.01 + r() * 0.03})`;
      g.fillRect(r() * 768, r() * 1024, 1 + r() * 10, 1);
    }
  });

const wallTex = () =>
  ctex("schematicWall", 1024, 1024, (g, r) => {
    const gr = g.createLinearGradient(0, 0, 0, 1024);
    gr.addColorStop(0, "#101a24");
    gr.addColorStop(0.6, "#0c141c");
    gr.addColorStop(1, "#070c10");
    g.fillStyle = gr;
    g.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 6; i++) {
      g.fillStyle = "rgba(90,180,200,0.035)";
      g.fillRect(0, 80 + i * 160, 1024, 3);
    }
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = `rgba(120,210,220,${0.006 + r() * 0.018})`;
      g.fillRect(r() * 1024, r() * 1024, 2, 1);
    }
  });

const floorTex = () =>
  ctex("schematicFloor", 1024, 1024, (g, r) => {
    g.fillStyle = "#101820";
    g.fillRect(0, 0, 1024, 1024);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        g.strokeStyle = "rgba(80,170,190,0.14)";
        g.lineWidth = 3;
        g.strokeRect(x * 256 + 4, y * 256 + 4, 248, 248);
      }
    }
    for (let i = 0; i < 1600; i++) {
      g.fillStyle = `rgba(120,210,220,${0.006 + r() * 0.02})`;
      g.fillRect(r() * 1024, r() * 1024, 1 + r() * 8, 1);
    }
  });

export const buildSchematic = (): SetHandle => {
  const root = new THREE.Group();
  const b = new Batch();

  const M = {
    wall: lam("schematicWallMat", () => ({ map: rep(wallTex(), 2, 1), color: "#9ab8c0" })),
    floor: lam("schematicFloorMat", () => ({ map: rep(floorTex(), 3, 3), color: "#9ab8c0" })),
    frame: lam("schematicFrame", () => ({ color: "#31434a" })),
    frameHi: lam("schematicFrameHi", () => ({ color: "#557a82" })),
    dark: lam("schematicDark", () => ({ color: "#16242a" })),
    screen: lam("schematicScreen", () => ({ map: boardTex(), color: "#c8f8f8" })),
    brass: lam("schematicBrass", () => ({ color: "#b89a54" })),
    red: lam("schematicRed", () => ({ color: "#c9463a", emissive: "#6a1610", emissiveIntensity: 0.9 })),
    cyan: lam("schematicCyan", () => ({ color: "#5ad0d8", emissive: "#1d7a82", emissiveIntensity: 0.8 })),
  };

  // room shell
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(11, 11), M.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.01;
  floor.receiveShadow = true;
  root.add(floor);

  const back = new THREE.Mesh(new THREE.PlaneGeometry(11, 4.6), M.wall);
  back.position.set(0, 2.3, -4.5);
  back.receiveShadow = true;
  root.add(back);

  const left = new THREE.Mesh(new THREE.PlaneGeometry(11, 4.6), M.wall);
  left.rotation.y = Math.PI / 2;
  left.position.set(-5.4, 2.3, 0);
  left.receiveShadow = true;
  root.add(left);

  const right = new THREE.Mesh(new THREE.PlaneGeometry(11, 4.6), M.wall);
  right.rotation.y = -Math.PI / 2;
  right.position.set(5.4, 2.3, 0);
  right.receiveShadow = true;
  root.add(right);

  // physical portrait board: frame, screen, side supports, warning bar
  addBox(b, M.frame, 0, 0.12, -3.42, 3.5, 4.04, 0.24);
  addBox(b, M.frameHi, 0, 0.04, -3.3, 3.72, 0.12, 0.3);
  addBox(b, M.frameHi, 0, 4.1, -3.3, 3.72, 0.12, 0.3);
  addBox(b, M.frame, -1.72, 0, -3.28, 0.18, 4.2, 0.4);
  addBox(b, M.frame, 1.72, 0, -3.28, 0.18, 4.2, 0.4);
  for (const x of [-1.6, 1.6]) addBox(b, M.dark, x, 0, -2.6, 0.2, 3.2, 0.6);
  addBox(b, M.dark, 0, 4.16, -3.1, 3.62, 0.18, 0.55);

  const screen = new THREE.Mesh(new THREE.PlaneGeometry(BOARD_W, BOARD_H), M.screen);
  screen.position.set(0, BOARD_Y, BOARD_Z);
  root.add(screen);

  // console desk below the board
  addBox(b, M.frame, 0, 0, -1.95, 3.4, 0.86, 0.9);
  addBox(b, M.frameHi, 0, 0.86, -1.95, 3.6, 0.09, 1.0);
  addBox(b, M.dark, 0, 0.95, -2.02, 1.8, 0.05, 0.6);
  for (let i = 0; i < 12; i++) addBox(b, M.cyan, -0.8 + (i % 6) * 0.32, 0.97, -2.02 + Math.floor(i / 6) * 0.16, 0.18, 0.02, 0.08);
  addBox(b, M.red, 1.2, 0.97, -2.02, 0.16, 0.04, 0.12);
  addBox(b, M.brass, -1.2, 0.97, -2.02, 0.16, 0.04, 0.12);

  // overhead lamp strips and a red beacon
  for (const x of [-1.1, 1.1]) {
    addBox(b, M.frame, x, 4.25, -0.8, 1.5, 0.06, 0.22);
    addBox(b, M.cyan, x, 4.19, -0.8, 1.3, 0.03, 0.12);
  }
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.03, 14, 10), new THREE.MeshBasicMaterial({ color: "#ff5533" }));
  beacon.position.set(0, 4.05, -2.8);
  root.add(beacon);

  // pipes and cable bundles along the back wall
  pipe(b, M.frameHi, -4.8, 3.1, -4.2, 4.2, 0.06, "x");
  pipe(b, M.frameHi, 4.8, 3.3, -4.2, 4.0, 0.05, "x");
  pipe(b, M.dark, 0, 0.2, -3.9, 3.4, 0.07, "x");
  for (let i = 0; i < 7; i++) addBox(b, M.frameHi, -3.4 + i * 1.1, 0.2, -3.9, 0.1, 0.2, 0.2);

  b.build(root, true);

  // five animated branch lamps in front of the painted sockets
  const lampMats: THREE.MeshBasicMaterial[] = [];
  for (const l of LOADS) {
    const mat = new THREE.MeshBasicMaterial({ color: "#14343a" });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 10), mat);
    lamp.position.set(l.x, l.y, -3.18);
    root.add(lamp);
    lampMats.push(mat);
  }
  const cellLamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), new THREE.MeshBasicMaterial({ color: "#ffd06a" }));
  cellLamp.position.set(0, BOARD_Y, -3.18);
  root.add(cellLamp);

  return {
    root,
    update: (t: number, phase = 0) => {
      const pulse = 0.5 + 0.5 * Math.sin(t * 5.0);
      (cellLamp.material as THREE.MeshBasicMaterial).color.setRGB(0.85 + 0.15 * pulse, 0.62 + 0.12 * pulse, 0.18);
      (beacon.material as THREE.MeshBasicMaterial).color.setRGB(0.7 + 0.3 * pulse, 0.1, 0.08);
      for (let i = 0; i < lampMats.length; i++) {
        let on = 0;
        if (phase === 0) on = 0;
        else if (phase === 1) on = t >= 0.18 + i * 0.32 ? 1 : 0;
        else if (phase === 2) {
          const die = Math.max(0, 1 - t * 0.75 - i * 0.12);
          on = die * (0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 18 + i)));
        }
        const c = lampMats[i];
        if (on > 0.05) c.color.setRGB(0.1 + 0.25 * on, 0.65 + 0.35 * on, 0.7 + 0.3 * on);
        else c.color.setRGB(0.06, 0.16, 0.18);
      }
    },
  };
};
