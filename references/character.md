# Character and cast

**Wren is the channel's hero.** Pip is retired. The old Pip assets and `Bridge.tsx` episodes are archived under
`legacy/` and must not be imported, copied into a new episode, or used as a reference for a new character.

The character lock is `assets/character/wren-lock.png`. It is a real frame from a finished Short, not a concept
drawing. If a new wardrobe makes Wren unrecognisable next to that image, the wardrobe is wrong.

## The lock

Wren is a flat 2D figure drawn into the same 600 x 1000 canvas as the rest of the cast, then lit by the 3D set.

- **Head:** round, oversized, about one third of the body height. The same head shape and face placement every
  time.
- **Hair:** indigo bob with a blunt fringe and a short side lock. It can be tied back for a role, but the
  silhouette must stay Wren.
- **Face:** warm skin, round brass glasses, thick dark brows, a small mouth. The eyes are simple dark ovals.
- **Outfit:** teal overshirt, rust trousers, dark boots, brass buttons, a small chest pocket with a pencil.
- **Signature prop:** the red tuning fork. It is optional; when a scene needs both hands, it stays home.
- **Line:** the same dark plum ink weight as the rest of the cast. No thick-and-thin "comic" outline, no
  gradient skin, no realistic shading.
- **Proportions:** the same rig as `BUILD` in `engine/bridge/toon.ts`. Do not stretch the torso, shrink the
  head, or give Wren five fingers. The house style is a designed simplification.

The wardrobe, hair styling, age of the role and props may change per episode. The head, face, proportions,
line weight and colour logic do not.

## The cast table

The cast lives in `shorts-studio/src/engine/toon/outfits.ts`. A shot names a `cast` key:

| Key | Who | Wardrobe | Use |
|---|---|---|---|
| `wren` | Wren | teal overshirt, rust trousers, indigo bob, brass glasses | default hero, explainers, studio and void |
| `sam` | Sam | rust jacket, gold cap, kid build | younger brother / audience stand-in |
| `doc` | Doc | cream coat, dark trousers, brown hair | expert, doctor, mission control |
| `voss` | Commander Voss | cream pressure suit, rust shoulder panels, cropped hair | Mars survival lead |
| `chen` | Dr. Chen | teal coveralls, brass belt, dark bob, glasses | Mars botanist |
| `kovic` | Engineer Kovic | orange EVA suit, grey harness, moustache, stout build | Mars engineer |

`voss`, `chen` and `kovic` are **Mars wardrobe variants on the same house rig**, not a different art style. A
survival `choice` may bill the Mars crew as an ensemble: Voss the commander, Chen the botanist, Kovic the
engineer. A `choice-long` is **Wren POV**: bill Wren as the protagonist, with Voss and Chen as the crew who
argue, demonstrate and oppose. Kovic remains available for the short ensemble `choice` but is not in the 90 s
cut.

## POV

A `choice-long` is Wren's film. She is in the hook, the failed fix, the decision and the judgement. Voss and Chen
can set the stakes, run the test or push back, but they do not make the choice for her. If a beat can be played
by any crew member, give it to Wren; if it can only be played by the engineer, it is probably a `choice`, not a
`choice-long`.

Do not add a new cast key unless you also add it to `CAST` and render a cast sheet. A key that is not in `CAST`
silently falls back to `wren`, which is worse than a visible error.

## Wardrobe rules

- Wardrobe follows the **topic**, not the mood. A Mars story gets flight suits; a kitchen story gets an apron.
- Keep the palette to 3-5 colours. One accent (brass, red, teal) is enough.
- The outfit must read at phone size. A tiny badge is texture, not information.
- No brands, logos, team crests, real uniforms or famous-character cosplay.
- A hat or helmet may change the silhouette; the face and head shape must still be Wren's (or the cast key's).
- A character can be wet, dusty, frosted or tired. Do not change their skin tone, face shape or age for a beat.

## Helmets

The EVA helmet is drawn in the same flat canvas as the head:

- `"helmet": "off"` — bare head. The default indoors.
- `"helmet": "on"` — a clear bubble over the face, with a gold visor reflection and a metal neck ring.
- `"helmet": "carry"` — the helmet is carried at the left hip, clear of the hand prop.

Rules:

- The bubble must have clearance around the hair. A hoop that touches the forehead reads as a wire, not glass.
- The specular highlight is a **thin streak high on the dome**, not a grey patch on the forehead.
- Frost is a `phase` from 0 to 1. Keep it subtle: a bright white rim reads as cracked glass. Frost creeps in
  from the rim, with a few short streaks, not a spiderweb.
- On the surface, the helmet is on. Indoors, it is off or carried. Do not mix the two in the same shot unless
  the action is the helmet going on or off.

## Hand props

The right hand can hold one prop:

| Prop | Draw |
|---|---|
| `keys` | a small keyring with three keys and a red fob |
| `wrench` | a heavy adjustable wrench |
| `clipboard` | a clipboard with a paper sheet |
| `seal` | a circular locking seal with a brass centre |

Rules:

- The prop is drawn in the same flat canvas, held by the hanging right hand. It is not a 3D object.
- A prop suppresses the wave. Do not set both `prop` and `wave`; the hand cannot do both.
- The prop must clear the body, the caption band and the card. If it disappears behind a table, move the actor.
- Keep one prop per shot. A character holding keys, a wrench and a clipboard is a clutter read, not a character.

## Acting keys

Each actor has a base pose and optional `keys`:

```json
{
  "name": "voss", "cast": "voss", "x": 0.25, "y": 0, "z": 0.35,
  "expr": "stern", "facing": 0, "helmet": "off", "prop": "keys",
  "keys": [
    { "t": 0, "expr": "stern", "headTilt": 1, "look": -0.3 },
    { "t": 3.7, "expr": "grin", "headTilt": -1, "look": 0.2 },
    { "t": 7.4, "expr": "stern", "headTilt": 0, "look": 0.3 }
  ]
}
```

- `t` is **seconds** on the shot clock, not frames.
- `expr`: `neutral`, `smile`, `grin`, `stern`, `shock`, `nervous`, `pained`, `relief`, `relief_open`, `oops`.
  Use the expression the beat needs; do not smile through a death scene.
- `look`: -1 to 1, the eye direction. Use it to point at a screen, a prop or another actor.
- `headTilt`: degrees of head roll. Small values (1-3) read as life; large values read as a cartoon.
- `facing`: -1, 0 or 1. `0` faces the camera; use 3/4 when the actor is talking to someone.
- `mode`: `stand`, `stroll`, `march`, `sit`, `fall`. The walk cycle is simple; do not ask for a run.
- `phase`: a per-actor number the set or wardrobe can read (frost, suit leak, etc.).
- `blink`: a boolean or a number. A blink is a single-frame accent, not a loop.

Keep the first key at `t: 0` and the last key at or before the shot's `dur`. A key after the cut is a pose the
viewer never sees.

## Cast sheet

After adding or changing a cast entry, render a still of the new look in the studio and compare it to
`assets/character/wren-lock.png`:

```bash
node ../scripts/stills.mjs <slug> S1 --scale 0.5
```

If the new look has a different head shape, eye placement, skin tone or line weight, it is a new character, not
a wardrobe. Either fix it or add it deliberately to the cast table and document it.
