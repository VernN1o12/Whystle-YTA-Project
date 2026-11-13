# Data contract

An episode is five files and one short glue component. The renderer is shared; nothing in an episode imports
three.js.

```
src/episodes/<slug>/
  episode.json    you write: script, science, cast, shot stubs, edit, fx, sound, short metadata
  words.json      voice.py writes: word timings after pause tightening
  timeline.json   plan.py writes: segments, captions, audio paths and levels
  shots.json      you write: set, light, duration, camera keys, actors, fx, dof, phase
  index.tsx       glue: timeline + shots -> SceneSpec -> ToonShort + Captions + Audio
```

## Clocks: read this twice

| Value | Unit | Where |
|---|---|---|
| `episode.edit[].from` | **frames** | the shot's clock at the cut |
| `timeline.segments[].a`, `.b` | **frames** | absolute voice frames |
| `timeline.segments[].t0`, `.t1` | **frames** | shot-local clock |
| `timeline.total` | **frames** | film length |
| `shots.json.shots[].dur` | **seconds** | shot length |
| `shots.json.shots[].cam[].t` | **seconds** | shot clock |
| `shots.json.shots[].actors[].keys[].t` | **seconds** | shot clock |
| `words.json[].s`, `.e` | **seconds** | voice track |
| `timeline.captions[].a`, `.b` | **frames** | absolute film |

`plan.py` and the director convert. Do not put seconds in `from` or frames in a camera key. Most "the camera
jumps" bugs are a seconds/frames mix-up.

## `episode.json`

```jsonc
{
  "id": "MarsColonySurvival",        // must match the registered composition id
  "slug": "mars-colony-survival",    // must match the folder name
  "topic": "MARS COLONY: Life Support Failed — You Have 2 Hours",
  "format": "shorts",
  "fps": 30,
  "lead": 2,                         // frames a word cut lands before the word
  "tail": 0.5,                       // seconds after the last word
  "short": {
    "preset": "choice",              // snap | twist | choice | choice-long
    "pattern": "choice",             // twist | demo-trio | countdown | arc | choice
    "route": "code",
    "title": "…",
    "search_phrase": "mars colony survival",
    "wardrobe": "…",
    "hook": "…",
    "loop": "…"
  },
  "title": ["Line 1", "Line 2", "Line 3"],
  "captions": {
    "on": true,
    "maxWords": 2,
    "accent": ["two", "one", "oxygen"],
    "size": 104,
    "y": 0.7
  },
  "script": [
    { "beat": "1 HOOK", "text": "What if your Mars habitat just lost oxygen?" }
  ],
  "science": [
    { "claim": "…", "working": "…", "source": "…", "status": "verified" }
  ],
  "cast": ["voss", "chen", "kovic"],
  "shots": [
    { "id": "H1", "size": "wide", "set": "habitat", "key": 30, "note": "…" }
  ],
  "edit": [
    { "shot": "H1", "at": "f:0" },
    { "shot": "H2", "at": "lost" }
  ],
  "fx": [
    { "at": "oxygen", "kind": "flash", "color": "#FF3333" }
  ],
  "vote": {                          // choice-long only: the final 4-up card
    "at": "right",                   // cue for the card's first frame
    "question": "WAS I RIGHT?",
    "options": [
      { "letter": "A", "label": "ROVER", "detail": "8 km dash · motors eat the cell" },
      { "letter": "B", "label": "GREENHOUSE", "detail": "seal the dome · 90 min to ramp" },
      { "letter": "C", "label": "SURFACE", "detail": "my walk · heater eats the cell" },
      { "letter": "D", "label": "SIGNAL", "detail": "call Earth · help in six weeks" }
    ]
  },
  "sound": { "clips": {}, "events": [], "repeats": [], "music": {}, "levels": {} }
}
```

- `title` is a list of display lines for the storyboard; `short.title` is the working title.
- `captions.on` must be true. `maxWords` 1-3. `y` 0.68-0.70 for Shorts.
- `cast` is the billing/roster and must cover every `cast` key used in `shots.json`. Wren leads the explainers;
  a survival `choice` may bill the Mars crew (`voss`, `chen`, `kovic`) instead.
- `shots` is the **edit's shot list**, not the visual data. It supplies `id`, `size`, `set`, `key`, `note`.
  `key` is a frame index for the storyboard; it is not used by the film.
- `edit` is the cut list. `at` is a word, `+frames`, `s:seconds` or `f:frames`. The first entry is forced to
  frame 0. A word cut lands `lead` frames before the word.
- `from` is optional and is **frames** on the shot's clock. Use it to enter a shot mid-move, or for a reverse
  loop.
- `reverse: true` plays from `from` to `to` (default 0). A loop often uses `"from": 115, "reverse": true`.
- `card` is A-D. `plan.py` copies it to the segment so the episode overlay can draw the choice card.
- `fx` cues use the same `at` grammar as the edit. The resolved frame is `f` in `timeline.fx`.
- `vote` is required for `choice-long` and ignored by the shorter presets. `at` uses the edit cue grammar; the
  card runs from that frame to `total`.
- `question` is the spoken question and is repeated on the card. Exactly four options A-D; `label` is 1-2 words
  and `detail` is 3-7 words. The four labels must match the A-D cards used earlier in the film.
- `plan.py` resolves `vote` into `timeline.vote` with `a`/`b` frames. The card hides the caption band while it is
  up because the card carries the question and options. `VoteCard` highlights the letter Wren chose (C in the
  Mars cut).

## `shots.json`

```jsonc
{
  "shots": {
    "H1": {
      "set": "habitat",
      "light": "habitat",
      "dur": 3.83,                    // seconds
      "cam": [
        { "t": 0, "pos": [1.5, 1.66, 3.8], "look": [0.0, 1.22, -1.6], "fov": 42 },
        { "t": 3.83, "pos": [1.7, 1.63, 3.4], "look": [0.15, 1.2, -1.8], "fov": 40 }
      ],
      "actors": [
        {
          "name": "voss", "cast": "voss",
          "x": 0.25, "y": 0, "z": 0.35,
          "expr": "stern", "facing": 0, "helmet": "off", "prop": "keys",
          "keys": [
            { "t": 0, "expr": "stern", "headTilt": 1, "look": -0.3 },
            { "t": 3.7, "expr": "grin", "headTilt": -1, "look": 0.2 }
          ]
        }
      ],
      "fx": [
        { "kind": "ring", "x": -2.4, "y": 2.75, "z": -1.95, "t0": 0, "t1": 1.0, "size": 2.6 }
      ],
      "dof": { "track": "voss", "cInf": 10 },
      "phase": 1
    }
  }
}
```

- `set` must be in the set registry (`studio`, `void`, `scan`, `scan2`, `habitat`, `mars_surface`,
  `greenhouse`, `schematic`).
- `light` must be one of the active presets: `studio`, `void`, `habitat`, `mars`, `greenhouse` or `schematic`
  (`day` and `golden` still exist in the type for legacy scenes).
- `dur` is seconds and should equal the last camera key's `t`.
- `cam` is ordered by `t`. Use at least two keys for a move; one key is a locked-off shot.
- `fov` 30-50. `roll` is radians, small values only.
- `actors` can be empty for an insert. `cast` must be in `CAST`.
- `dof.track` must match an actor's `name`. `dof.focus` is metres.
- `phase` is a number the active set's `update(t, phase)` reads. Mars schematic: 0 = cell only, 1 = loads
  lighting, 2 = branches dying.
- `fx` is optional. `t0`/`t1` are seconds on the shot clock.

## `timeline.json`

`plan.py` writes it. Do not hand-edit unless you are debugging.

```jsonc
{
  "slug": "mars-colony-survival",
  "title": "…",
  "format": "shorts",
  "fps": 30,
  "total": 1727,
  "segments": [
    { "shot": "H1", "a": 0, "b": 45, "t0": 0, "t1": 45, "line": "What if your Mars habitat just" }
  ],
  "shots": [
    { "id": "H1", "size": "wide", "key": 30, "len": 115, "first": 0, "line": "…", "note": "…" }
  ],
  "fx": [
    { "kind": "flash", "color": "#FF3333", "f": 103 }
  ],
  "captions": [
    { "a": 0, "b": 18, "text": "What if" }
  ],
  "captionStyle": { "size": 104, "y": 0.7, "accent": ["two"] },
  "vote": {
    "a": 2433,
    "b": 2662,
    "question": "WAS I RIGHT?",
    "options": [
      { "letter": "A", "label": "ROVER", "detail": "8 km dash · motors eat the cell" },
      { "letter": "B", "label": "GREENHOUSE", "detail": "seal the dome · 90 min to ramp" },
      { "letter": "C", "label": "SURFACE", "detail": "my walk · heater eats the cell" },
      { "letter": "D", "label": "SIGNAL", "detail": "call Earth · help in six weeks" }
    ]
  },
  "audio": {
    "voice": "mars-colony-survival/voice.wav",
    "sfx": "mars-colony-survival/sfx.wav",
    "music": "mars-colony-survival/music.wav",
    "voiceVol": 0.8,
    "sfxVol": 0.65,
    "musicVol": 0.35
  }
}
```

- `segments` are contiguous from 0 to `total`. `a`/`b` are absolute frames; `t0`/`t1` are shot-local frames.
- A reverse segment has `t1 < t0`. The shot's `dur` must be long enough for `t0`.
- `captions` are absolute frames. `a` is the first word; `b` is clamped to the next chunk and the end.
- `vote` is present only for `choice-long`. `a`/`b` are absolute frames and `b` is normally `total`.
- `audio` paths are relative to `public/`. `voiceVol`, `sfxVol` and `musicVol` are set by `sfx.py`.
- `shots` is the storyboard list, in first-appearance order.

## `index.tsx`

The glue is deliberately boring. Copy the template or a finished episode and change the slug:

```tsx
const SCENE: SceneSpec = (() => {
  const v = visual.shots as unknown as Record<string, any>;
  const shots: ShotSpec[] = timeline.shots.map((s) => {
    const d = v[s.id];
    if (!d) throw new Error(`<slug>: no visual data for shot ${s.id} in shots.json`);
    return {
      id: s.id,
      set: d.set,
      light: d.light,
      dur: d.dur,
      cam: d.cam,
      actors: d.actors,
      fx: d.fx,
      dof: d.dof,
      phase: d.phase,
    } as ShotSpec;
  });
  return { slug: timeline.slug, fps: timeline.fps, width: 1080, height: 1920, shots,
           segments: timeline.segments as unknown as Segment[] };
})();
```

Then:

```tsx
<FrameProvider format="shorts">
  <ToonShort scene={SCENE} />
  <Captions f={f} chunks={timeline.captions} style={timeline.captionStyle as never} />
  <ChoiceCard f={f} />   {/* only for choice episodes */}
  <VoteCard f={f} />     {/* only for choice-long; reads timeline.vote */}
  <AudioTrack />
</FrameProvider>
```

- `TOTAL = timeline.total` is exported for the composition.
- `Board` renders one shot per board frame at the first camera key.
- `ChoiceCard` finds `timeline.segments[].card` for the current absolute frame and draws A-D. It returns null
  when no card is active.
- `VoteCard` finds `timeline.vote` and draws the full-screen 4-up card from `a` to `b`. It returns null when the
  block is absent. Hide `Captions` while the card is up (`f >= vote.a && f < vote.b`); the card carries the
  spoken question and options, and covering it with captions reads as a double print.
- Do not import `three`, `useThree`, a set builder or a cast draw function into an episode.

## `words.json`

A list of `{ "w", "s", "e", "p" }` objects. `s`/`e` are seconds; `p` is punctuation. `plan.py` owns the
caption grouping. Do not write it by hand unless fixing one alignment.

## Edit cue grammar

| Cue | Meaning |
|---|---|
| `"f:0"` | absolute frame 0 |
| `"s:4.2"` | 4.2 seconds on the voice track |
| `"+18"` | 18 frames after the previous cut |
| `"oxygen"` | the first occurrence of the word after the previous cut |
| `"oxygen#2"` | the second occurrence after the previous cut |
| `"oxygen+3"` | the word cue plus 3 frames |
| `"S3+2"` | sound cue: shot S3's start plus 2 frames (sfx.py) |

A word cut lands `lead` frames before the word. If the word is the first in the film, the cut is frame 0.

## Common data errors

| Symptom | Cause |
|---|---|
| `no visual data for shot X` | shot id in `episode.json`/`timeline` but not in `shots.json` |
| camera jumps at a cut | `from` in seconds, or camera key in frames |
| shot plays backwards unexpectedly | `t1 < t0` from a bad `from`/`to` |
| character T-poses or freezes | actor `keys` times are after `dur`, or the first key is not at 0 |
| black or white frames | render context lost; re-render the chunk, check `qa_frames.py` |
| captions missing | `captions.on` false, or `plan.py` wrote none because `words.json` is empty |
| choice card never appears | `card` missing from the edit entry, or the overlay compares shot-local frames to absolute |
| vote card never appears | no `vote` block, or its `at` cue does not resolve; run `plan.py` and check `timeline.vote` |
| vote card covers the face | H1 camera is too low; raise the actor/camera so the face sits above 780 px |
| captions print under the vote card | `Captions` is not hidden during the vote; render it only when `f < vote.a \|\| f >= vote.b` |
| `unknown set` | set name typo or not registered in `sets/index.ts` |
| `unknown cast` falls back to Wren | cast key typo; add it to `CAST` or fix the shot |
| `id` not found by master.py | `episode.json.id` does not match `src/episodes/index.ts` |

Run `python ../scripts/check_episode.py <slug> --require-timeline` before every render. It checks the whole
contract and prints the exact field that is wrong.
