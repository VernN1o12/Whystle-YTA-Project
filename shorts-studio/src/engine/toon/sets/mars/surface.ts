// The Mars surface: butterscotch sky, red dust, the colony rover, the eight-kilometre backup
// dome, a route marker, the surface cache and the comms dish. M1/M2/M5/M6/M7/M8 all play here.

import * as THREE from "three";
import { Batch, lam } from "../../../bridge/build";
import { ctex, rep } from "../../../bridge/paint";
import { addBlob, addBox, addCyl } from "../../props";
import type { SetHandle } from "../../types";
import { beam, glowCard, glowTex, pipe } from "./shared";

const skyTex = () =>
  ctex("marsSkyDome", 1024, 1024, (g, r) => {
    const gr = g.createLinearGradient(0, 0, 0, 1024);
    gr.addColorStop(0, "#8a5428");
    gr.addColorStop(0.24, "#b97838");
    gr.addColorStop(0.5, "#d9a45e");
    gr.addColorStop(0.62, "#e6bf7e");
    gr.addColorStop(0.72, "#b77a3e");
    gr.addColorStop(1, "#5a2c16");
    g.fillStyle = gr;
    g.fillRect(0, 0, 1024, 1024);
    // thin high dust bands
    for (let i = 0; i < 60; i++) {
      const y = 40 + r() * 460;
      g.fillStyle = `rgba(255,224,170,${0.008 + r() * 0.025})`;
      g.fillRect(0, y, 1024, 2 + r() * 9);
    }
    // faint stars near the top
    for (let i = 0; i < 90; i++) {
      const x = r() * 1024, y = r() * 240;
      g.fillStyle = `rgba(240,236,220,${0.1 + r() * 0.35})`;
      g.fillRect(x, y, 1 + r() * 1.5, 1 + r() * 1.5);
    }
    // low sun haze
    const sun = g.createRadialGradient(760, 520, 10, 760, 520, 210);
    sun.addColorStop(0, "rgba(255,242,200,0.6)");
    sun.addColorStop(0.3, "rgba(255,220,150,0.18)");
    sun.addColorStop(1, "rgba(255,210,130,0)");
    g.fillStyle = sun;
    g.fillRect(0, 0, 1024, 1024);
  });

const groundTex = () =>
  ctex("marsGroundDust", 1024, 1024, (g, r) => {
    const gr = g.createLinearGradient(0, 0, 0, 1024);
    gr.addColorStop(0, "#8a4a24");
    gr.addColorStop(0.4, "#9a5428");
    gr.addColorStop(1, "#6b3518");
    g.fillStyle = gr;
    g.fillRect(0, 0, 1024, 1024);
    // dust drifts
    for (let i = 0; i < 180; i++) {
      const x = r() * 1024, y = r() * 1024;
      g.fillStyle = r() < 0.5 ? `rgba(210,140,80,${0.03 + r() * 0.08})` : `rgba(90,42,18,${0.03 + r() * 0.06})`;
      g.beginPath();
      g.ellipse(x, y, 18 + r() * 120, 4 + r() * 20, r() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
    // pebbles and cracked plates
    for (let i = 0; i < 800; i++) {
      const x = r() * 1024, y = r() * 1024, s = 1 + r() * 8;
      g.fillStyle = r() < 0.45 ? "rgba(54,28,16,0.45)" : "rgba(220,156,98,0.28)";
      g.beginPath();
      g.ellipse(x, y, s, s * 0.55, r() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 20; i++) {
      g.strokeStyle = `rgba(70,34,18,${0.16 + r() * 0.15})`;
      g.lineWidth = 1 + r() * 2;
      g.beginPath();
      const x = r() * 1024, y = r() * 1024;
      g.moveTo(x, y);
      g.lineTo(x + 30 + r() * 90, y + (r() - 0.5) * 80);
      g.lineTo(x + 60 + r() * 120, y + (r() - 0.5) * 140);
      g.stroke();
    }
  });

const domeTex = () =>
  ctex("marsDomeSkin", 1024, 512, (g, r) => {
    g.fillStyle = "#c9b79a";
    g.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? "rgba(255,245,220,0.06)" : "rgba(62,48,36,0.06)";
      g.fillRect(i * 128, 0, 124, 512);
      g.fillStyle = "rgba(46,36,28,0.25)";
      g.fillRect(i * 128 + 124, 0, 4, 512);
    }
    for (let i = 0; i < 4; i++) {
      g.fillStyle = "rgba(46,36,28,0.2)";
      g.fillRect(0, 120 + i * 100, 1024, 3);
    }
    for (let i = 0; i < 1200; i++) {
      g.fillStyle = r() < 0.5 ? `rgba(210,120,70,${0.02 + r() * 0.06})` : `rgba(255,246,220,${0.01 + r() * 0.04})`;
      g.fillRect(r() * 1024, r() * 512, 2 + r() * 20, 1 + r() * 4);
    }
    // dust drift along the bottom
    g.fillStyle = "rgba(150,78,38,0.3)";
    g.fillRect(0, 420, 1024, 92);
  });

const earthTex = () =>
  ctex("marsEarthDot", 512, 512, (g, r) => {
    // a whole-surface Earth: blue oceans, green land, white cloud bands. Filling the
    // texture avoids the old map-a-disc-onto-a-sphere seam that left a cream planet.
    const gr = g.createLinearGradient(0, 0, 512, 512);
    gr.addColorStop(0, "#9ad4ff");
    gr.addColorStop(0.42, "#3f86d9");
    gr.addColorStop(1, "#16406f");
    g.fillStyle = gr;
    g.fillRect(0, 0, 512, 512);
    g.fillStyle = "#3f8a5a";
    for (let i = 0; i < 9; i++) {
      g.beginPath();
      g.ellipse(r() * 512, r() * 512, 24 + r() * 62, 14 + r() * 34, r() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = "#2f6f5a";
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      g.ellipse(r() * 512, r() * 512, 18 + r() * 40, 10 + r() * 22, r() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 16; i++) {
      g.fillStyle = `rgba(245,250,255,${0.18 + r() * 0.3})`;
      g.beginPath();
      g.ellipse(r() * 512, r() * 512, 26 + r() * 64, 6 + r() * 14, r() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
  });

const signTex = () =>
  ctex("marsRouteSign", 512, 256, (g) => {
    g.fillStyle = "#d9cdb8";
    g.fillRect(0, 0, 512, 256);
    g.strokeStyle = "#3a3028";
    g.lineWidth = 14;
    g.strokeRect(7, 7, 498, 242);
    g.fillStyle = "#3a3028";
    g.font = "bold 64px monospace";
    g.textAlign = "center";
    g.fillText("BACKUP HAB", 256, 104);
    g.fillStyle = "#b54a2e";
    g.font = "bold 96px monospace";
    g.fillText("8 KM", 256, 210);
  });

const cacheTex = () =>
  ctex("marsCacheTarp", 512, 512, (g, r) => {
    g.fillStyle = "#b56a3a";
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 80; i++) {
      g.fillStyle = r() < 0.5 ? "rgba(255,220,170,0.06)" : "rgba(80,40,20,0.08)";
      g.fillRect(0, i * 7, 512, 3);
    }
    g.strokeStyle = "rgba(70,38,20,0.4)";
    g.lineWidth = 5;
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      g.moveTo(i * 120 - 20, 0);
      g.lineTo(i * 120 + 80, 512);
      g.stroke();
    }
  });

export const buildMarsSurface = (): SetHandle => {
  const root = new THREE.Group();
  const b = new Batch();

  const M = {
    ground: lam("marsGroundMat", () => ({ map: rep(groundTex(), 6, 6), color: "#d9b08a" })),
    rock: lam("marsRock", () => ({ color: "#8a4a2e" })),
    rockHi: lam("marsRockHi", () => ({ color: "#b86a42" })),
    dust: lam("marsDustMat", () => ({ color: "#d9a05e", transparent: true, opacity: 0.22, depthWrite: false })),
    rover: lam("marsRoverBody", () => ({ color: "#c9b79a" })),
    roverDark: lam("marsRoverDark", () => ({ color: "#4a4a46" })),
    roverOrange: lam("marsRoverOrange", () => ({ color: "#c9662f" })),
    solar: lam("marsSolar", () => ({ color: "#2f4f6a", emissive: "#14283a", emissiveIntensity: 0.5 })),
    tire: lam("marsTire", () => ({ color: "#2a2622" })),
    dome: lam("marsDomeMat", () => ({ map: rep(domeTex(), 3, 1), color: "#e0cfb4" })),
    domeDark: lam("marsDomeDark", () => ({ color: "#5a5044" })),
    metal: lam("marsSurfaceMetal", () => ({ color: "#8f979e" })),
    brass: lam("marsSurfaceBrass", () => ({ color: "#c9a24a" })),
    red: lam("marsSurfaceRed", () => ({ color: "#c9463a", emissive: "#6a1610", emissiveIntensity: 0.8 })),
    tarp: lam("marsCacheMat", () => ({ map: cacheTex() })),
    sign: lam("marsSignMat", () => ({ map: signTex() })),
    white: lam("marsWhite", () => ({ color: "#e8dfc9" })),
  };

  // sky dome
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(55, 40, 24),
    new THREE.MeshBasicMaterial({ map: skyTex(), side: THREE.BackSide, fog: false }),
  );
  root.add(sky);

  // ground
  const ground = new THREE.Mesh(new THREE.CircleGeometry(45, 64), M.ground);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  root.add(ground);

  // distant ridge: low painted blobs around the horizon
  for (let i = 0; i < 18; i++) {
    const a = -1.9 + (i / 17) * 3.8;
    const r = 26 + (i % 4) * 2.5;
    addBlob(b, i % 3 ? M.rock : M.rockHi, Math.sin(a) * r, 0.4, -Math.cos(a) * r, 3.2 + (i % 5) * 1.2, 0.8 + (i % 3) * 0.4, 2.2 + (i % 4) * 1.1);
  }

  // near rocks and dunes
  for (let i = 0; i < 34; i++) {
    const x = (i * 47 % 19) - 9;
    const z = -2 - (i * 83 % 13);
    const s = 0.16 + (i % 6) * 0.08;
    addBlob(b, i % 3 ? M.rock : M.rockHi, x, s * 0.45, z, s * 1.4, s * 0.7, s, i * 0.7);
  }
  for (let i = 0; i < 10; i++) {
    const x = -7 + (i * 29 % 14);
    const z = 2 - (i * 17 % 9);
    addBlob(b, M.dust, x, 0.08, z, 1.6 + (i % 3), 0.06, 0.8 + (i % 2));
  }

  // ---- rover, behind Voss in M1 ----
  const rx = 2.25, rz = -3.1;
  addBox(b, M.rover, rx, 0.46, rz, 1.35, 0.42, 2.25);
  addBox(b, M.roverOrange, rx, 0.86, rz - 0.55, 1.22, 0.34, 0.72);
  addBox(b, M.rover, rx, 0.82, rz + 0.55, 1.1, 0.28, 0.6);
  addBox(b, M.roverDark, rx, 1.06, rz + 0.18, 0.95, 0.24, 1.0);
  addBox(b, M.solar, rx, 1.21, rz + 0.18, 1.02, 0.04, 1.08);
  addBox(b, M.solar, rx, 1.25, rz + 0.18, 0.78, 0.04, 0.82);
  for (let i = 0; i < 6; i++) {
    const z = rz - 0.72 + (i % 3) * 0.72;
    const x = rx + (i < 3 ? -0.72 : 0.72);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.24, 16), M.tire);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.34, z);
    wheel.castShadow = true;
    root.add(wheel);
    addCyl(b, M.metal, x, 0.34, z, 0.12, 0.26, 12);
  }
  addBox(b, M.white, rx, 1.22, rz - 1.12, 0.16, 0.08, 0.1);
  addBox(b, M.red, rx - 0.42, 1.15, rz - 1.1, 0.14, 0.08, 0.08);
  pipe(b, M.metal, rx + 0.5, 1.32, rz - 0.7, 0.55, 0.025);
  addBlob(b, M.white, rx + 0.5, 1.62, rz - 0.7, 0.06, 0.06, 0.06);
  // rover tracks in the dust
  for (let i = 0; i < 2; i++) {
    for (let k = 0; k < 9; k++) {
      addBox(b, M.rock, rx + (i ? 0.72 : -0.72), 0.012, rz + 1.3 + k * 0.6, 0.18, 0.01, 0.32);
    }
  }

  // ---- backup dome, eight kilometres out ----
  const dome = new THREE.Mesh(new THREE.SphereGeometry(3.4, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2), M.dome);
  dome.position.set(-2.4, 0, -15.5);
  dome.castShadow = true;
  root.add(dome);
  addCyl(b, M.domeDark, -2.4, 0, -15.5, 3.45, 0.35, 36);
  addBox(b, M.domeDark, -2.4, 0.35, -12.2, 1.1, 1.8, 0.7);
  addBox(b, M.metal, -2.4, 1.15, -11.9, 0.7, 0.8, 0.12);
  addBox(b, M.red, -2.4, 1.55, -11.82, 0.12, 0.12, 0.06);
  // No mast beacon: at 8 km the 5 cm mast is sub-pixel and the lamp reads as a stray red dot in the sky.
  pipe(b, M.metal, -2.4, 3.4, -15.5, 1.1, 0.05);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.5;
    beam(b, M.metal, [-2.4 + Math.cos(a) * 1.8, 0.1, -15.5 + Math.sin(a) * 1.8], [-2.4 + Math.cos(a) * 2.5, 2.1, -15.5 + Math.sin(a) * 2.5], 0.035);
  }
  // solar field beside the dome
  for (let i = 0; i < 4; i++) addBox(b, M.solar, -6.4 + i * 1.0, 0.35, -14.0 + (i % 2) * 0.7, 0.85, 0.06, 0.55);

  // route marker: readable in M2
  addBox(b, M.metal, -0.7, 0, -6.4, 0.11, 2.1, 0.11);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 0.78), M.sign);
  sign.position.set(-0.7, 2.2, -6.34);
  sign.rotation.y = 0.08;
  root.add(sign);
  addBox(b, M.metal, -0.7, 1.82, -6.36, 1.65, 0.07, 0.1);
  addBox(b, M.metal, -0.7, 2.62, -6.36, 1.65, 0.07, 0.1);
  const signGlow = glowCard(glowTex("marsSignGlow", "255,196,120"), -0.7, 2.2, -6.28, 2.2, 0.14);
  root.add(signGlow);

  // ---- surface cache, background right ----
  addBox(b, M.tarp, 1.55, 0.02, -6.4, 1.4, 0.7, 1.0);
  addBox(b, M.tarp, 1.75, 0.7, -6.5, 1.0, 0.34, 0.72);
  addBox(b, M.metal, 1.0, 0, -6.15, 0.55, 0.45, 0.55);
  addBox(b, M.roverOrange, 2.35, 0, -5.85, 0.4, 0.7, 0.4);
  addBox(b, M.metal, 0.65, 0, -6.8, 0.18, 1.5, 0.18);
  addBlob(b, M.red, 0.65, 1.55, -6.8, 0.08, 0.08, 0.08);

  // ---- comms dish, far right and back: a low-angle hero only in M7 ----
  const DISH_X = 5.0;
  const DISH_Z = -7.2;
  addCyl(b, M.metal, DISH_X, 0, DISH_Z, 0.22, 2.3, 16);
  addCyl(b, M.domeDark, DISH_X, 0, DISH_Z, 0.45, 0.24, 16);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    beam(b, M.metal, [DISH_X, 0.2, DISH_Z], [DISH_X + Math.cos(a) * 0.6, 0.1, DISH_Z + Math.sin(a) * 0.6], 0.04);
  }

  const dishGroup = new THREE.Group();
  dishGroup.position.set(DISH_X, 2.42, DISH_Z);
  dishGroup.rotation.set(-0.38, 0.1, -0.32);
  const dishMat = new THREE.MeshLambertMaterial({ color: "#d9d2c0", side: THREE.DoubleSide });
  const dish = new THREE.Mesh(new THREE.SphereGeometry(1.55, 36, 18, 0, Math.PI * 2, 0, Math.PI * 0.42), dishMat);
  dish.castShadow = true;
  dishGroup.add(dish);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.52, 0.045, 6, 40), M.metal);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.43;
  dishGroup.add(rim);
  const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.2, 8), M.metal);
  feed.position.y = 1.05;
  dishGroup.add(feed);
  const feedTip = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), M.red);
  feedTip.position.y = 1.68;
  dishGroup.add(feedTip);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.2, 6), M.metal);
    strut.position.set(Math.cos(a) * 0.55, 0.9, Math.sin(a) * 0.55);
    strut.rotation.z = Math.cos(a) * 0.3;
    strut.rotation.x = Math.sin(a) * 0.3;
    dishGroup.add(strut);
  }
  root.add(dishGroup);

  // ---- Earth, the blue dot in M8 ----
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(0.62, 40, 28),
    new THREE.MeshBasicMaterial({ map: earthTex(), fog: false }),
  );
  earth.position.set(3.8, 5.35, -18.0);
  root.add(earth);
  const earthGlow = glowCard(glowTex("marsEarthGlow", "96,180,255"), 3.8, 5.35, -18.55, 3.2, 0.5);
  root.add(earthGlow);

  // dust haze cards, low and wide, to break the horizon
  const dustCards: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const d = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 2.4),
      new THREE.MeshBasicMaterial({ map: glowTex(`marsDust${i}`, "224,156,92"), transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }),
    );
    d.position.set(-4 + i * 3.2, 1.1 + i * 0.15, -8 - i * 1.8);
    root.add(d);
    dustCards.push(d);
  }

  b.build(root, true);

  return {
    root,
    update: (t: number) => {
      dishGroup.rotation.y = 0.1 + Math.sin(t * 0.55) * 0.18;
      dishGroup.rotation.x = -0.38 + Math.sin(t * 0.34) * 0.06;
      for (let i = 0; i < dustCards.length; i++) {
        const m = dustCards[i].material as THREE.MeshBasicMaterial;
        m.opacity = 0.08 + 0.06 * (0.5 + 0.5 * Math.sin(t * 0.7 + i * 1.7));
      }
    },
  };
};
