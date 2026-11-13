---
name: youtube-automated-workflow
description: Consolidated automated workflow for making animated YouTube Shorts. Produces two niches—Survival Scenario Choice Shorts (79-113s, aim 90s) and "What If" & Paradox Explainers (24-57s)—using the "2D characters in a colourful 3D world" video style (Three.js inside Remotion). Handles the full pipeline from niche/idea selection and hook-first scripting to ElevenLabs voice generation, 3D/2D hybrid animation, sound synthesis, mastering, and publishing (titles, tags, descriptions). Features the recurring hero Pip (Character Lock), automated checker scripts, and 3D toon world rendering with ink passes, depth-of-field, and Day/Golden lighting presets. Use for any request to make survival scenarios, paradox explainers, or faceless animated Shorts on the Whystle Animations channel. Commands: SCENES, PUBLISH, REVIEW, RESTART.
---

# YouTube Automated Workflow Skill

This is the unified, automated pipeline for producing animated vertical YouTube Shorts for the **Whystle Animations** channel. It integrates three core systems:
1. **The Pipeline:** An 11-step process from brief to review.
2. **The Niches:** Two proven formats—**Survival Scenarios** (A-D choice-card based) and **What If & Paradox Explainers** (catch-and-twist based).
3. **The Style:** A unique **"2D characters in a colourful 3D world"** look (flat cartoon cards with plum ink in a 3D painted toon world with black ink geometry lines, rendered via Three.js + Remotion).

## Supported Niches

- **Survival Scenario Choice Shorts:** drops the viewer into a scenario (e.g., Ice Age, Ancient Rome), plays one decision, and closes on an A-D choice card for the viewer to vote in comments. Parts 2+ open with the dominant viewer pick.
- **"What If" & Paradox Explainers:** scientific/logic thought experiments (e.g., "What if you could teleport?") told through causal chains and ironic payoffs.

## The Video Style

- **Characters:** 2D bean-head cartoon cards with plum ink outlines (`toon.ts`), recurring hero Pip (`character.md`).
- **World:** 3D environments with painted textures and black ink outlines on geometry (`build.ts`, `ink.ts`, `paint.ts`).
- **Lighting:** Dynamic Day and Golden presets with toon shading (`lights.ts`, `shade.ts`).
- **Post:** Ink pass, lens blur DOF, bloom, and NEUTRAL tone mapping (`Bridge.tsx`, `lensblur.ts`, `grade.ts`).
- **Audio:** ElevenLabs voice + word timings, synthesized SFX, and march-style music mix.

## The 11-Step Pipeline

### 0. Brief (`ideas.md`)
Choose the niche (Survival or What-If). Generate 10 ideas with topic tests and keyword checks (vidIQ). Decide the hero's wardrobe for the topic.

### 1. Script (`shorts-formula.md`)
Write the hook-first script (Survival Scenario 90s or What-If 30-50s). Run `shortscheck.py` to verify length, safety, and structure.

### 2. Voice (`voice.py`)
Generate the narration (ElevenLabs) and word timings (`words.json`). Tune pauses for pace.

### 3. Shot List (`plan.py`)
Design ~14-36 picture cards. Mix mediums, close-ups, and macro inserts. Add blueprint/schematic inserts for complexity. Run `lookcheck.py`.

### 4. Storyboard (`stills.mjs`, `board.py`)
Write `shots.tsx`. Render vertical stills for every cut. `--guides` check for safe zones and caption band.

### 5. Self-Check Stills (`look.md`)
Audit the storyboard against the 14-point checklist: light sources, character pop, depth, continuity, and loop.

### 6. Animate (`master.py`, `motiongrid.py`)
Add `poseAt`, `faceAt`, and camera glides. Build the **impact beat** (flash + shake). Check motion via frame grids.

### 7. Sound (`sfx.py`, `mixcheck.py`)
Add sound events on every picture change. Balance voice, music, and SFX.

### 8. Master (`master.py`)
Final 1080x1920 render. Master to -14 LUFS. Run final video `lookcheck.py`.

### 9. PUBLISH (`publish.md`)
Write 3 titles, description, tags, pinned comment (vote mechanic), and upload plan.

### 10. REVIEW (`review.md`)
Read Studio numbers. Tally A-D picks for the next Part.

## The Rebuilt Toon Renderer (2026-11)

The studio now renders episodes through **one data-driven renderer** — no per-episode three.js.
Episodes are data: `episode.json` (script, edit, sound) + `words.json` (voice) + `timeline.json` (plan.py: segments, captions, mix levels) + `shots.json` (set, light, camera keys, actors, FX, DOF) glued by a few lines of `episodes/<slug>/index.tsx` into `ToonShort` (`engine/toon/`). The caption overlay is word-by-word burned-in text, always on. The old per-episode stub renderers were moved to `legacy/` (kept for reference, never imported).

- Sets are procedural: `studio` (painted studio), `void` (floating painted colour orbs), `scan`/`scan2` (fMRI monitor). Lights: day / golden / studio / void. Hero is the original **Wren** (teal overshirt, indigo bob, brass glasses, red tuning fork).
- This machine (7.7 GB RAM, RTX 3050 4 GB) OOMs Chrome on a full render. Render in frame chunks with `--gl=angle --concurrency 1` (e.g. `--frames=0-328`), concat, then `master.py <slug> --skip-render`. `master.py` passes `--gl=angle --concurrency 1` itself for single renders.
- `sfx.py` caps each clip at 30 s (API limit) and tiles longer music beds; set `music.until` to fade out early.
- `plan.py` rewrites `timeline.json` — re-run `sfx.py` after it.
- Gates: `shorts-studio/docs/TOON_WORKFLOW.md` (the data contract), `scripts/qa_frames.py` (pixel gates), `scripts/verify.py` (Shorts spec + loudness), and the `master.py` report.

## Setup & Rules


- **Originality:** Pip/Mo and stories are ours. No brands or famous characters.
- **Character Lock:** The hero rig cannot drift. Proportions and line style are fixed; only outfit changes.
- **V3 Rules:** English only, no medical/gore/violence, facts verified via `science` list, 120s max.
- **Workflow:** One stage at a time. Run `shortscheck.py` before every voice call.
- **Credits:** Report ElevenLabs/vidIQ costs at every stage.
