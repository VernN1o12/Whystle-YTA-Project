# Visual style

The house look is **painted 3D toon**: a flat 2D character lit inside a hand-painted 3D set, with thin ink
outlines on the geometry, soft depth of field, a warm key, cool shade and a restrained grade. It should read as a
painted illustration that happens to move, not as a game render.

## The frame

- **1080 x 1920, 30 fps. The preset owns the length:** `snap` 24-35 s, `twist` 46-57 s, `choice` 46-59 s,
  `choice-long` 75-150 s.
- The player covers roughly the top 130 px, the bottom 420 px and the right 130 px. Faces and the key object
  live inside that safe area.
- The caption band is centred at **y = 0.68-0.70** of the frame. Do not put a face, a number or a readout there.
- A `choice-long` vote card starts at **780 px from the top** and runs to **320 px from the bottom**. The face
  and eyes must sit above 780 px. The card hides the caption band for its 7-8 s hold because it carries the
  question and options itself.
- Compose for a phone: one clear subject, one readable prop, one colour conflict. A wide room is revealed by a
  pan or a tilt, not by a flat wide shot.
- The bottom 22% is player UI. Do not stage the only clue there.

## Camera

- Eye level is about **1.5-1.7 m** for a standing adult. Low camera (0.7-1.2 m) makes a room loom; high camera
  (2.0-2.4 m) makes a character small.
- FOV **30-50** is the house range. 30-35 is a portrait; 40-50 is a room; 55+ distorts and flattens the set.
  Two deliberate exceptions: 55° to fit both greenhouse bioreactors in one wide, and 16-17° to make Earth read
  from the surface. Mark them in the shot data and keep them rare; do not make them the default.
- Move with **ease-out bursts**: a slow push-in, a small lateral drift, a tilt up a tall object. Hold still for
  most of the shot; the cut does the work.
- Put the camera at a **3/4 angle** to the set, not dead-on. Dead-on makes columns, screens and doorways read as
  flat cards and puts geometry on the lens axis.
- Keep a foreground shape (a tank edge, a crate, a plant, a doorframe) near the lens for depth. It should be
  soft and dark, not a giant blob.
- For a reverse loop, the camera must end where it started, or the cut will jump.

## Composition

- **One idea per frame.** If the viewer has to choose between a face and a screen, pick one.
- Put the face at about **38-45% from the top** in a medium; leave the caption band clear.
- Put the key object in the middle third and make it larger than life. A gauge, a card, a switch, a wrench.
- Use **leading lines**: a pipe, a table edge, a beam, a corridor. They should point at the subject, not split
  the frame.
- **Do not put a structural column on the camera axis.** A dome rib, a pipe or a post that runs down the centre
  of the lens reads as a split frame. Offset it by half a step or stage the camera 3/4.
- Avoid tangencies: a hand touching a table edge, a head touching a beam, a prop touching a caption.
- Check the **silhouette** at phone size. If you cannot tell what the object is at 360 px wide, simplify it.

## Light

Use the set's light preset, not a generic "day":

| Light | Use |
|---|---|
| `studio` | warm plaster room, window key, cool plaster shade |
| `void` | dark colour stage, cool key, floating painted orbs |
| `habitat` | warm amber emergency light, red warning glows |
| `mars` | butterscotch sky, rust bounce, hard sun |
| `greenhouse` | cool green key, bioluminescent accents |
| `schematic` | clinical blue-white control room |

Rules:

- One key, one shade, one practical. The practical (a lamp, a screen, a glow card) must be visible in frame.
- Warm key and cool shade is the default. Do not light a character with a flat white.
- The character receives the set light: tint, shade and ground shadow. Never paste a pure-emission character
  into a lit room.
- Use a glow card for a screen or a lamp, but keep the source small. A 0.1 m sphere at 2 m reads as a balloon;
  a 0.03 m lamp reads as a lamp.
- Do not add a sun, moon or beacon that is not attached to a visible object. A floating dot in the sky reads as
  a mistake.

## Depth of field

- Focus on the actor (`dof.track`) or the key object (`dof.focus` in metres).
- `cInf` 7-13 is the normal range. A lower value blurs faster; a higher value keeps the set readable.
- Foreground blur is good; foreground blobs are not. `addBlob` takes **radii**, not diameters. At 2.2 m, a
  0.13 radius is a 26 cm shape. Keep near-lens shapes at 0.03-0.08 unless they are meant to be a silhouette.
- Do not blur a readout the viewer is supposed to read. If the screen matters, focus on it.

## Ink and grade

- The ink pass draws thin dark lines on geometry edges and creases. It is part of the look; do not disable it
  for a "clean" shot.
- Bloom is restrained. A bright practical can glow; a whole frame should not.
- The grade is a warm/cool split, not a filter. Keep skin readable and the set's key colour intact.
- Avoid crushed blacks and blown whites. The QA gate fails a frame with mean luma below 0.06 or above 0.88.

## Captions

Captions are **always on** and are part of the composition:

- 1-3 words, hard swap on the word, white bold with a dark outline.
- Lower-middle, `y` 0.68-0.70, size 100-112 for Shorts.
- Accent the number, deadline, choice letter or payoff word. One accent per chunk at most.
- Never put a caption over a face, a gauge or a card subtitle. If the frame is busy at the bottom, move the
  subject up or reframe.
- Captions are DOM, so they survive a WebGL failure. A white frame with captions is still a failed render;
  check the pixels.

## Storyboard QA

Render one still per shot at its key frame, then the same stills with `--guides`:

```bash
node ../scripts/stills.mjs <slug> --scale 0.5
node ../scripts/stills.mjs <slug> --guides --scale 0.5
python ../scripts/board.py <slug>
python ../scripts/board.py <slug> --guides
```

For every still, ask:

1. Is the subject inside the safe area?
2. Is the face clear of the caption band and the top bar?
3. Is the key object readable at phone size?
4. Is there one clear light source and one clear shadow?
5. Does the frame have depth (foreground, midground, background)?
6. Is any prop floating, clipped or intersecting a body?
7. Does the shot belong to the same set as the previous shot (unless it is a deliberate cutaway)?
8. Does the next shot cut on a new idea, not a new angle on the same idea?
9. Is the camera inside a wall, a rover or a bioreactor? A valid still can still be shot from inside geometry.
10. If this shot carries the vote card, is the face above 780 px?
11. For a close-up, render the actual timeline frame with captions, not just the board still. A still has no
    captions and will hide a mouth-band collision.

After the individual fixes, rebuild the contact sheets (`sheet1.png`, `sheet2.png`) and read the whole board. A
camera can sit inside a rover or a bioreactor and still produce a valid still; the board is where that shows. A
sheet built before a reframe is stale — rebuild it before the render.

## Colour and continuity

- Keep a small palette per set: 3-5 dominant colours plus one accent. The Mars habitat is amber/rust/cream
  with red warning; the greenhouse is green/teal with a warm brass accent; the surface is butterscotch/rust with
  a blue Earth.
- Match the light direction across shots in the same scene. A window that lit the left side in the wide cannot
  light the right side in the close-up.
- Keep props in the same hand and on the same table between shots. Continuity errors read as carelessness.
- The first and last frames must match for the loop. Check them side by side before publishing.
