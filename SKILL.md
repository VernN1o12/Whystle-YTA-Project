---
name: youtube-automated-workflow
description: Make original painted-3D cartoon YouTube Shorts (1080x1920; 35 s `snap` to 150 s `choice-long`) with Wren, burned-in word-by-word captions, a free local KokoroTTS voice (ElevenLabs Sarah as the paid fallback), synthesized sound, a data-driven Remotion/Three.js render, QA gates, mastering and a publish kit. Use for survival choice Shorts, story-led 90 s votes, what-if/paradox explainers, or any faceless animated Short on the Whystle Animations channel.
---

# YouTube Automated Shorts

This is the one skill for making a finished vertical Short on **Whystle Animations**. It replaces the old
two-brain workflow: there is one renderer, one data contract, one hero, one caption rule and one set of gates.

**The non-negotiables**

- **1080 x 1920, 30 fps. The preset owns the clock:** `snap` 24-35 s, `twist` 46-57 s, `choice` 46-59 s,
  `choice-long` 75-150 s. No landscape, no unplanned 90 s cut, no 120 s exception.
- **Burned-in word-by-word captions, always on.** One to three words at a time, lower-middle, hard swaps.
- **Wren is the channel hero.** No Pip, no Pip hood, no Pip assets. Wren leads the explainers and is the POV
  protagonist of `choice-long`; a survival `choice` may bill the Mars crew (Voss/Chen, with Kovic optional).
  Either way, the house rig and line style stay.
- **Original story, character and voice.** Never reuse a competitor's topic, title, script, character or voice.
- **Episodes are data.** `episode.json` + `words.json` + `timeline.json` + `shots.json` + a short `index.tsx`.
  Do not write per-episode three.js or revive the old `Bridge.tsx` episodes.
- **Every picture change gets a sound, every shot gets a storyboard still, every render gets a QA frame.**
- **Keep old work.** Broken renders, old skill files and retired templates go to `legacy/`; never delete them.

## The four formats

| Preset | Length | Words | Shots | Shape |
|---|---|---|---|---|
| `snap` | 24-35 s | 62-90 | 8-14 | hook -> setup -> twist -> loop |
| `twist` | 46-57 s | 115-148 | 16-26 | hook -> setup -> escalation -> evidence -> catch -> payoff |
| `choice` | 46-59 s | 115-155 | 18-28 | hook -> stakes -> four options -> catch -> vote -> loop |
| `choice-long` | 75-150 s | 190-260 | 20-36 | hook -> stakes -> failed fix -> four options -> catch -> decision -> judgement -> vote -> loop |

A `choice` or `choice-long` Short is **one video**, not a multi-part series. The A-D cards are drawn over live
shots; the `choice-long` cut ends on a full-screen 4-up vote card (`timeline.vote`) that repeats the question and
the four options. Part 2, if any, opens on the winning pick from the comments. `choice-long` is Wren POV: she
makes the call, the film shows the cost, and the vote judges her decision.

## The pipeline

Run every command from `shorts-studio/`. The scripts live one level up in `scripts/`.

### 0. Brief and idea

Read `channel.json`. Pick the niche and preset. Screen the idea against the rules in `references/story.md`:
original, visual, one clear promise, verifiable, advertiser-friendly, and short enough to land in its preset
clock (`snap` 24-35 s, `twist` 46-57 s, `choice` 46-59 s, `choice-long` 75-150 s). Write the wardrobe note and
the loop before writing the script.

### 1. Script

Write the script in `src/episodes/<slug>/episode.json`. Use the beats in `references/story.md`.
Every factual claim goes in `science` with a source and a status. Run:

```bash
python ../scripts/shortscheck.py <slug>
python ../scripts/check_episode.py <slug>
```

`check_episode.py` is the structural gate. It checks ids, clocks, sets, cast, captions, pacing, the vote card and
the preset's own length cap. `shortscheck.py` is the editorial gate: length, word count, hook, safety and publish
format.

### 2. Voice

```bash
python ../scripts/voice.py <slug>
```

This writes `public/<slug>/voice_raw.wav`, `public/<slug>/voice.wav` and `src/episodes/<slug>/words.json`, and
tightens pauses to the house pace. The local KokoroTTS service (`http://localhost:7860`) is only called when the
text or voice block changes. Voice costs 0 credits; ElevenLabs remains an explicit `"engine": "elevenlabs"` fallback.

### 3. Edit and timeline

```bash
python ../scripts/plan.py <slug>
python ../scripts/check_episode.py <slug> --require-timeline
```

`plan.py` resolves the edit cues against `words.json` and writes `timeline.json`: segments, captions, audio and,
for `choice-long`, the resolved `vote` window (`timeline.vote`). It prints the pace and the Shorts checks. Fix
the edit, not the renderer, if a gate fails.

### 4. Visual data

Write `src/episodes/<slug>/shots.json` for every shot id in the episode. Each shot has a set, light, duration,
camera keys, actors, optional FX, optional DOF and optional set `phase`. Read `references/data-contract.md`
before the first shot and `references/sets.md` before inventing a set.

### 5. Storyboard

```bash
node ../scripts/stills.mjs <slug> --scale 0.5
node ../scripts/stills.mjs <slug> --guides --scale 0.5
python ../scripts/board.py <slug>
python ../scripts/board.py <slug> --guides
```

Review every still in `out/<slug>/board/`. Faces and the key object must clear the Shorts player's top bar,
bottom title and right rail, and must not sit in the caption band. Render a full contact sheet after the
individual fixes and read it as a board: a camera can sit inside a rover or a bioreactor and still produce a
valid-looking still. Fix the staging before rendering video.

### 6. Sound

```bash
python ../scripts/sfx.py <slug> --dry   # list clips and cached hits, no credits
python ../scripts/sfx.py <slug>         # generate/mix, write levels into timeline.json
```

Every cut gets a hit; the music bed stays 5-10 dB under the voice. Re-run `sfx.py` after any `plan.py` run
because `plan.py` rewrites `timeline.json`.

### 7. Render in chunks

This machine loses the WebGL context when too many tabs render at once. Render 288-frame chunks at
`--concurrency 2` (drop to 1 if a chunk loses context), then join them. An 88.7 s `choice-long` picture is 2,662
frames: ten chunks, the last range `2592-2661`; the master is 89.2 s because the stems run a little longer.

```bash
npx remotion render src/index.ts <Id> out/<slug>/chunks/chunk0.mp4 --frames=0-287 --concurrency=2 --log=error --gl=angle --timeout=180000
# repeat for 288-575, 576-863, ... 2592-2661
ffmpeg -f concat -safe 0 -i out/<slug>/chunks/parts.txt -c copy out/<slug>/<slug>-raw.mp4
python ../scripts/master.py <slug> --skip-render --remix
```

QA one frame at the start, middle and end of every chunk before joining, and for a `choice-long` also render the
vote-card frames (`2440`, `2500`, `2600` here). A render can finish with white frames and still produce a
valid-looking MP4; `qa_frames.py` catches that. Chunked AAC carries about 43 ms of priming per chunk (0.34 s late
by 70 s); `--remix` rebuilds the mix from the stems so the voice stays in sync. Full details and troubleshooting:
`references/render-qa-publish.md`.

### 8. Master and verify

```bash
python ../scripts/master.py <slug> --skip-render --remix
python ../scripts/qa_frames.py out/<slug>/<slug>-final.mp4
python ../scripts/verify.py <slug>
```

`master.py` normalises to -14 LUFS, keeps true peaks under -1 dBTP, writes `report.json` (including `preset` and
`max_seconds`) and checks the Shorts spec. With `--remix` it rebuilds the mix from the three stems at the timeline
volumes before normalising. `verify.py` reads those fields and must print `verify OK` before publishing.

### 9. Publish and review

Write `out/<slug>/publish.json` with three titles, a description, tags and a pinned comment. Check it with
`python ../scripts/shortscheck.py <slug> --publish`. For a vote Short, the pinned comment is the mechanism:
state the choice the film made and ask for A-D. Then add the upload to `uploads` in `channel.json` and write
one next action. The exact publish shape and review ritual are in `references/render-qa-publish.md`.

## The data contract in one screen

```
episode.json   you write: script, science, cast, shot stubs, edit, fx, sound, vote, short metadata
words.json     voice.py: word timings after pause tightening
timeline.json  plan.py: segments (frames), captions, vote window, audio paths and levels
shots.json     you write: set, light, dur (seconds), camera keys (seconds), actors, fx, dof, phase
index.tsx      glue: timeline + shots -> SceneSpec -> ToonShort + Captions + ChoiceCard/VoteCard + Audio
```

**The clock rule that causes most bugs:** `timeline.json` segment clocks (`a`, `b`, `t0`, `t1`) and edit
`from` are **frames**; `timeline.vote.a` and `.b` are frames too. `shots.json` `dur`, camera `t` and actor key
`t` are **seconds**. The director converts. Never put seconds in `from` or frames in a camera key.

**Shot ids must agree** across `episode.json`, `plan.py`, `timeline.json` and `shots.json`. The composition
`id` in `episode.json` must match the registered composition in `src/episodes/index.ts`.

## What "good" looks like

- **Hook:** the promise and the number in the first 3 s; first word at 0.00-0.45 s; no logo, intro or "hey guys".
- **Pace:** 20-30 cuts/min, median shot 1.5-3.5 s, no shot over 5.5 s, first 10 s at about 30 cuts/min. A
  `choice-long` may hold the final vote card 7-8 s; that hold is the loop, not a pacing failure.
- **Look:** painted 3D set, 2D Wren lit by the set, thin ink outlines, soft DOF, warm key and cool shade,
  practical lights in frame, a foreground shape for depth. On a `choice-long`, keep the face above the vote card
  (top 780 px on a 1080x1920 frame).
- **Captions:** one to three words, white bold with a dark outline, lower-middle at `y` 0.68-0.70, accent the
  number or payoff word. Never cover a face or a readout. The vote card hides the caption band for its hold and
  carries the spoken question and options itself.
- **Loop:** the last image echoes the first; the last line lands and cuts back to the opening frame.
- **Mix:** voice forward, effects on every cut, music under the voice, -14 LUFS integrated, true peak under -1 dBTP.

## References

| File | Read it for |
|---|---|
| `references/story.md` | niches, idea screen, script beats, choice format, hooks, loops, fact rules |
| `references/voice.md` | KokoroTTS setup, voice settings, pause tightening, word timings, credits |
| `references/visual-style.md` | painted 3D toon look, camera, vertical composition, captions, lighting, DOF |
| `references/character.md` | Wren character lock, cast table, wardrobe, helmets, props, acting keys |
| `references/data-contract.md` | exact JSON shapes, clocks, edit cues, phases, common data errors |
| `references/sets.md` | set registry, existing sets, adding a set, props, geometry rules, Mars sets |
| `references/sound.md` | SFX/music spec, levels, mixing, mastering |
| `references/render-qa-publish.md` | chunked render, concat, QA gates, master, verify, publish, review, troubleshooting |

## Cost and time honesty

- Voice: local KokoroTTS, 0 credits. One take per script change; re-running to retune gaps is free. A 150-word
  script is about 900-1,000 characters and roughly a minute on CPU. ElevenLabs is an explicit fallback only.
  On Sarah (`EXAVITQu4vr4xnSDxMaL`, `eleven_multilingual_v2`, speed 0.9) a 225-word `choice-long` is about
  1,300 characters and cost **1,189 credits**; a speed test cost 5. Report the character/credit estimate before
  generating and the actual usage after. Never regenerate a paid take without approval.
- Sound: ElevenLabs; clips are cached in `library/sfx/` by prompt and length, so a repeated episode is usually
  0 new credits. This Mars cut reused all ten clips for 0 credits.
- Render: an 88.7 s `choice-long` picture is 2,662 frames, ten 288-frame chunks; the ten chunks took 12 min here.
  Add 2-4 min per framing re-render (two chunks at a time) and 5-10 min for chunk QA and join; the Mars cut was
  about 20 min including the C3 and L3 fixes. Budget 20-40 min for 31 storyboard stills and their fixes.
  If the context drops, cut the chunk size and concurrency; do not "just try again" at six tabs.
- Never promise a finished video in "a few minutes". Say what stage you are at and what is left.

## Rules that are easy to forget

- No medical, gore, graphic violence, brands, famous characters or real-person claims.
- No "subscribe", no engagement bait, no fake facts. If a claim cannot be sourced, cut it or label it as a
  hypothetical.
- Captions are part of the picture, not an option. `captions.on` must be true for every Short.
- `choice-long` is Wren POV: her decision is the story, the cost is shown, and the vote judges it. Do not write
  her out of the choice or hand the decision to the ensemble.
- The vote card is part of the film: face above it, caption band hidden, the chosen letter highlighted, and the
  spoken question repeated on the card.
- Keep the old work: `legacy/` is an archive, not a trash can.
- One episode per session. Finish the render and the gates before starting the next story.
