# Sets and props

A set is a procedural painted room, landscape or diagram built once per episode. The renderer builds every set
named in `shots.json` at mount, keeps them in a map and toggles visibility per shot. There is no per-episode
three.js.

## The registry

`shorts-studio/src/engine/toon/sets/index.ts`:

```ts
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
```

| Set | What it is | Light |
|---|---|---|
| `studio` | warm plaster room, tall window, plank floor, desk, shelf, swatch board, rug, plant | `studio` |
| `void` | dark painted stage with six floating colour orbs | `void` |
| `scan` | dark lab, one portrait brain-scan monitor | `void` |
| `scan2` | the same lab with two subjects | `void` |
| `habitat` | Mars habitat: deck, O2 dial, dead scrubber, suit bay, cryo pod, table, hatch, comms screen | `habitat` |
| `mars_surface` | butterscotch sky, rust dust, rover, backup dome, comms dish, Earth | `mars` |
| `greenhouse` | glass dome, two algae bioreactors, hatch, grow beds, O2 screen | `greenhouse` |
| `schematic` | portrait power board with a central cell and five systems | `schematic` |

Keep a Short to **four sets or fewer**. Each set is a full painted world; five or more sets at 1080 x 1920 can
push the GPU into a context loss and make the render slower, not richer.

## A set is a function

```ts
import * as THREE from "three";
import { Batch, lam } from "../../bridge/build";
import { ctex } from "../../bridge/paint";
import { addBox, addCyl, plant } from "../props";
import type { SetHandle } from "../types";

export const buildExample = (): SetHandle => {
  const root = new THREE.Group();
  const b = new Batch();
  const M = {
    wall: lam("exampleWall", () => ({ color: "#c9b79a" })),
    metal: lam("exampleMetal", () => ({ color: "#5a625e" })),
  };

  b.add(/* geometry */);
  root.add(b.mesh);
  root.add(/* glow cards, screens, animated groups */);

  return {
    root,
    update: (t, phase) => {
      // per-frame animation: a needle, a blinking lamp, a rotating dish
    },
  };
};
```

- `root` is the whole set. The stage toggles `root.visible`.
- `update(t, phase)` is called once per frame for the active set. `t` is seconds on the shot clock; `phase` is
  the shot's `phase` (undefined when not set).
- Build static geometry once. Do not allocate new geometry in `update`.
- Keep animated groups (a dish, a needle, a beacon) as named `THREE.Group`s and rotate them in `update`.
- Use `Batch` for static geometry so the set is one draw call per material.

## Painted textures

- `ctex(key, width, height, draw)` creates a cached canvas texture. The key must be unique across the whole
  studio; two sets with the same key share the first texture.
- Paint large shapes first, then grain, scuffs, seams and highlights. A flat colour reads as plastic.
- Keep text on screens short and large. A 768 x 512 screen with 20 px text is unreadable at phone size.
- Use `screenTex` for a readout: dark glass, header, rows, accent border. The Mars screens use it.
- Use `glowTex`/`glowCard` for practical spill. Keep the source small; a giant additive card washes the frame.

## Geometry rules

- World units are metres. A standing adult is about 1.8 m. A table is 0.75 m high. A door is 2.0-2.2 m.
- `addBox(batch, material, cx, y, cz, w, h, d)` sits the box on `y`.
- `addCyl(batch, material, cx, y, cz, r, h, seg)` sits the cylinder on `y`.
- `addBlob(batch, material, cx, y, cz, rx, ry, rz)` takes **radii**, not diameters. At 2.2 m a 0.13 radius is
  a 26 cm shape. Near-lens blobs must be 0.03-0.08 unless they are a deliberate silhouette.
- `beam(batch, material, a, b, r)` is a cylinder between two points. Use it for dome ribs, struts and cables.
- `pipe(batch, material, x, y, z, len, r, axis)` is an upright or axis-aligned pipe.
- Keep the camera axis clear. A column, rib or pipe dead-on to the lens splits the frame in half. Offset the
  ring by half a step, or stage the camera 3/4.
- Do not put a tiny object at 8 km and expect it to read. A 5 cm mast beacon at 15 m is a stray dot; remove it
  or attach it to a visible structure.
- A prop that is meant to be held must be drawn in the actor's canvas (`prop`), not placed in the set at hand
  height. A 3D prop floating beside a hand reads as a mistake.

## Screens and diagrams

- A screen is a `MeshBasicMaterial` plane with a painted texture. It should face the camera at a slight angle,
  not exactly parallel to the lens.
- Keep the screen inside the safe area and above the caption band. If the caption covers the readout, the shot
  is a caption with a screen behind it, not a readout insert.
- For a portrait diagram, stack nodes vertically. A five-across landscape schematic loses its labels in 9:16.
- Use a `phase` to animate a diagram: 0 = one cell only, 1 = loads lighting, 2 = branches dying. The set reads
  the phase in `update`.
- Do not animate text size per frame. Swap a texture or reveal a group.

## The Mars sets

The Mars episode is split into four files plus shared helpers:

```
sets/mars/shared.ts      beam, pipe, glowTex, glowCard, screenTex
sets/mars/habitat.ts     deck, O2 dial, scrubber, suit bay, cryo, table, hatch, comms
sets/mars/surface.ts     sky, dust, rover, backup dome, dish, Earth
sets/mars/greenhouse.ts  dome ribs, algae tanks, hatch, grow beds, O2 screen
sets/mars/schematic.ts   portrait power board and phase animation
sets/mars.ts             re-exports the four builders
```

`sets/mars.ts` is a re-export barrel; do not put geometry in it. The registry imports from `./mars`.

Mars lessons that apply everywhere:

- **The dish** is a large foreground/midground object. Put it at a 3/4 angle and keep Earth at the edge; a
  dish dead-on is a grey oval.
- **The dome ribs** are radial beams. A beam exactly on the z axis runs down the lens in a greenhouse shot;
  offset the ring by half a step.
- **The power board** is portrait (3.0 x 3.6 m). A landscape five-across board cannot hold labels at phone size.
- **The scrubber** is a pure insert. A readout with a bezel, frost specks and a lamp becomes a prop cluster;
  keep the screen and one small lamp.
- **The beacon** on the schematic is a 0.03 m sphere, not a 0.1 m orb. A 0.1 m basic-material sphere at 2.8 m
  reads as a giant red ball.

## Adding a set

1. Create `src/engine/toon/sets/<name>.ts` with a `build<Name>()` function.
2. Register it in `sets/index.ts`.
3. Add its light preset to `engine/bridge/lights.ts` if it needs a new one, and to `LightName` in
   `engine/toon/types.ts`.
4. Build a single test episode with one shot on the set. Render a still at 0.5 scale.
5. Check the camera at eye level, the key light, the ink pass and the caption band before adding a second shot.
6. Add the set to the table in this document.

Do not add a set for one shot if an existing set can be redressed. A new set is a new world; it costs render
time and memory.

## Props

`src/engine/toon/props.ts` has reusable 3D dressing:

- `jar`, `plant`, `bookStack` — studio and habitat dressing.
- `addBox`, `addCyl`, `addBlob` — the basic shapes.
- `soundRing`, `drawFx` — 2D effect cards (ring, note, burst, star) placed in the scene and facing the camera.

`src/engine/toon/outfits.ts` has the 2D hand props: `keys`, `wrench`, `clipboard`, `seal`. They are held by the
hanging right hand and suppress the wave.

Keep props motivated: a character picks up the keys because they are leaving, not because the frame is empty.
A prop that does not move, get looked at or change the decision is clutter.
