// The habitat interior: a lived-in pressure dome under emergency light. Painted metal walls,
// deck plating, an O2 dial the camera can read, a dead CO2 scrubber, the greenhouse hatch,
// the suit bay, the frozen backup cryo pod and the comms screen. One set serves H1-H5, M9, P4.

import * as THREE from "three";
import { Batch, lam } from "../../../bridge/build";
import { ctex, rep } from "../../../bridge/paint";
import { addBlob, addBox, addCyl } from "../../props";
import type { SetHandle } from "../../types";
import { beam, glowCard, glowTex, pipe, screenTex } from "./shared";

const wallTex = () =>
  ctex("habWall", 1024, 1024, (g, r) => {
    const gr = g.createLinearGradient(0, 0, 0, 1024);
    gr.addColorStop(0, "#9a8b73");
    gr.addColorStop(0.55, "#857763");
    gr.addColorStop(1, "#6d6252");
    g.fillStyle = gr;
    g.fillRect(0, 0, 1024, 1024);
    // pressed panel seams
    for (let i = 0; i < 5; i++) {
      const x = 24 + i * 208;
      g.fillStyle = "rgba(42,36,30,0.22)";
      g.fillRect(x, 0, 4, 1024);
      g.fillStyle = "rgba(255,246,222,0.08)";
      g.fillRect(x + 4, 0, 2, 1024);
    }
    for (let i = 0; i < 4; i++) {
      const y = 120 + i * 246;
      g.fillStyle = "rgba(42,36,30,0.2)";
      g.fillRect(0, y, 1024, 4);
    }
    // rivets
    for (let y = 60; y < 1024; y += 82) {
      for (let x = 34; x < 1024; x += 104) {
        g.fillStyle = "rgba(255,248,228,0.16)";
        g.beginPath();
        g.arc(x, y, 3.2, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "rgba(38,32,26,0.3)";
        g.beginPath();
        g.arc(x + 1, y + 1.5, 2.2, 0, Math.PI * 2);
        g.fill();
      }
    }
    // scuffs and dust
    for (let i = 0; i < 900; i++) {
      g.fillStyle = r() < 0.5 ? `rgba(255,244,220,${0.01 + r() * 0.03})` : `rgba(40,30,22,${0.008 + r() * 0.025})`;
      g.fillRect(r() * 1024, r() * 1024, 2 + r() * 16, 1 + r() * 3);
    }
    // a faded mission stencil
    g.save();
    g.translate(512, 560);
    g.rotate(-0.04);
    g.font = "bold 86px sans-serif";
    g.textAlign = "center";
    g.fillStyle = "rgba(54,48,40,0.17)";
    g.fillText("ARES PRIME", 0, 0);
    g.font = "bold 30px monospace";
    g.fillText("HAB-01  //  DECK B", 0, 44);
    g.restore();
  });

const floorTex = () =>
  ctex("habFloor", 1024, 1024, (g, r) => {
    g.fillStyle = "#4b514d";
    g.fillRect(0, 0, 1024, 1024);
    const tile = 256;
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        g.fillStyle = (x + y) % 2 ? "#535a55" : "#474d49";
        g.fillRect(x * tile, y * tile, tile, tile);
        g.strokeStyle = "rgba(24,28,26,0.55)";
        g.lineWidth = 5;
        g.strokeRect(x * tile + 3, y * tile + 3, tile - 6, tile - 6);
        // diamond tread
        g.strokeStyle = "rgba(210,214,198,0.09)";
        g.lineWidth = 3;
        for (let k = 0; k < 7; k++) {
          g.beginPath();
          g.moveTo(x * tile + 18 + k * 34, y * tile + 22);
          g.lineTo(x * tile + 44 + k * 34, y * tile + 50);
          g.stroke();
        }
        g.fillStyle = "rgba(255,245,220,0.07)";
        g.beginPath();
        g.arc(x * tile + 20, y * tile + 20, 3, 0, Math.PI * 2);
        g.fill();
      }
    }
    for (let i = 0; i < 1800; i++) {
      g.fillStyle = `rgba(30,34,32,${0.01 + r() * 0.04})`;
      g.fillRect(r() * 1024, r() * 1024, 1 + r() * 12, 1 + r() * 2);
    }
  });

const ceilingTex = () =>
  ctex("habCeiling", 1024, 1024, (g, r) => {
    g.fillStyle = "#2c302e";
    g.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 7; i++) {
      g.fillStyle = i % 2 ? "#343a37" : "#292d2b";
      g.fillRect(0, i * 148, 1024, 140);
    }
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(210,220,210,${0.008 + r() * 0.02})`;
      g.fillRect(r() * 1024, r() * 1024, 2, 1);
    }
  });

const dialTex = () =>
  ctex("habO2Dial", 512, 512, (g) => {
    g.clearRect(0, 0, 512, 512);
    const gr = g.createRadialGradient(256, 236, 20, 256, 256, 248);
    gr.addColorStop(0, "#182326");
    gr.addColorStop(0.75, "#10181a");
    gr.addColorStop(1, "#080d0e");
    g.fillStyle = gr;
    g.beginPath();
    g.arc(256, 256, 248, 0, Math.PI * 2);
    g.fill();
    // red alarm arc
    g.strokeStyle = "#d9453a";
    g.lineWidth = 22;
    g.beginPath();
    g.arc(256, 256, 224, Math.PI * 0.72, Math.PI * 2.28);
    g.stroke();
    // ticks
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const long = i % 4 === 0;
      g.strokeStyle = long ? "rgba(248,232,198,0.92)" : "rgba(248,232,198,0.46)";
      g.lineWidth = long ? 6 : 3;
      g.beginPath();
      g.moveTo(256 + Math.cos(a) * (long ? 176 : 188), 256 + Math.sin(a) * (long ? 176 : 188));
      g.lineTo(256 + Math.cos(a) * 206, 256 + Math.sin(a) * 206);
      g.stroke();
    }
    g.textAlign = "center";
    g.fillStyle = "#e9d9b2";
    g.font = "bold 58px monospace";
    g.fillText("O2", 256, 150);
    g.fillStyle = "#ff8a62";
    g.font = "bold 108px monospace";
    g.fillText("02:00", 256, 300);
    g.fillStyle = "rgba(233,217,178,0.72)";
    g.font = "bold 30px monospace";
    g.fillText("LIFE SUPPORT", 256, 372);
    g.fillStyle = "rgba(255,120,80,0.9)";
    g.font = "bold 24px monospace";
    g.fillText("DECOMPRESSION RISK", 256, 410);
    // needle pointing into the red
    g.save();
    g.translate(256, 256);
    g.rotate(2.72);
    g.fillStyle = "#ff5533";
    g.beginPath();
    g.moveTo(-12, 0);
    g.lineTo(0, -190);
    g.lineTo(12, 0);
    g.closePath();
    g.fill();
    g.restore();
    g.fillStyle = "#c9a24a";
    g.beginPath();
    g.arc(256, 256, 15, 0, Math.PI * 2);
    g.fill();
  });

const marsWindow = () =>
  ctex("habMarsWindow", 512, 512, (g, r) => {
    const gr = g.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, "#c98a3a");
    gr.addColorStop(0.48, "#e0b86a");
    gr.addColorStop(0.55, "#8a4a24");
    gr.addColorStop(1, "#5a2c16");
    g.fillStyle = gr;
    g.fillRect(0, 0, 512, 512);
    // distant ridge
    g.fillStyle = "#6b3a1e";
    g.beginPath();
    g.moveTo(0, 300);
    for (let x = 0; x <= 512; x += 22) g.lineTo(x, 284 + Math.sin(x * 0.04) * 18 + r() * 8);
    g.lineTo(512, 512);
    g.lineTo(0, 512);
    g.closePath();
    g.fill();
    // dust haze
    for (let i = 0; i < 220; i++) {
      g.fillStyle = `rgba(255,214,150,${0.01 + r() * 0.05})`;
      g.fillRect(r() * 512, 180 + r() * 220, 8 + r() * 60, 2 + r() * 5);
    }
    // Earth, tiny and blue
    g.fillStyle = "rgba(120,190,255,0.2)";
    g.beginPath();
    g.arc(390, 116, 26, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#79c7ff";
    g.beginPath();
    g.arc(390, 116, 13, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#3f8f5a";
    g.beginPath();
    g.arc(386, 112, 5, 0, Math.PI * 2);
    g.fill();
    // glass reflection
    g.strokeStyle = "rgba(255,255,255,0.22)";
    g.lineWidth = 8;
    g.beginPath();
    g.arc(170, 200, 130, 3.5, 4.4);
    g.stroke();
  });

const scrubberTex = () =>
  screenTex("habScrubberScreen", "CO2 SCRUBBER", ["STATUS: FAILED", "BED A: FROZEN", "BED B: FROZEN", "OUTPUT: 0%"], "#ff6a4a");

const commsTex = () =>
  screenTex("habCommsScreen", "RESUPPLY WINDOW", ["EARTH LAUNCH: 6 WEEKS", "TRANSIT: 7 MONTHS", "PRIORITY: LIFE SUPPORT", "STATUS: HOLDING"], "#66cfff");

const cryoTex = () =>
  screenTex("habCryoScreen", "BACKUP CRYO", ["STATUS: FROZEN", "POWER: 0%", "REVIVE: MANUAL", "SEAL: INTACT"], "#8fc8ff");

const hatchSign = () =>
  ctex("habHatchSign", 512, 128, (g) => {
    g.fillStyle = "#16231c";
    g.fillRect(0, 0, 512, 128);
    g.strokeStyle = "#58c98a";
    g.lineWidth = 6;
    g.strokeRect(8, 8, 496, 112);
    g.fillStyle = "#8fe8b2";
    g.font = "bold 46px monospace";
    g.textAlign = "center";
    g.fillText("GREENHOUSE 04", 256, 80);
  });

const frostMat = () => lam("habFrost", () => ({ color: "#d8ecf2", transparent: true, opacity: 0.58 }));

export const buildHabitat = (): SetHandle => {
  const root = new THREE.Group();
  const shell = new Batch();
  const gear = new Batch();

  const M = {
    wall: lam("habWallMat", () => ({ map: rep(wallTex(), 2.2, 1.1), color: "#c9b79a" })),
    floor: lam("habFloorMat", () => ({ map: rep(floorTex(), 3, 3.2), color: "#b8beb4" })),
    ceiling: lam("habCeilingMat", () => ({ map: rep(ceilingTex(), 2, 2), color: "#8a9490" })),
    beam: lam("habBeam", () => ({ color: "#5a625e" })),
    beamHi: lam("habBeamHi", () => ({ color: "#7d8781" })),
    metal: lam("habMetal", () => ({ color: "#4b5559" })),
    dark: lam("habDarkMetal", () => ({ color: "#2c3436" })),
    brass: lam("habBrass", () => ({ color: "#b88b45" })),
    green: lam("habGreen", () => ({ color: "#3f8a5c", emissive: "#1d5a34", emissiveIntensity: 0.7 })),
    red: lam("habRed", () => ({ color: "#c9463a", emissive: "#8a1e16", emissiveIntensity: 1.2 })),
    orange: lam("habOrange", () => ({ color: "#c9662f" })),
    cream: lam("habCream", () => ({ color: "#d9cdb8" })),
    teal: lam("habTeal", () => ({ color: "#3f7a6a" })),
    glass: lam("habGlass", () => ({ color: "#9ed4de", transparent: true, opacity: 0.24 })),
    frost: frostMat(),
    paper: lam("habPaper", () => ({ color: "#e8dfc9" })),
  };

  // ---- shell ----
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(9.4, 10.6), M.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0.005, -0.1);
  floor.receiveShadow = true;
  root.add(floor);

  const back = new THREE.Mesh(new THREE.PlaneGeometry(9.4, 4.4), M.wall);
  back.position.set(0, 2.2, -5.15);
  back.receiveShadow = true;
  root.add(back);

  const left = new THREE.Mesh(new THREE.PlaneGeometry(10.6, 4.4), M.wall);
  left.rotation.y = Math.PI / 2;
  left.position.set(-4.7, 2.2, -0.1);
  left.receiveShadow = true;
  root.add(left);

  const right = new THREE.Mesh(new THREE.PlaneGeometry(10.6, 4.4), M.wall);
  right.rotation.y = -Math.PI / 2;
  right.position.set(4.7, 2.2, -0.1);
  right.receiveShadow = true;
  root.add(right);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(9.4, 10.6), M.ceiling);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, 4.32, -0.1);
  root.add(ceiling);

  // dome ribs + skirting + wall seams
  for (const z of [-4.9, -1.7, -0.1, 1.5, 3.1]) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(4.28, 0.075, 6, 40, Math.PI), M.beam);
    rib.position.set(0, 0, z);
    rib.castShadow = true;
    root.add(rib);
    addBox(shell, M.beam, 0, 0.02, z, 8.9, 0.08, 0.12);
  }
  addBox(shell, M.dark, 0, 0, -5.1, 9.4, 0.22, 0.2);
  addBox(shell, M.dark, -4.62, 0, -0.1, 0.2, 0.22, 10.6);
  addBox(shell, M.dark, 4.62, 0, -0.1, 0.2, 0.22, 10.6);

  // ceiling practicals: two warm strips and their painted spill
  for (const [x, z] of [[-1.5, -2.4], [1.6, -1.2]]) {
    addBox(gear, M.cream, x, 4.17, z, 1.5, 0.06, 0.22);
    addBox(gear, M.beam, x, 4.22, z, 1.65, 0.04, 0.32);
  }

  // ---- back wall: porthole, O2 dial, comms screen ----
  const port = new THREE.Mesh(new THREE.CircleGeometry(0.72, 40), new THREE.MeshBasicMaterial({ map: marsWindow(), color: new THREE.Color(1.12, 1.08, 1.0) }));
  port.position.set(-2.95, 2.85, -5.11);
  root.add(port);
  const portRing = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.075, 8, 40), M.beamHi);
  portRing.position.set(-2.95, 2.85, -5.06);
  root.add(portRing);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    addBox(gear, M.brass, -2.95 + Math.cos(a) * 0.78, 2.85 + Math.sin(a) * 0.78, -5.02, 0.07, 0.07, 0.06);
  }

  // O2 dial on a riveted backboard
  addBox(gear, M.dark, 0.95, 2.55, -5.13, 1.82, 1.82, 0.1);
  addBox(gear, M.beam, 0.95, 3.48, -5.06, 1.95, 0.08, 0.16);
  addBox(gear, M.beam, 0.95, 1.62, -5.06, 1.95, 0.08, 0.16);
  const dial = new THREE.Mesh(new THREE.CircleGeometry(0.72, 48), new THREE.MeshBasicMaterial({ map: dialTex(), color: new THREE.Color(1.18, 1.1, 1.02) }));
  dial.position.set(0.95, 2.55, -5.06);
  root.add(dial);
  const dialRing = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.085, 8, 48), M.beamHi);
  dialRing.position.set(0.95, 2.55, -5.01);
  root.add(dialRing);
  const dialGlow = glowCard(glowTex("habDialGlow", "255,86,54"), 0.95, 2.55, -5.02, 3.0, 0.28);
  root.add(dialGlow);

  // comms screen, left of the dial
  addBox(gear, M.dark, -2.95, 1.6, -5.14, 1.95, 1.28, 0.1);
  const comms = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.02), new THREE.MeshBasicMaterial({ map: commsTex(), color: new THREE.Color(1.2, 1.2, 1.2) }));
  comms.position.set(-2.95, 1.6, -5.07);
  root.add(comms);
  addBox(gear, M.beam, -2.95, 2.28, -5.04, 1.82, 0.05, 0.12);
  addBox(gear, M.beam, -2.95, 0.92, -5.04, 1.82, 0.05, 0.12);

  // pipes and cable runs across the back wall
  pipe(gear, M.beamHi, 2.2, 3.85, -5.0, 3.4, 0.055, "x");
  pipe(gear, M.brass, 2.2, 3.65, -4.98, 3.4, 0.035, "x");
  pipe(gear, M.beam, -4.25, 0.3, -4.5, 2.6, 0.07, "z");
  pipe(gear, M.beam, 4.2, 0.28, -4.4, 2.2, 0.06, "z");
  for (let i = 0; i < 5; i++) addBox(gear, M.beamHi, -4.25, 0.3, -5.0 + i * 0.4, 0.18, 0.18, 0.08);

  // ---- dead CO2 scrubber, back right ----
  addBox(gear, M.metal, 3.25, 0, -4.5, 1.18, 2.5, 0.78);
  addBox(gear, M.beam, 3.25, 2.5, -4.5, 1.28, 0.1, 0.88);
  addBox(gear, M.dark, 3.25, 0.05, -4.08, 0.95, 0.18, 0.12);
  const scrub = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.55), new THREE.MeshBasicMaterial({ map: scrubberTex(), color: new THREE.Color(1.15, 1.1, 1.05) }));
  scrub.position.set(3.25, 1.64, -4.09);
  root.add(scrub);
  for (let i = 0; i < 6; i++) addBox(gear, M.dark, 3.25, 0.42 + i * 0.13, -4.09, 0.72, 0.05, 0.06);
  pipe(gear, M.beamHi, 3.25, 2.5, -4.9, 1.2, 0.09);
  // clean insert: the failed readout is the whole shot
  const scrubLight = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 10), new THREE.MeshBasicMaterial({ color: "#ff5533" }));
  scrubLight.position.set(3.58, 1.96, -4.05);
  root.add(scrubLight);

  // ---- frozen backup cryo pod, left wall ----
  addBox(gear, M.dark, -4.34, 0, -3.35, 0.62, 0.24, 1.35);
  const cryo = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 2.25, 20), M.glass);
  cryo.position.set(-4.3, 1.32, -3.35);
  root.add(cryo);
  addCyl(gear, M.metal, -4.3, 0.12, -3.35, 0.46, 0.24, 20);
  addCyl(gear, M.metal, -4.3, 2.42, -3.35, 0.48, 0.22, 20);
  addCyl(gear, M.frost, -4.3, 0.38, -3.35, 0.34, 1.95, 18);
  addBlob(gear, M.frost, -3.95, 2.2, -3.35, 0.16, 0.22, 0.1);
  // angled cryo readout beside the pod, turned toward the room so H5 can read it head-on
  const panelGroup = new THREE.Group();
  panelGroup.position.set(-4.25, 1.72, -2.55);
  panelGroup.rotation.y = Math.PI / 2 - 0.6;
  const cryoBack = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.88, 0.1), M.dark);
  cryoBack.position.set(0, 0, -0.03);
  panelGroup.add(cryoBack);
  const cryoPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 0.68),
    new THREE.MeshBasicMaterial({ map: cryoTex(), color: new THREE.Color(1.1, 1.14, 1.2) }),
  );
  cryoPanel.position.set(0, 0, 0.04);
  panelGroup.add(cryoPanel);
  for (const y of [-0.41, 0.41]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.07, 0.12), M.beam);
    bar.position.set(0, y, 0.03);
    panelGroup.add(bar);
  }
  root.add(panelGroup);

  // ---- greenhouse hatch, left wall forward ----
  const hatch = new THREE.Mesh(new THREE.CircleGeometry(0.82, 40), M.dark);
  hatch.rotation.y = Math.PI / 2;
  hatch.position.set(-4.67, 1.42, -0.55);
  root.add(hatch);
  const hatchRing = new THREE.Mesh(new THREE.TorusGeometry(0.87, 0.08, 8, 40), M.green);
  hatchRing.rotation.y = Math.PI / 2;
  hatchRing.position.set(-4.65, 1.42, -0.55);
  root.add(hatchRing);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    addBox(gear, M.brass, -4.63, 1.42 + Math.sin(a) * 0.84, -0.55 + Math.cos(a) * 0.84, 0.08, 0.07, 0.07);
  }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 0.34), new THREE.MeshBasicMaterial({ map: hatchSign(), color: new THREE.Color(1.15, 1.2, 1.15) }));
  sign.rotation.y = Math.PI / 2;
  sign.position.set(-4.67, 2.45, -0.55);
  root.add(sign);

  // ---- suit bay, right wall ----
  pipe(gear, M.beamHi, 4.34, 2.28, -2.2, 3.2, 0.055, "z");
  for (let i = 0; i < 3; i++) {
    const z = -3.25 + i * 0.98;
    const suit = [M.orange, M.cream, M.teal][i];
    addCyl(gear, suit, 4.24, 0.66, z, 0.3, 0.96, 14);
    addBlob(gear, suit, 4.24, 1.84, z, 0.27, 0.29, 0.27);
    addBox(gear, M.dark, 4.12, 0.12, z - 0.13, 0.18, 0.22, 0.16);
    addBox(gear, M.dark, 4.12, 0.12, z + 0.13, 0.18, 0.22, 0.16);
    addBox(gear, M.glass, 4.0, 1.9, z, 0.04, 0.22, 0.2);
    addBox(gear, M.cream, 4.0, 1.2, z, 0.05, 0.24, 0.2);
    addBox(gear, M.dark, 4.01, 1.28, z, 0.04, 0.07, 0.1);
    addBox(gear, M.red, 4.01, 1.13, z + 0.06, 0.04, 0.04, 0.04);
    addBox(gear, M.beam, 4.24, 2.28, z, 0.08, 0.12, 0.08);
  }
  addBox(gear, M.dark, 4.48, 0, -2.2, 0.16, 0.3, 3.3);
  const bayLight = glowCard(glowTex("habBayGlow", "255,196,120"), 4.02, 2.1, -2.2, 2.0, 0.22);
  bayLight.rotation.y = -Math.PI / 2;
  root.add(bayLight);

  // ---- work table and crates: left-back and foreground, clear of the hero mark ----
  addBox(gear, M.beam, -2.5, 0.74, -2.75, 1.5, 0.08, 0.7);
  for (const [dx, dz] of [[-0.62, -0.24], [0.62, -0.24], [-0.62, 0.24], [0.62, 0.24]]) addBox(gear, M.beam, -2.5 + dx, 0, -2.75 + dz, 0.07, 0.74, 0.07);
  addBox(gear, M.paper, -2.88, 0.82, -2.75, 0.32, 0.03, 0.24);
  addBox(gear, M.orange, -2.35, 0.82, -2.73, 0.18, 0.12, 0.2);
  addCyl(gear, M.brass, -2.02, 0.82, -2.71, 0.07, 0.12, 16);
  addBox(gear, M.metal, 2.15, 0, 1.1, 0.75, 0.7, 0.75);
  addBox(gear, M.metal, 2.15, 0.7, 1.1, 0.65, 0.08, 0.65);
  addBox(gear, M.dark, -1.6, 0, 1.8, 0.7, 0.55, 0.55);
  addBox(gear, M.orange, -1.6, 0.55, 1.8, 0.62, 0.05, 0.5);

  // floor cable runs
  pipe(gear, M.dark, 2.55, 0.08, -3.3, 2.0, 0.045, "z");
  pipe(gear, M.dark, 1.2, 0.08, -3.3, 1.6, 0.04, "x");

  // ceiling alarm beacon + its glow
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), new THREE.MeshBasicMaterial({ color: "#ff5533" }));
  beacon.position.set(-0.4, 4.04, -2.4);
  root.add(beacon);
  const beaconGlow = glowCard(glowTex("habBeaconGlow", "255,70,40"), -0.4, 3.96, -2.4, 1.7, 0.5);
  beaconGlow.rotation.x = -Math.PI / 2;
  root.add(beaconGlow);

  shell.build(root, false);
  gear.build(root, true);

  return {
    root,
    update: (t: number) => {
      const pulse = 0.5 + 0.5 * Math.sin(t * 5.4);
      (dialGlow.material as THREE.MeshBasicMaterial).opacity = 0.12 + 0.2 * pulse;
      (beaconGlow.material as THREE.MeshBasicMaterial).opacity = 0.25 + 0.45 * pulse;
      (beacon.material as THREE.MeshBasicMaterial).color.setRGB(0.7 + 0.3 * pulse, 0.12 + 0.1 * pulse, 0.08);
      (scrubLight.material as THREE.MeshBasicMaterial).color.setRGB(0.7 + 0.3 * pulse, 0.1, 0.08);
    },
  };
};
