import { buildStudio } from "./studio";
import { buildVoid } from "./void";
import { buildScan } from "./scan";
import { buildHabitat, buildMarsSurface, buildGreenhouse, buildSchematic } from "./mars";
import type { SetHandle } from "../types";

/** the set registry: a shot names a set, the renderer builds it once and toggles visibility */
export const SETS: Record<string, () => SetHandle> = {
  studio: buildStudio,
  void: buildVoid,
  scan: () => buildScan(1),
  scan2: () => buildScan(2),
  habitat: buildHabitat,
  mars_surface: buildMarsSurface,
  greenhouse: buildGreenhouse,
  schematic: buildSchematic,
};

export const buildSet = (name: string): SetHandle => {
  const f = SETS[name];
  if (!f) throw new Error(`toon: unknown set "${name}" (known: ${Object.keys(SETS).join(", ")})`);
  return f();
};
