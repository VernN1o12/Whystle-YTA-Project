// Timeline -> per-frame state. Pure functions: the same frame always gives the same camera, poses and effects.
// The renderer never authors motion; it only interpolates the data.

import type { ActorKey, ActorPose, ActorSpec, CamKey, Ease, SceneSpec, Segment, ShotSpec } from "./types";

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerp3 = (a: [number, number, number], b: [number, number, number], k: number): [number, number, number] => [
  lerp(a[0], b[0], k),
  lerp(a[1], b[1], k),
  lerp(a[2], b[2], k),
];

export const EASE: Record<Ease, (k: number) => number> = {
  linear: (k) => k,
  out: (k) => 1 - (1 - k) ** 3,
  inOut: (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2),
};

/** camera at shot clock t: position / look / fov / roll, eased between keys */
export const camAt = (shot: ShotSpec, t: number) => {
  const keys = shot.cam;
  if (keys.length === 0) return { pos: [0, 1.5, 4] as [number, number, number], look: [0, 1, 0] as [number, number, number], fov: 32, roll: 0 };
  if (keys.length === 1 || t <= keys[0].t) {
    const k = keys[0];
    return { pos: k.pos, look: k.look, fov: k.fov ?? 32, roll: k.roll ?? 0 };
  }
  let i = 0;
  while (i < keys.length - 1 && t > keys[i + 1].t) i++;
  const a: CamKey = keys[i];
  const b: CamKey = keys[Math.min(i + 1, keys.length - 1)];
  const span = b.t - a.t;
  const raw = span <= 0 ? 1 : clamp((t - a.t) / span, 0, 1);
  const e = EASE[b.ease ?? "inOut"](raw);
  return {
    pos: lerp3(a.pos, b.pos, e),
    look: lerp3(a.look, b.look, e),
    fov: lerp(a.fov ?? 32, b.fov ?? 32, e),
    roll: lerp(a.roll ?? 0, b.roll ?? 0, e),
  };
};

const NUM_KEYS: (keyof ActorPose)[] = ["x", "y", "z", "yaw", "scale", "look", "phase", "wave", "tilt", "headTilt"];
const BOOL_KEYS: (keyof ActorPose)[] = ["fork"];
const ENUM_KEYS: (keyof ActorPose)[] = ["mode", "expr", "facing", "helmet", "prop"];

const baseOf = (a: ActorSpec): Required<Pick<ActorPose, "x" | "y" | "z" | "scale" | "mode" | "expr" | "look" | "blink" | "phase" | "tilt" | "headTilt" | "facing" | "fork" | "helmet" | "prop">> & { yaw?: number; wave?: number } => ({
  x: a.x ?? 0,
  y: a.y ?? 0,
  z: a.z ?? 0,
  yaw: a.yaw,
  scale: a.scale ?? 1,
  mode: a.mode ?? "stand",
  expr: a.expr ?? "neutral",
  look: a.look ?? 0,
  blink: a.blink ?? false,
  phase: a.phase ?? 0,
  wave: a.wave,
  tilt: a.tilt ?? 0,
  headTilt: a.headTilt ?? 0,
  facing: a.facing ?? 0,
  fork: a.fork ?? false,
  helmet: a.helmet ?? "off",
  prop: a.prop ?? null,
});

type Pose = ReturnType<typeof baseOf>;

/** resolve one key over the base pose (missing fields fall back to the actor's static values) */
const keyPose = (base: Pose, k: ActorKey): Pose => {
  const p: Pose = { ...base };
  for (const f of NUM_KEYS) {
    const v = k[f];
    if (typeof v === "number") (p as Record<string, unknown>)[f] = v;
  }
  for (const f of BOOL_KEYS) {
    const v = k[f];
    if (typeof v === "boolean") (p as Record<string, unknown>)[f] = v;
  }
  for (const f of ENUM_KEYS) {
    const v = k[f];
    if (v !== undefined) (p as Record<string, unknown>)[f] = v;
  }
  if (k.blink !== undefined) p.blink = k.blink;
  return p;
};

/** character pose at shot clock t */
export const actorAt = (a: ActorSpec, t: number): Pose => {
  const base = baseOf(a);
  const keys = a.keys;
  if (!keys || keys.length === 0) return base;
  if (keys.length === 1 || t <= keys[0].t) return keyPose(base, keys[0]);
  let i = 0;
  while (i < keys.length - 1 && t > keys[i + 1].t) i++;
  const ka = keys[i];
  const kb = keys[Math.min(i + 1, keys.length - 1)];
  const span = kb.t - ka.t;
  const raw = span <= 0 ? 1 : clamp((t - ka.t) / span, 0, 1);
  const e = EASE[kb.ease ?? "inOut"](raw);
  const A = keyPose(base, ka);
  const B = keyPose(base, kb);
  const out: Pose = { ...A };
  for (const f of NUM_KEYS) {
    const av = A[f as keyof Pose];
    const bv = B[f as keyof Pose];
    if (typeof av === "number" && typeof bv === "number") (out as Record<string, unknown>)[f] = lerp(av, bv, e);
  }
  for (const f of ENUM_KEYS) {
    if (e >= 0.5) (out as Record<string, unknown>)[f] = B[f as keyof Pose];
  }
  if (e >= 0.5) out.blink = B.blink;
  return out;
};

/** which shot (and where in its own clock) a global frame shows */
export const shotAt = (scene: SceneSpec, frame: number): { shot: ShotSpec; t: number } => {
  const segs: Segment[] | undefined = scene.segments;
  if (segs && segs.length) {
    const s = segs.find((x) => frame >= x.a && frame < x.b) ?? segs[segs.length - 1];
    const shot = scene.shots.find((x) => x.id === s.shot) ?? scene.shots[0];
    const u = (frame - s.a) / Math.max(1, s.b - s.a);
    // plan.py writes the segment clock in frames; the director works in seconds
    return { shot, t: (s.t0 + (s.t1 - s.t0) * u) / scene.fps };
  }
  let acc = 0;
  for (const s of scene.shots) {
    const n = Math.max(1, Math.round(s.dur * scene.fps));
    if (frame < acc + n) return { shot: s, t: (frame - acc) / scene.fps };
    acc += n;
  }
  const last = scene.shots[scene.shots.length - 1];
  return { shot: last, t: last.dur };
};

/** a stable canvas cache key: the pose quantised so slow motion does not redraw every frame */
export const poseKey = (p: Pose) => {
  const q = (v: number) => Math.round(v * 100) / 100;
  return [q(p.x), q(p.y), q(p.z), q(p.yaw ?? 0), q(p.scale), p.mode, p.expr, q(p.look), p.blink, q(p.phase), q(p.wave ?? -99), q(p.tilt), q(p.headTilt), p.facing, p.fork, p.helmet, p.prop ?? "-"]
    .join(",");
};
