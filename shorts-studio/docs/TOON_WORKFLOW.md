# The painted 3D toon workflow

The studio renders every episode through **one** renderer: a data-driven pipeline that turns a handful of
JSON files into a finished vertical Short. There is no per-episode three.js — episodes are *data*;
`src/engine/toon/ToonShort.tsx` is the renderer.

```
episode.json ──► voice.py ──► words.json ──► plan.py ──► timeline.json ──────────────┐
  (script)    (KokoroTTS, free)              (the edit)                               │
     │                                                                               ▼
     ├──► sfx.py ──► public/<slug>/{sfx,music}.wav ──► levels written ──► timeline.json
     │                                                                                 │
shots.json ───────────────────────────────► src/episodes/<slug>/index.tsx ◄──────────┘
  (set, light, camera, cast, fx, dof, phase)      │
                                                 ▼
                                        ToonShort + Captions + Audio
                                                 │
                                        remotion render ──► master.py ──► -14 LUFS
```

Episode files live in `src/episodes/<slug>/`.

## The five pieces

| file | written by | purpose |
|---|---|---|
| `episode.json` | you | the script, beats, shot stubs (id/size/set), the edit (cut list), fx cues, the `choice-long` vote block, sound spec |
| `words.json` | `scripts/voice.py` | word timings after pause tightening |
| `timeline.json` | `scripts/plan.py` | the edit resolved onto the voice: segments, caption chunks, vote window, audio paths + levels |
| `shots.json` | you | the *visual* side of each shot id plan.py knows: set, light, camera, actors, FX, depth of field |
| `index.tsx` | a few lines | glues timeline.json + shots.json into the `SceneSpec` and renders `ToonShort` + `Captions` + voice/SFX/music |

### `episode.json` (the words and the edit)
```jsonc
{
  "id": "colorSounds",          // MUST match the Composition id and master.py's expectation
  "format": "shorts",
  "script": [{ "beat": "1 HOOK …", "text": "…" }, …],
  "shots": [{ "id": "S1", "size": "medium", "set": "studio", "key": 30, "note": "…" }],
  "edit": [{ "shot": "S4", "at": "trumpet" }],  // "at" is a word ("paste#2" = its 2nd occurrence after the previous cut), "+frames", "s:1.2" or "f:37"
  "fx": [{ "at": "trumpet", "kind": "flash", "color": "#FF6A5A" }],
  "vote": { "at": "right", "question": "WAS I RIGHT?", "options": [
    { "letter": "A", "label": "ROVER", "detail": "8 km dash · motors eat the cell" }, … ] },  // choice-long only
  "sound": { "clips": {…}, "events": […], "repeats": […], "music": { "clip": "music", "until": "You+12" },
             "levels": { "sfx_lu": -5.0, "music_lu": -10.5 } }
}
```

### `shots.json` (the look)
```jsonc
{
  "shots": {
    "S4": {
      "set": "void", "light": "void", "dur": 1.3,
      "cam": [ { "t": 0, "pos": [x, y, z], "look": [x, y, z], "fov": 40 },
                { "t": 1.3, "pos": […], "look": […], "fov": 39 } ],
      "actors": [{ "name": "wren", "cast": "wren", "x": 0, "y": 0, "z": 0, "expr": "smile",
                    "fork": true, "keys": [{ "t": 0, "expr": "smile", "headTilt": -2 }, …] }],
      "fx": [{ "kind": "ring", "x": -2.4, "y": 2.75, "z": -1.95, "t0": 0, "t1": 1.0, "size": 2.6 }],
      "dof": { "focus": 4.9, "cInf": 9 }        // "track": "wren" focuses a moving actor instead
    }
  }
}
```

## The gotchas that will bite you

* **Clocks.** `timeline.json`'s segment clock (`a`, `b`, `t0`, `t1`) is in **frames** at 30 fps.
  `shots.json` camera keys (`t`) and actor keys are in **seconds** on each shot's own clock (`0` = the cut lands).
* **Shot ids must agree** across `episode.json` → `plan.py` → `shots.json`. Add a shot to `episode.json`'s
  `shots` list and give it the same key in `shots.json`; `plan.py` warns about shots that are defined but never edited in.
* **`id` in `episode.json`** must match the Remotion Composition id (`src/episodes/index.ts`) — `master.py`
  renders `ep['id']` by that name and the Shorts spec check depends on the format.
* **Voice is free and local.** `voice.py` calls KokoroTTS at `http://localhost:7860` only when the text or voice
  block changes (cached by hash); re-running to retune gaps is free. ElevenLabs is an explicit fallback for the voice
  and still generates SFX. SFX clips are cached in `library/sfx/` by `sha1(prompt|seconds)`.
* **Sound-generation caps at 30 s per clip.** Long music beds are generated as ≤30 s clips and tiled by `sfx.py`
  (seams faded). Set `music.until` to a cue to fade the bed out early.
* **Re-running `plan.py` rewrites `timeline.json`** — re-run `sfx.py` after it so the levels come from the new mix.
* **Chrome OOMs on long renders** of the 3D scene on ≤8 GB RAM. Render in 288-frame chunks and concat:
  `npx remotion render src/index.ts <Id> out/<slug>/chunks/chunk0.mp4 --frames=0-287 --concurrency=2 --gl=angle`
  then `ffmpeg -f concat -safe 0 -i parts.txt -c copy out/<slug>/<slug>-raw.mp4` and
  `master.py <slug> --skip-render --remix`. The remix is required: each AAC chunk adds ~43 ms of priming, so the
  voice is 0.34 s late by 70 s if you master the concat audio directly. Drop to `--concurrency 1` if a chunk loses
  the WebGL context.
* **Legacy keeps everything.** `legacy/skill-old/` holds the old 2D engine, the Pip-era skill and the retired
  `Bridge.tsx` episodes. Nothing there is imported by the live studio.
* **Choice cards and phases.** `edit[].card` (A-D) is copied to `timeline.segments[].card`; the episode overlay draws
  it. For `choice-long`, `episode.json.vote` resolves to `timeline.vote` (frames `a`/`b`, question, four options);
  `VoteCard` draws the full-screen 4-up card and the episode hides `Captions` while it holds. `shots.json` `phase`
  is passed through `index.tsx` as `phase: d.phase`; the active set reads it in `update()`.

## Commands (run from `shorts-studio/`)

```
python ../scripts/check_episode.py <slug> --require-timeline   # structural contract
python ../scripts/voice.py  <slug>       # script -> voice.wav + words.json
python ../scripts/plan.py   <slug>       # words + edit -> timeline.json + shotlist.md
python ../scripts/sfx.py    <slug>       # clips (cached) -> sfx.wav/music.wav + mix levels
python ../scripts/qa_frames.py out/<slug>/<slug>-final.mp4   # pixel gates on sampled frames
python ../scripts/master.py <slug>       # render + -14 LUFS + Shorts spec report
python ../scripts/verify.py <slug>       # post-master verification of the file
npx remotion still src/index.ts <Id>  out/<slug>/test/f0123.png --frame=123 --gl=angle
```

## Anatomy of a set (`src/engine/toon/sets/`)

* `studio` — warm plaster, painted floor boards, swatch board, muted rug, stool, foreground plant.
* `void` — a dark painted stage with floating painted orbs (red/blue/yellow/green/violet/orange), fog tuned
  so the floor rim is invisible. Hero orb heights live in `ORBS`; all shot cameras/fx follow them.
* `scan` / `scan2` — a dark lab with a tall portrait monitor showing the fMRI (one brain / two subjects).
* The **cast** (`outfits.ts`) is original: Wren (teal overshirt, rust trousers, indigo bob, brass glasses,
  red tuning fork), Sam (kid), Doc, and the Mars wardrobe variants Voss (commander), Chen (botanist) and
  Kovic (engineer). Wren is the POV lead of `choice-long`; Voss and Chen support, and Kovic is reserved for the
  short ensemble `choice`. `BUILD` in `engine/bridge/toon.ts` controls proportions
  (`a` head radius, `torso`, `legs`, `tw` torso width) and is shared with the legacy bridge cast.

## Checklist before publishing

1. `qa_frames.py` passes on the master. 2. `verify.py` prints `verify OK` (Shorts spec + loudness).
3. Watch the loop: the first frame should echo the last (the same set, camera and subject).
4. Captions: one to three words at a time, `accent` list = the payoff words, `y: 0.7` on Shorts.
5. Credits: `out/<slug>/report.json` lists every paid row; a Kokoro voice row is 0, a Sarah take is 1,189
   credits per full pass (plus any speed test).

## Rendering notes (learned the hard way on this machine)

- **`qa_frames.py` is mandatory after every render.** A "completed" render can be all-white frames;
  the gate caught it here. Check every chunk, not just the first frames.
- **Remotion captures screenshots after the React commit, not after the GL paint.** r3f paints on rAF
  at up to 60 fps; this scene paints at seconds-per-frame, so the GPU queue backed up without bound
  until Chrome's GPU process died and the canvas went permanently white (captions survive, being DOM).
  Fix in `stage.tsx`: `frameloop="never"` on the Canvas + `advance(performance.now())` in a `useEffect`
  inside the stage — one **synchronous** paint per commit, deterministic capture, no backlog.
- `--timeout=180000` on renders is still required for the odd slow frame. If a frame ever does time
  out, the usually-safe fix is a smaller `--frames=` range.
- **Do not remount the Canvas on a cadence to fight this** — every rebuild re-uploads the whole world
  and makes frames several times slower (measured). The synchronous paint makes it unnecessary.
- Profile on native GL: `--gl=angle`, `--concurrency 2` (drop to 1 if the context drops). PNG was the default frame format;
  `remotion.config.ts` now uses JPEG q92 to keep the capture path light, and `EffectComposer`
  multisampling is 1 (the ink outlines hide the difference).
- Machine reality: 1080×1920 + ink + DOF + bloom takes seconds per frame on this GPU — an 88.7 s
  `choice-long` picture is 2,662 frames, ten 288-frame chunks. The ten chunks took 12 min here; with two framing
  re-renders and chunk QA, budget about 20 min. Chunk it (`--frames=0-287` …), verify the chunks, concat, then
  `master.py --remix`.

