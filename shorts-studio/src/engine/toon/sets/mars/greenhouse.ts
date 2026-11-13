// The greenhouse: a glass dome of raised beds and two algae bioreactors. M3 is Chen at the
// locking ring; M4 is the macro pass on the tanks, where the oxygen actually comes from.

import * as THREE from "three";
import { Batch, lam } from "../../../bridge/build";
import { ctex, rep } from "../../../bridge/paint";
import { addBlob, addBox, addCyl, plant } from "../../props";
import type { SetHandle } from "../../types";
import { beam, glowCard, glowTex, pipe, screenTex } from "./shared";

const soilTex = () =>
  ctex("greenhouseSoil", 1024, 1024, (g, r) => {
    g.fillStyle = "#3c3022";
    g.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 1800; i++) {
      const x = r() * 1024, y = r() * 1024, s = 2 + r() * 14;
      g.fillStyle = r() < 0.5 ? `rgba(92,72,46,${0.06 + r() * 0.16})` : `rgba(28,22,16,${0.04 + r() * 0.12})`;
      g.beginPath();
      g.ellipse(x, y, s, s * 0.5, r() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
    // planting rows
    for (let i = 0; i < 6; i++) {
      g.fillStyle = "rgba(120,96,58,0.2)";
      g.fillRect(0, 90 + i * 160, 1024, 5);
      g.fillStyle = "rgba(20,16,10,0.18)";
      g.fillRect(0, 98 + i * 160, 1024, 8);
    }
  });

const floorTex = () =>
  ctex("greenhouseFloor", 1024, 1024, (g, r) => {
    g.fillStyle = "#4a5040";
    g.fillRect(0, 0, 1024, 1024);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        g.fillStyle = (x + y) % 2 ? "#505848" : "#454c3d";
        g.fillRect(x * 256, y * 256, 254, 254);
        g.strokeStyle = "rgba(22,26,20,0.5)";
        g.lineWidth = 4;
        g.strokeRect(x * 256 + 2, y * 256 + 2, 252, 252);
      }
    }
    for (let i = 0; i < 1500; i++) {
      g.fillStyle = `rgba(180,200,160,${0.008 + r() * 0.025})`;
      g.fillRect(r() * 1024, r() * 1024, 2, 1);
    }
    // wet green run-off
    for (let i = 0; i < 18; i++) {
      g.fillStyle = `rgba(40,110,64,${0.04 + r() * 0.08})`;
      g.beginPath();
      g.ellipse(r() * 1024, r() * 1024, 20 + r() * 70, 5 + r() * 14, r() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
  });

const algaeTex = () =>
  ctex("greenhouseAlgaeLiquid", 512, 512, (g, r) => {
    const gr = g.createRadialGradient(256, 220, 10, 256, 256, 280);
    gr.addColorStop(0, "#8affb0");
    gr.addColorStop(0.4, "#35d67a");
    gr.addColorStop(0.78, "#159a52");
    gr.addColorStop(1, "#0a4a2a");
    g.fillStyle = gr;
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 260; i++) {
      g.fillStyle = r() < 0.5 ? `rgba(220,255,190,${0.04 + r() * 0.16})` : `rgba(4,60,30,${0.05 + r() * 0.14})`;
      g.beginPath();
      g.ellipse(r() * 512, r() * 512, 2 + r() * 14, 2 + r() * 7, r() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
  });

const glintTex = () =>
  ctex("greenhouseGlint", 64, 256, (g) => {
    const gx = g.createLinearGradient(0, 0, 64, 0);
    gx.addColorStop(0, "rgba(234,255,242,0)");
    gx.addColorStop(0.45, "rgba(234,255,242,0.55)");
    gx.addColorStop(0.55, "rgba(234,255,242,0.75)");
    gx.addColorStop(1, "rgba(234,255,242,0)");
    g.fillStyle = gx;
    g.fillRect(0, 0, 64, 256);
    g.globalCompositeOperation = "destination-in";
    const gy = g.createLinearGradient(0, 0, 0, 256);
    gy.addColorStop(0, "rgba(0,0,0,0)");
    gy.addColorStop(0.12, "rgba(0,0,0,1)");
    gy.addColorStop(0.88, "rgba(0,0,0,1)");
    gy.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gy;
    g.fillRect(0, 0, 64, 256);
  });

const o2Screen = () =>
  screenTex("greenhouseO2Screen", "O2 BIOREACTOR", ["ALGAE: ACTIVE", "OUTPUT: +18%", "TANKS: 2 / 2", "SEAL: HOLDING"], "#66e89a");

const hatchSign = () =>
  ctex("greenhouseHatchSign", 512, 128, (g) => {
    g.fillStyle = "#14251b";
    g.fillRect(0, 0, 512, 128);
    g.strokeStyle = "#6be89a";
    g.lineWidth = 6;
    g.strokeRect(8, 8, 496, 112);
    g.fillStyle = "#9af0b8";
    g.font = "bold 42px monospace";
    g.textAlign = "center";
    g.fillText("DOME SEAL 01", 256, 78);
  });

export const buildGreenhouse = (): SetHandle => {
  const root = new THREE.Group();
  const b = new Batch();

  const M = {
    floor: lam("greenhouseFloorMat", () => ({ map: rep(floorTex(), 3, 3), color: "#b8c4a8" })),
    soil: lam("greenhouseSoilMat", () => ({ map: rep(soilTex(), 2, 2), color: "#a89470" })),
    bed: lam("greenhouseBed", () => ({ color: "#6d5a3e" })),
    bedDark: lam("greenhouseBedDark", () => ({ color: "#4a3c2a" })),
    leaf: lam("greenhouseLeaf", () => ({ color: "#4f9a58" })),
    leaf2: lam("greenhouseLeaf2", () => ({ color: "#78b85e" })),
    leaf3: lam("greenhouseLeaf3", () => ({ color: "#2f7a4a" })),
    metal: lam("greenhouseMetal", () => ({ color: "#7d8a7a" })),
    dark: lam("greenhouseDarkMetal", () => ({ color: "#344038" })),
    brass: lam("greenhouseBrass", () => ({ color: "#b89a54" })),
    glass: lam("greenhouseGlassMat", () => ({ color: "#b8f0d0", transparent: true, opacity: 0.14, side: THREE.DoubleSide })),
    algae: lam("greenhouseAlgaeMat", () => ({ map: algaeTex(), color: "#baffc0", emissive: "#2f9a58", emissiveIntensity: 0.55 })),
    algaeGlow: lam("greenhouseAlgaeGlow", () => ({ color: "#38e88a", emissive: "#18a85a", emissiveIntensity: 1.5 })),
    screen: lam("greenhouseScreenMat", () => ({ map: o2Screen(), color: "#c8ffe0" })),
    hatch: lam("greenhouseHatch", () => ({ color: "#334238" })),
    hatchRing: lam("greenhouseHatchRing", () => ({ color: "#58c98a", emissive: "#1d6a42", emissiveIntensity: 0.7 })),
    tarp: lam("greenhouseTarp", () => ({ color: "#b58a4a" })),
    white: lam("greenhouseWhite", () => ({ color: "#e8e2d2" })),
  };

  // floor and base ring
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 9.2), M.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.01;
  floor.receiveShadow = true;
  root.add(floor);

  const baseRing = new THREE.Mesh(new THREE.TorusGeometry(4.55, 0.1, 8, 48), M.metal);
  baseRing.rotation.x = Math.PI / 2;
  baseRing.position.y = 0.12;
  root.add(baseRing);

  // glass dome: a painted transparent cap with visible ribs
  const glass = new THREE.Mesh(new THREE.SphereGeometry(4.55, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), M.glass);
  glass.scale.y = 0.8;
  glass.position.y = 0.02;
  root.add(glass);
  for (const z of [-3.8, -2.2, -0.6, 1.0, 2.6, 4.2]) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(4.53, 0.065, 6, 40, Math.PI), M.metal);
    rib.position.set(0, 0.02, z);
    rib.scale.y = 0.8;
    rib.castShadow = true;
    root.add(rib);
  }
  // Half-step offset: a beam exactly on the z axis runs down the lens in M4 and splits the frame.
  for (let i = 0; i < 8; i++) {
    const a = ((i + 0.5) / 8) * Math.PI * 2;
    beam(b, M.metal, [Math.cos(a) * 4.5, 0.1, Math.sin(a) * 4.5], [Math.cos(a) * 0.3, 3.62, Math.sin(a) * 0.3], 0.055);
  }
  // a crown vent at the top
  addCyl(b, M.dark, 0, 3.58, 0, 0.55, 0.3, 18);
  addCyl(b, M.metal, 0, 3.86, 0, 0.62, 0.08, 18);
  addCyl(b, M.dark, 0, 3.94, 0, 0.3, 0.22, 14);

  // raised beds: four long planters with rows of painted plants
  const beds: [number, number, number, number][] = [
    [-2.55, -2.0, 1.5, 3.4],
    [2.55, -2.0, 1.5, 3.4],
    [-2.55, 1.65, 1.5, 2.2],
    [2.55, 1.65, 1.5, 2.2],
  ];
  for (const [x, z, w, d] of beds) {
    addBox(b, M.bed, x, 0, z, w, 0.55, d);
    addBox(b, M.bedDark, x, 0.55, z, w - 0.14, 0.08, d - 0.14);
    addBox(b, M.soil, x, 0.63, z, w - 0.26, 0.05, d - 0.26);
    for (let i = 0; i < 5; i++) {
      const pz = z - d / 2 + 0.38 + i * ((d - 0.76) / 4);
      plant(b, M.bedDark, M.soil, i % 2 ? M.leaf : M.leaf2, x - 0.26, 0.68, pz, 0.62);
      plant(b, M.bedDark, M.soil, i % 3 ? M.leaf3 : M.leaf, x + 0.26, 0.68, pz, 0.58);
    }
  }

  // grow-light bars over the beds
  for (const x of [-2.55, 2.55]) {
    for (const z of [-2.9, -1.3, 0.6, 2.0]) {
      addBox(b, M.dark, x, 2.6, z, 1.3, 0.06, 0.16);
      addBox(b, M.leaf2, x, 2.54, z, 1.12, 0.04, 0.1);
    }
  }
  for (const x of [-2.55, 2.55]) pipe(b, M.metal, x, 2.75, -0.4, 5.8, 0.035, "z");

  // ---- algae bioreactors: two glass columns, glowing green ----
  const tanks: THREE.Mesh[] = [];
  const liquids: THREE.Mesh[] = [];
  const bubbles: THREE.Mesh[] = [];
  for (const x of [-1.1, 1.1]) {
    const z = -2.45;
    addCyl(b, M.dark, x, 0.15, z, 0.63, 0.22, 20);
    addCyl(b, M.metal, x, 0.37, z, 0.58, 0.08, 20);
    const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 2.1, 24), M.algae);
    liquid.position.set(x, 1.52, z);
    root.add(liquid);
    liquids.push(liquid);
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.53, 0.53, 2.35, 24), M.glass);
    tank.position.set(x, 1.58, z);
    root.add(tank);
    tanks.push(tank);
    // a painted specular strip so the glass column reads as glass, not a flat green slab
    const glint = new THREE.Mesh(
      new THREE.PlaneGeometry(0.18, 1.95),
      new THREE.MeshBasicMaterial({ map: glintTex(), transparent: true, opacity: 0.85, depthWrite: false }),
    );
    glint.position.set(x - 0.18, 1.58, z + 0.49);
    root.add(glint);
    addCyl(b, M.metal, x, 2.72, z, 0.58, 0.12, 20);
    addCyl(b, M.brass, x, 2.84, z, 0.2, 0.16, 14);
    pipe(b, M.metal, x, 2.96, z, 0.8, 0.06);
    pipe(b, M.metal, x, 2.55, z - 0.7, 1.4, 0.045, "z");
    // bubbles: separate little spheres so they can rise
    for (let i = 0; i < 8; i++) {
      const bubble = new THREE.Mesh(
        new THREE.SphereGeometry(0.035 + (i % 3) * 0.014, 8, 6),
        new THREE.MeshBasicMaterial({ color: "#b8ffd0", transparent: true, opacity: 0.72 }),
      );
      bubble.position.set(x + Math.sin(i * 2.3) * 0.22, 0.5 + (i / 8) * 2.0, z + Math.cos(i * 1.7) * 0.18);
      root.add(bubble);
      bubbles.push(bubble);
    }
  }
  const tankGlow = glowCard(glowTex("greenhouseTankGlow", "64,255,150"), 0, 1.55, -2.9, 4.2, 0.24);
  root.add(tankGlow);

  // ---- back hatch and locking ring (M3) ----
  addBox(b, M.dark, 0, 0, -4.38, 2.7, 3.2, 0.16);
  const hatch = new THREE.Mesh(new THREE.CircleGeometry(0.95, 40), M.hatch);
  hatch.position.set(0, 1.55, -4.29);
  root.add(hatch);
  const hatchRing = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.09, 8, 40), M.hatchRing);
  hatchRing.position.set(0, 1.55, -4.24);
  root.add(hatchRing);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    addBox(b, M.brass, Math.cos(a) * 0.98, 1.55 + Math.sin(a) * 0.98, -4.18, 0.09, 0.08, 0.07);
  }
  // clamp bars across the ring
  addBox(b, M.metal, 0, 2.55, -4.18, 0.15, 0.72, 0.1);
  addBox(b, M.metal, 0, 0.55, -4.18, 0.15, 0.72, 0.1);
  addBox(b, M.metal, 0, 1.55, -4.18, 1.85, 0.12, 0.1);
  const sealWheel = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.045, 8, 24), M.brass);
  sealWheel.position.set(0, 1.55, -4.12);
  root.add(sealWheel);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.36), new THREE.MeshBasicMaterial({ map: hatchSign(), color: new THREE.Color(1.1, 1.2, 1.1) }));
  sign.position.set(0, 2.92, -4.28);
  root.add(sign);

  // ---- O2 output screen, right side ----
  addBox(b, M.dark, 3.48, 0.6, -2.5, 0.18, 2.3, 1.55);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.38, 0.92),
    new THREE.MeshBasicMaterial({ map: o2Screen(), color: new THREE.Color(1.2, 1.24, 1.2) }),
  );
  screen.rotation.y = -Math.PI / 2;
  screen.position.set(3.37, 1.68, -2.5);
  root.add(screen);
  addBox(b, M.metal, 3.35, 2.18, -2.5, 0.1, 0.06, 1.5);
  addBox(b, M.metal, 3.35, 1.18, -2.5, 0.1, 0.06, 1.5);

  // workbench and tools, left foreground
  addBox(b, M.bed, -3.25, 0, 1.4, 1.45, 0.78, 0.78);
  addBox(b, M.bedDark, -3.25, 0.78, 1.4, 1.55, 0.08, 0.88);
  addBox(b, M.tarp, -3.25, 0.86, 1.4, 0.7, 0.05, 0.5);
  addCyl(b, M.brass, -3.0, 0.86, 1.35, 0.09, 0.18, 14);
  addBox(b, M.metal, -3.55, 0.86, 1.55, 0.34, 0.05, 0.2);
  addBox(b, M.white, -2.75, 0.86, 1.5, 0.24, 0.04, 0.2);

  // watering line along the left wall
  pipe(b, M.metal, -4.2, 1.2, 0.2, 6.4, 0.045, "z");
  for (let i = 0; i < 5; i++) pipe(b, M.metal, -4.2, 0.5, -2.2 + i * 1.2, 0.9, 0.03);
  addBlob(b, M.leaf, -4.15, 0.3, 2.9, 0.5, 0.35, 0.4);
  addBlob(b, M.leaf2, -4.1, 0.5, 3.2, 0.35, 0.3, 0.3);

  b.build(root, true);

  return {
    root,
    update: (t: number) => {
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
      for (let i = 0; i < bubbles.length; i++) {
        const tank = i < 8 ? -1.1 : 1.1;
        const local = i % 8;
        bubbles[i].position.y = 0.5 + ((local / 8 + t * 0.09) % 1) * 2.05;
        bubbles[i].position.x = tank + Math.sin(t * 1.4 + local * 2.3) * 0.2;
      }
      for (const l of liquids) (l.material as THREE.MeshLambertMaterial).emissiveIntensity = 0.42 + 0.22 * pulse;
      (tankGlow.material as THREE.MeshBasicMaterial).opacity = 0.16 + 0.12 * pulse;
      sealWheel.rotation.z = t * 0.35;
    },
  };
};
