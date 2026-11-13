// The cast. A character is an Outfit + a head seed + optional drawn accessories, all in the same
// flat 600 x 1000 canvas the bridge cast uses. The new hero, Wren, is original: teal overshirt,
// rust trousers, indigo bob, round brass glasses, and a red tuning fork.
//
// Mars reuses the same rig with a second wardrobe: Voss (commander, cream flight suit), Chen
// (botanist, teal coveralls, glasses) and Kovic (engineer, orange EVA suit, moustache). The Mars
// additions (helmet, hand props, cropped hair) are opt-in per cast entry, so the color-sounds cast
// renders exactly as before.

import { BUILD, Outfit, bodyFront, FrontOpts, Pen, headBlob, INK, mix } from "../bridge/toon";
import type { MarsProp } from "./types";

export const WREN: Outfit = {
  jacket: "#2f6f6a",
  pants: "#a9503c",
  boots: "#3a2a24",
  buttons: "#e0b34a",
  hat: "hair",
  hair: "#3b3159",
  skin: "#e8b48a",
  build: "adult",
};

export const SAM: Outfit = {
  jacket: "#c9563f",
  pants: "#3c4a63",
  boots: "#2c211d",
  hat: "cap",
  cap: "#e0b34a",
  skin: "#c99067",
  build: "kid",
};

export const DOC: Outfit = {
  jacket: "#e8e2d2",
  pants: "#4a5364",
  boots: "#33261f",
  belt: "#c9b98f",
  buttons: "#7d8794",
  hat: "hair",
  hair: "#4a3426",
  skin: "#f5c9a0",
  build: "adult",
};

// ---- Mars wardrobe -------------------------------------------------------
// Voss: cream pressure-flight suit with rust shoulder panels, dark utility belt.
export const VOSS: Outfit = {
  jacket: "#d9cdb8",
  pants: "#b8a992",
  boots: "#3a3028",
  belt: "#7a4a2e",
  buttons: "#c96a3a",
  hat: "hair",
  hair: "#4a4038",
  skin: "#d9a077",
  build: "adult",
};

// Chen: teal-green coveralls, brass belt, dark bob, round glasses.
export const CHEN: Outfit = {
  jacket: "#3f7a6a",
  pants: "#356a5c",
  boots: "#2f3a34",
  belt: "#c9b98f",
  buttons: "#d9c27a",
  hat: "hair",
  hair: "#241f22",
  skin: "#e8b48a",
  build: "adult",
};

// Kovic: orange EVA suit, grey harness, buzz cut and a moustache; the stout build reads older.
export const KOVIC: Outfit = {
  jacket: "#c9662f",
  pants: "#b45a2a",
  boots: "#3a3028",
  belt: "#4a4a52",
  buttons: "#e0c27a",
  hat: "hair",
  hair: "#2f2620",
  moustache: "#3a2a22",
  skin: "#c99067",
  build: "stout",
};

type CastDef = { outfit: Outfit; seed: number; glasses?: boolean; shirt?: boolean; hairStyle?: "bob" | "crop" };

export const CAST: Record<string, CastDef> = {
  wren: { outfit: WREN, seed: 4, glasses: true, shirt: true },
  sam: { outfit: SAM, seed: 2 },
  doc: { outfit: DOC, seed: 6, shirt: true },
  voss: { outfit: VOSS, seed: 8, shirt: true, hairStyle: "crop" },
  chen: { outfit: CHEN, seed: 10, glasses: true, shirt: true, hairStyle: "bob" },
  kovic: { outfit: KOVIC, seed: 12, hairStyle: "crop" },
};

export type HeroPose = Omit<FrontOpts, "prop"> & {
  fork?: boolean;
  helmet?: "on" | "off" | "carry";
  prop?: MarsProp | null;
};

const rad = (d: number) => (d * Math.PI) / 180;
const rot = (x: number, y: number, a: number, cx: number, cy: number): [number, number] => [
  cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a),
  cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a),
];

/** adult build constants, shared with bodyFront so accessories land on the face */
const ADULT = BUILD.adult;

type Frame = {
  u: number;
  W: number;
  HH: number;
  chin: number;
  hc: number;
  hipY: number;
  tcx: number;
  Ta: number;
  A: number;
};

const frameOf = (seed: number, facing: number, pose: HeroPose): Frame => {
  const H = headBlob(seed, ADULT.a, facing);
  const W = 2 * H.a;
  const HH = 2 * H.b;
  const u = W / 100;
  const sole = 975;
  const tall = (1 + ADULT.torso + ADULT.legs) * HH;
  const phase = pose.phase ?? 0;
  const bob = pose.mode === "march" ? 0.025 * tall * Math.cos(4 * Math.PI * phase) : pose.mode === "stroll" ? 0.015 * tall * Math.cos(4 * Math.PI * phase) : 0;
  const torsoBot = sole - ADULT.legs * HH + bob;
  const chin = torsoBot - ADULT.torso * HH;
  const hc = chin - H.b;
  const hipY = torsoBot - 0.12 * HH;
  const tcx = 300 + 3 * u * facing;
  const Ta = ((ADULT.tw / 2) * W) / 1.06;
  const A =
    (pose.tilt ?? 0) +
    (pose.mode === "march" ? 1.6 * Math.sin(2 * Math.PI * phase) : pose.mode === "stroll" ? 1.0 * Math.sin(2 * Math.PI * phase) : 0);
  return { u, W, HH, chin, hc, hipY, tcx, Ta, A };
};

const drawGlasses = (p: Pen, seed: number, facing: number, pose: HeroPose) => {
  const f = frameOf(seed, facing, pose);
  const u = f.u;
  const fx = 300 + 7 * u * facing;
  const ex = 13 * u;
  const ey = f.hc;
  const r = 10.2 * u;
  const a = rad((pose.headTilt ?? 0) + f.A);
  const P = (x: number, y: number) => {
    const [bx, by] = rot(x, y, rad(f.A), 300, f.hipY);
    return rot(bx, by, rad(pose.headTilt ?? 0), 300, f.chin);
  };
  const circle = (cx: number, cy: number) => {
    const pts: [number, number][] = [];
    for (let i = 0; i < 28; i++) {
      const t = (i / 28) * Math.PI * 2;
      pts.push(P(cx + Math.cos(t) * r, cy + Math.sin(t) * r));
    }
    return pts;
  };
  for (const side of [-1, 1]) {
    const c = circle(fx + side * ex, ey);
    p.poly(c, "rgba(206,232,238,0.16)", 2.1 * u);
  }
  const b0 = P(fx - ex + r, ey);
  const b1 = P(fx + ex - r, ey);
  p.stroke([b0, b1], 2.0 * u);
  for (const side of [-1, 1]) {
    const t0 = P(fx + side * (ex + r), ey);
    const t1 = P(fx + side * (ex + r + 3.5 * u), ey - 2.5 * u);
    p.stroke([t0, t1], 1.7 * u);
  }
  void a;
};

const drawFork = (p: Pen, seed: number, facing: number, pose: HeroPose) => {
  const f = frameOf(seed, facing, pose);
  const u = f.u;
  const wave = pose.wave ?? 1;
  const S: [number, number] = [f.tcx + 0.85 * f.Ta, f.chin + 0.12 * f.HH];
  const Hd: [number, number] = [f.tcx + 1.18 * f.Ta + 16 * u + 12 * u * wave, S[1] - 0.6 * f.HH];
  const [bx, by] = rot(Hd[0], Hd[1], rad(f.A), 300, f.hipY);
  const red = "#d9453a";
  const brass = "#e2b24a";
  // handle + stem
  p.poly(
    [
      [bx - 4.2 * u, by + 8 * u],
      [bx + 4.2 * u, by + 8 * u],
      [bx + 3.2 * u, by + 40 * u],
      [bx - 3.2 * u, by + 40 * u],
    ],
    "#7a5236",
    2 * u,
  );
  p.band(
    [
      [bx, by + 10 * u],
      [bx, by - 18 * u],
    ],
    red,
    5.2 * u,
    1.6 * u,
    "round",
  );
  p.arc(bx, by - 18 * u, 14 * u, 9 * u, 0, 180, 5.2 * u, red);
  for (const side of [-1, 1]) {
    p.band(
      [
        [bx + side * 14 * u, by - 18 * u],
        [bx + side * 14 * u, by - 50 * u],
      ],
      red,
      5.2 * u,
      1.6 * u,
      "round",
    );
    p.dot(bx + side * 14 * u, by - 50 * u, 3.4 * u, brass);
  }
  p.dot(bx, by - 18 * u, 3 * u, brass);
};

/** shirt details: an open collar and a chest pocket, drawn over the torso.
 *  Parameterised by outfit colour so Mars suits keep their own palette. */
const drawShirt = (p: Pen, outfit: Outfit, seed: number, facing: number, pose: HeroPose) => {
  const f = frameOf(seed, facing, pose);
  const u = f.u;
  const P = (x: number, y: number) => rot(x, y, rad(f.A), 300, f.hipY);
  const light = mix(outfit.jacket, "#ffffff", 0.24);
  const dark = mix(outfit.jacket, "#000000", 0.3);
  const y0 = f.chin + 0.015 * f.HH;
  p.poly([P(f.tcx - 0.115 * f.W, y0), P(f.tcx + 0.115 * f.W, y0), P(f.tcx, y0 + 0.24 * f.HH)], dark, 2.4 * u);
  for (const side of [-1, 1]) {
    p.poly(
      [
        P(f.tcx + side * 0.012 * f.W, y0 + 0.035 * f.HH),
        P(f.tcx + side * 0.16 * f.W, y0 - 0.015 * f.HH),
        P(f.tcx + side * 0.1 * f.W, y0 + 0.16 * f.HH),
      ],
      light,
      2.4 * u,
    );
  }
  const px = f.tcx - 0.2 * f.W;
  const py = f.chin + 0.52 * f.HH;
  p.poly(
    [P(px - 0.055 * f.W, py), P(px + 0.055 * f.W, py), P(px + 0.05 * f.W, py + 0.17 * f.HH), P(px - 0.05 * f.W, py + 0.17 * f.HH)],
    dark,
    2 * u,
  );
  p.band([P(px + 0.005 * f.W, py - 0.07 * f.HH), P(px + 0.03 * f.W, py + 0.03 * f.HH)], outfit.buttons ?? "#e0b34a", 2.4 * u, 1.1 * u, "round");
};

/** bob framing: a scalloped fringe across the forehead and two side locks beside the cheeks.
 *  Drawn over bodyFront, using the same rotations the face details use. */
const drawFringe = (p: Pen, seed: number, facing: number, pose: HeroPose, hairCol: string) => {
  const f = frameOf(seed, facing, pose);
  const u = f.u;
  const H = headBlob(seed, ADULT.a, facing);
  const P = (x: number, y: number) => {
    const [bx, by] = rot(x, y, rad(f.A), 300, f.hipY);
    return rot(bx, by, rad(pose.headTilt ?? 0), 300, f.chin);
  };
  const xL = f.tcx - 0.8 * H.a;
  const xR = f.tcx + 0.8 * H.a;
  const yTop = f.hc - 0.34 * H.b;
  const yMid = f.hc - 0.12 * H.b;
  const pts: [number, number][] = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    pts.push([xL + (xR - xL) * t, yTop + Math.sin(t * Math.PI) * 0.05 * H.b]);
  }
  for (let i = 8; i >= 0; i--) {
    const t = i / 8;
    pts.push([xL + (xR - xL) * t, yMid + (i % 2 === 0 ? 0.1 * H.b : 0)]);
  }
  p.poly(pts.map(([x, y]) => P(x, y)), hairCol, 2 * u);
  for (const side of [-1, 1]) {
    const sx = f.tcx + side * 0.76 * H.a;
    const lock: [number, number][] = [
      [sx - side * 0.02 * H.a, f.hc - 0.62 * H.b],
      [sx + side * 0.1 * H.a, f.hc - 0.25 * H.b],
      [sx + side * 0.11 * H.a, f.hc + 0.22 * H.b],
      [sx, f.hc + 0.55 * H.b],
      [sx - side * 0.1 * H.a, f.hc + 0.2 * H.b],
      [sx - side * 0.09 * H.a, f.hc - 0.42 * H.b],
    ];
    p.poly(lock.map(([x, y]) => P(x, y)), hairCol, 2 * u);
  }
};

/** cropped hair: a short cap with a side part and short sideburns (Voss, Kovic). */
const drawCrop = (p: Pen, seed: number, facing: number, pose: HeroPose, hairCol: string) => {
  const f = frameOf(seed, facing, pose);
  const u = f.u;
  const H = headBlob(seed, ADULT.a, facing);
  const P = (x: number, y: number) => {
    const [bx, by] = rot(x, y, rad(f.A), 300, f.hipY);
    return rot(bx, by, rad(pose.headTilt ?? 0), 300, f.chin);
  };
  const xL = f.tcx - 0.84 * H.a;
  const xR = f.tcx + 0.84 * H.a;
  const top = f.hc - 1.02 * H.b;
  const line = f.hc - 0.34 * H.b;
  const pts: [number, number][] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    pts.push([xL + (xR - xL) * t, top + Math.sin(t * Math.PI) * 0.16 * H.b]);
  }
  for (let i = 12; i >= 0; i--) {
    const t = i / 12;
    const part = t > 0.55 ? 0.06 : 0.015;
    pts.push([xL + (xR - xL) * t, line + (i % 4 === 0 ? part : 0) * H.b]);
  }
  p.poly(pts.map(([x, y]) => P(x, y)), hairCol, 2 * u);
  for (const side of [-1, 1]) {
    const sx = f.tcx + side * 0.82 * H.a;
    p.poly(
      [
        P(sx - side * 0.06 * H.a, f.hc - 0.3 * H.b),
        P(sx + side * 0.02 * H.a, f.hc - 0.28 * H.b),
        P(sx + side * 0.02 * H.a, f.hc + 0.08 * H.b),
        P(sx - side * 0.07 * H.a, f.hc + 0.05 * H.b),
      ],
      hairCol,
      1.8 * u,
    );
  }
};

/** points around an ellipse in canvas space */
const ellPts = (cx: number, cy: number, rx: number, ry: number, n = 40): [number, number][] => {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return pts;
};

/** A clear EVA bubble helmet with a gold visor reflection and a metal neck ring.
 *  `frost` 0..1 paints ice creeping in from the rim (the M6 close-up). */
const drawHelmet = (p: Pen, seed: number, facing: number, pose: HeroPose, frost: number) => {
  const f = frameOf(seed, facing, pose);
  const u = f.u;
  const H = headBlob(seed, ADULT.a, facing);
  p.rot = null;
  const cx = f.tcx;
  const cy = f.hc;
  // clearance around the hair: a bubble, not a wire hoop on the head
  const rx = 1.36 * H.a;
  const ry = 1.38 * H.b;

  // glass dome
  p.poly(ellPts(cx, cy, rx, ry), "rgba(178,222,236,0.16)", 3.4 * u);
  // gold visor crescent along the upper-left
  const visor: [number, number][] = [];
  for (let i = 0; i <= 14; i++) {
    const a = rad(188 + (i / 14) * 76);
    visor.push([cx + Math.cos(a) * rx * 0.9, cy + Math.sin(a) * ry * 0.9]);
  }
  for (let i = 14; i >= 0; i--) {
    const a = rad(188 + (i / 14) * 76);
    visor.push([cx + Math.cos(a) * rx * 0.66, cy + Math.sin(a) * ry * 0.66]);
  }
  p.poly(visor, "rgba(232,190,92,0.30)", 1.2 * u);
  // specular highlight high on the dome, a thin streak rather than a grey patch
  p.ell(cx - 0.5 * rx, cy - 0.66 * ry, 0.16 * rx, 0.035 * ry, "rgba(255,255,255,0.8)", 0, 0, 360, -0.55);
  p.ell(cx - 0.6 * rx, cy - 0.56 * ry, 0.05 * rx, 0.018 * ry, "rgba(255,255,255,0.55)", 0, 0, 360, -0.55);
  // neck ring + bolts
  p.ell(cx, cy + 0.97 * ry, 0.78 * rx, 0.14 * ry, "#9aa0a6", 2.6 * u);
  p.ell(cx, cy + 0.99 * ry, 0.62 * rx, 0.08 * ry, "#6d747b", 0);
  for (const side of [-1, 0, 1]) p.dot(cx + side * 0.5 * rx, cy + 0.99 * ry, 2.2 * u, "#c9a24a");
  // side latches
  for (const side of [-1, 1]) {
    p.ell(cx + side * 0.94 * rx, cy + 0.3 * ry, 0.055 * rx, 0.09 * ry, "#c9a24a", 1.8 * u);
  }

  if (frost > 0.01) {
    const g = p.g;
    p.clip(ellPts(cx, cy, rx, ry), () => {
      const gr = g.createRadialGradient(cx, cy, ry * 0.25, cx, cy, ry * 1.08);
      gr.addColorStop(0, "rgba(255,255,255,0)");
      gr.addColorStop(0.66, `rgba(226,244,255,${(0.05 * frost).toFixed(3)})`);
      gr.addColorStop(1, `rgba(255,255,255,${(0.42 * frost).toFixed(3)})`);
      g.fillStyle = gr;
      g.fillRect(cx - rx - 10, cy - ry - 10, 2 * rx + 20, 2 * ry + 20);
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * Math.PI * 2 + 0.17;
        const rr = 0.62 + (0.3 * ((i * 37) % 11)) / 11;
        const x0 = cx + Math.cos(a) * rx * rr;
        const y0 = cy + Math.sin(a) * ry * rr;
        const x1 = cx + Math.cos(a + 0.06) * rx * 0.99;
        const y1 = cy + Math.sin(a + 0.06) * ry * 0.99;
        const mx = (x0 + x1) / 2 + Math.cos(a + 1.1) * 7 * u;
        const my = (y0 + y1) / 2 + Math.sin(a + 1.1) * 7 * u;
        p.stroke(
          [
            [x0, y0],
            [mx, my],
            [x1, y1],
          ],
          1.4 * u,
          `rgba(240,250,255,${(0.52 * frost).toFixed(3)})`,
        );
        p.stroke(
          [
            [mx, my],
            [mx + Math.cos(a - 0.7) * 8 * u, my + Math.sin(a - 0.7) * 8 * u],
          ],
          1.1 * u,
          `rgba(240,250,255,${(0.5 * frost).toFixed(3)})`,
        );
      }
    });
  }
};

/** a helmet carried at the left hip */
const drawCarriedHelmet = (p: Pen, seed: number, facing: number, pose: HeroPose) => {
  const f = frameOf(seed, facing, pose);
  const u = f.u;
  const H = headBlob(seed, ADULT.a, facing);
  p.rot = null;
  const cx = f.tcx - 1.16 * f.Ta - 16 * u;
  const cy = f.chin + 0.86 * f.HH;
  const rx = 0.4 * H.a;
  const ry = 0.4 * H.b;
  p.ell(cx, cy, rx, ry, "rgba(178,222,236,0.12)", 2.4 * u);
  p.arc(cx, cy, rx * 0.86, ry * 0.86, 190, 265, 3.4 * u, "rgba(232,190,92,0.45)");
  p.ell(cx, cy + 0.94 * ry, 0.72 * rx, 0.13 * ry, "#9aa0a6", 2 * u);
  p.dot(cx, cy + 0.96 * ry, 1.8 * u, "#c9a24a");
};

/** the hanging right hand, matching bodyFront's hang(1, 0) arm pose */
const handAt = (f: Frame): [number, number] => {
  const u = f.u;
  const hx = f.tcx + 1.12 * f.Ta + 7 * u;
  const hy = f.chin + 1.04 * f.HH;
  return rot(hx, hy, rad(f.A), 300, f.hipY);
};

/** hand props, drawn in the same canvas as the body */
const drawProp = (p: Pen, kind: MarsProp, seed: number, facing: number, pose: HeroPose) => {
  const f = frameOf(seed, facing, pose);
  const u = f.u;
  const [bx, by] = handAt(f);
  p.rot = null;
  const T = (dx: number, dy: number): [number, number] => rot(bx + dx * u, by + dy * u, rad(f.A), bx, by);

  if (kind === "keys") {
    const brass = "#d8b04e";
    const steel = "#b9b2a0";
    // ring
    p.ell(bx, by - 2 * u, 5 * u, 4 * u, null, 2.4 * u);
    // three keys on short chains
    for (let i = 0; i < 3; i++) {
      const dx = (i - 1) * 6.5;
      const dy = 4 + (i % 2) * 2;
      p.band([T(dx, dy), T(dx, dy + 14)], steel, 2.6 * u, 1.2 * u, "round");
      p.poly([T(dx - 3.4, dy + 14), T(dx + 3.4, dy + 14), T(dx + 3.4, dy + 22), T(dx - 3.4, dy + 22)], brass, 1.6 * u);
      p.dot(T(dx, dy + 18)[0], T(dx, dy + 18)[1], 1.2 * u, "#7a5236");
      p.poly([T(dx + 3.2, dy + 16), T(dx + 7, dy + 16), T(dx + 7, dy + 19), T(dx + 3.2, dy + 19)], brass, 1.2 * u);
    }
    // red fob
    p.poly([T(7, -2), T(13, -1), T(13, 8), T(8, 7)], "#c9463a", 1.6 * u);
  } else if (kind === "wrench") {
    const steel = "#8f979e";
    const hi = "#c3cbd0";
    const ang = -0.55;
    const W = (dx: number, dy: number): [number, number] => {
      const c = Math.cos(ang), s = Math.sin(ang);
      return T(dx * c - dy * s, dx * s + dy * c);
    };
    // shaft
    p.poly([W(-3.2, 12), W(3.2, 12), W(2.4, -26), W(-2.4, -26)], steel, 2.2 * u);
    p.stroke([W(-1, 10), W(-0.6, -22)], 1.4 * u, hi);
    // open jaw
    p.poly(
      [
        W(-8, -26),
        W(-2.4, -26),
        W(-2.4, -34),
        W(-5.2, -40),
        W(-9.6, -36),
        W(-8.6, -30),
      ],
      steel,
      2.2 * u,
    );
    p.poly(
      [
        W(8, -26),
        W(2.4, -26),
        W(2.4, -34),
        W(5.2, -40),
        W(9.6, -36),
        W(8.6, -30),
      ],
      steel,
      2.2 * u,
    );
    // box end
    p.ell(W(0, 14)[0], W(0, 14)[1], 5.2 * u, 5.2 * u, steel, 2.2 * u);
    p.ell(W(0, 14)[0], W(0, 14)[1], 2.6 * u, 2.6 * u, "#4a4f54", 0);
  } else if (kind === "clipboard") {
    const wood = "#7a5236";
    const paper = "#efe6d2";
    // board
    p.poly([T(-15, -2), T(15, -2), T(15, 30), T(-15, 30)], wood, 2.2 * u);
    p.poly([T(-12.4, 0), T(12.4, 0), T(12.4, 26), T(-12.4, 26)], paper, 1.4 * u);
    // clip
    p.poly([T(-4, -4), T(4, -4), T(4, 2), T(-4, 2)], "#8f979e", 1.4 * u);
    // lines of notes
    for (let i = 0; i < 4; i++) p.stroke([T(-9, 6 + i * 4.4), T(8 - (i % 2) * 5, 6 + i * 4.4)], 1.2 * u, "rgba(58,48,40,0.72)");
    // red pen clipped to the side
    p.band([T(12, 4), T(14, 20)], "#c9463a", 2.2 * u, 1 * u, "round");
  } else {
    // locking seal: a heavy C-clamp ring with a red grip
    const steel = "#9aa0a6";
    const dark = "#5d646b";
    p.arc(bx, by + 8 * u, 20 * u, 20 * u, 35, 325, 9 * u, steel);
    p.arc(bx, by + 8 * u, 20 * u, 20 * u, 35, 325, 4 * u, dark);
    // screw handle across the opening
    p.band([T(15, 0), T(27, 12)], steel, 4.4 * u, 1.4 * u, "round");
    p.band([T(23, 8), T(29, 14)], "#c9463a", 5 * u, 1.4 * u, "round");
    // hinge + indicator
    p.ell(bx + 15 * u, by + 18 * u, 3.2 * u, 3.2 * u, "#c9a24a", 1.6 * u);
    p.dot(bx - 15 * u, by + 18 * u, 2.4 * u, "#4fbf7a");
  }
};

/** a draw function for one cast member in one pose */
export const drawActor = (cast: string, pose: HeroPose) => (p: Pen) => {
  const def = CAST[cast] ?? CAST.wren;
  const { fork, helmet, prop, ...rest } = pose;
  const opts: FrontOpts = { ...rest, seed: def.seed, inkK: 0.5 };
  // A hand prop is held by the hanging right hand. The raised-wave arm belongs to the fork,
  // so suppress wave while a prop is out or the keys/clipboard/seal float beside the head.
  if (prop && !fork) opts.wave = undefined;
  bodyFront(p, def.outfit, opts);
  if (def.outfit.hat === "hair" && def.outfit.hair) {
    if (def.hairStyle === "crop") drawCrop(p, def.seed, pose.facing ?? 0, pose, def.outfit.hair);
    else drawFringe(p, def.seed, pose.facing ?? 0, pose, def.outfit.hair);
  }
  if (def.shirt) drawShirt(p, def.outfit, def.seed, pose.facing ?? 0, pose);
  if (def.glasses) drawGlasses(p, def.seed, pose.facing ?? 0, pose);
  if (fork) drawFork(p, def.seed, pose.facing ?? 0, pose);
  if (prop) drawProp(p, prop, def.seed, pose.facing ?? 0, pose);
  if (helmet === "on") drawHelmet(p, def.seed, pose.facing ?? 0, pose, pose.phase ?? 0);
  else if (helmet === "carry") drawCarriedHelmet(p, def.seed, pose.facing ?? 0, pose);
};

/** palette helper for 2D props */
export const HERO_RED = "#d9453a";
export const HERO_TEAL = "#2f6f6a";
export const HERO_INK = INK;
export const HERO_SHADE = mix(HERO_TEAL, INK, 0.5);
