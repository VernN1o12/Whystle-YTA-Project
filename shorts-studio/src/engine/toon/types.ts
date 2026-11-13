// The toon engine's data model. An episode is data only: shots, camera keys, actors, effects.
// No episode file imports three.js; the single renderer (ToonShort) reads these types.

import type * as THREE from "three";
import type { Expr } from "../bridge/toon";

export type Vec3 = [number, number, number];
export type LightName = "day" | "golden" | "studio" | "void" | "habitat" | "mars" | "greenhouse" | "schematic";
export type Ease = "linear" | "out" | "inOut";

export type CamKey = {
  /** shot clock, seconds */
  t: number;
  pos: Vec3;
  look: Vec3;
  fov?: number;
  roll?: number;
  ease?: Ease;
};

export type Mode = "stand" | "stroll" | "march" | "sit" | "fall";

/** a hand prop drawn into the actor's canvas (keys, wrench, clipboard, locking seal) */
export type MarsProp = "keys" | "wrench" | "clipboard" | "seal";

/** everything that describes a character at one instant */
export type ActorPose = {
  x?: number;
  y?: number;
  z?: number;
  yaw?: number;
  scale?: number;
  mode?: Mode;
  expr?: Expr;
  look?: number;
  blink?: boolean | number;
  phase?: number;
  wave?: number;
  tilt?: number;
  headTilt?: number;
  facing?: -1 | 0 | 1;
  /** the hero's signature prop, drawn in the same flat canvas as the body */
  fork?: boolean;
  /** Mars wardrobe: a clear helmet over the face, or carried (off = bare head) */
  helmet?: "on" | "off" | "carry";
  /** a hand prop drawn in the same flat canvas as the body */
  prop?: MarsProp | null;
};

export type ActorKey = ActorPose & { t: number; ease?: Ease };

export type ActorSpec = ActorPose & {
  name: string;
  /** key into the cast table (outfit + head seed) */
  cast: string;
  keys?: ActorKey[];
};

export type FxKind = "ring" | "note" | "burst" | "star";

export type FxSpec = {
  kind: FxKind;
  x: number;
  y: number;
  z: number;
  t0: number;
  t1: number;
  size?: number;
  seed?: number;
};

export type ShotSpec = {
  id: string;
  /** registry name of the set builder */
  set: string;
  light: LightName;
  /** seconds of shot clock */
  dur: number;
  cam: CamKey[];
  actors: ActorSpec[];
  fx?: FxSpec[];
  dof?: { focus?: number; track?: string; cInf?: number };
  grade?: LightName;
  /** set variant for this shot (the set's update() reads it): e.g. 0 = all dark, 1 = loads lighting */
  phase?: number;
};

/** one entry of the edit: which stretch of a shot's clock a global frame range shows */
export type Segment = { shot: string; a: number; b: number; t0: number; t1: number };

export type SceneSpec = {
  slug: string;
  fps: number;
  width: number;
  height: number;
  shots: ShotSpec[];
  /** when present the film follows the edit; otherwise shots play in order */
  segments?: Segment[];
};

/** a built set: its root, a per-frame animation hook and the shot's set phase */
export type SetHandle = { root: THREE.Group; update: (t: number, phase?: number) => void };
