# Sound and mix

Sound is what makes a hard cut feel intentional. Every picture change gets a hit; the voice stays on top; the
music bed is felt, not heard.

## The command

```bash
python ../scripts/sfx.py <slug> --dry   # list clips, show what is cached, spend nothing
python ../scripts/sfx.py <slug>         # generate missing clips, mix stems, write levels
```

`sfx.py` reads the `sound` block in `episode.json`, `timeline.json` and `words.json`, writes
`public/<slug>/sfx.wav` and `public/<slug>/music.wav`, and writes `voiceVol`, `sfxVol`, `musicVol` into
`timeline.json`. The renderer plays those files.

Re-run `sfx.py` after every `plan.py` run. `plan.py` rewrites `timeline.json`; the audio levels must be
recomputed against the new cut.

## The `sound` block

```jsonc
"sound": {
  "clips": {
    "alarm": ["low urgent habitat alarm pulse, steady", 2.0],
    "hatch": ["heavy pneumatic hatch sealing, hydraulic hiss", 1.5],
    "flash": ["short bright camera flash, tight, dry", 0.6],
    "music": ["ambient Mars soundscape, low wind, distant rumble, slow minor chords", 30]
  },
  "events": [
    ["f:0", "alarm", 0.6],
    ["hatch", "hatch", 0.8],
    ["oxygen", "flash", 0.5, "onset"]
  ],
  "repeats": [
    { "at": "algae", "clip": "bubble", "n": 8, "every": 3, "gain": [0.1, 0.2], "pitch": [1.0, 1.3] }
  ],
  "music": { "clip": "music", "until": "Vote+12", "from": 0, "reverse_looks": ["rewind"] },
  "levels": { "sfx_lu": -5.0, "music_lu": -10.5 }
}
```

### `clips`

`"name": ["prompt", seconds]`. The prompt is the sound description; the duration is capped at 30 s by the
generator. Clips are cached in `library/sfx/` by `sha1(name|prompt|seconds)`, so a repeated episode is free.

Write prompts like a foley brief, not a mood board:

- good: "heavy pneumatic hatch sealing, hydraulic hiss, metal clunk at the end, close, dry";
- weak: "sci-fi door";
- good: "faint high-pressure gas hiss, cold, narrow, no music";
- weak: "space sound".

### `events`

`[cue, clip, gain, align?, until?]`:

- `cue` uses the same grammar as the edit: `f:0`, `s:1.5`, `+18`, a word, `shot+2`.
- `align`: `onset` (default) lands the attack on the cue; `peak` lands the loudest moment on the cue for a
  whoosh or a boom.
- `until`: a cue where the clip is cut with a short fade. Use it for a long alarm under a scene change.
- `gain`: 0-1. A cut accent is usually 0.4-0.8; a bed is 0.1-0.3.

### `repeats`

`{ at, clip, n, every, gain: [lo, hi], pitch: [lo, hi] }`. One clip repeated with small pitch and gain
variation. Use it for algae bubbles, suit hiss ticks, UI beeps, footsteps or a countdown. `every` is frames.

### `music`

`{ clip, from?, until?, reverse_looks? }`:

- The bed starts at `from` (default 0) and is tiled to `until`. Long beds are generated in 30 s pieces and
  tiled with a short seam fade.
- `until` is a cue, not a duration. `"Vote+12"` fades out 12 frames after the word "Vote".
- `reverse_looks` plays the bed backwards at double speed during a named look (e.g. a rewind). Use it only if
  the episode defines that look.

### `levels`

`sfx_lu` and `music_lu` are the integrated loudness of each stem **relative to the voice**:

- Mars: `sfx_lu: -5.0`, `music_lu: -10.5` — effects sit 5 LU under the voice, music 10.5 LU under.
- Default: `sfx_lu: 1.5`, `music_lu: -9.5` — a louder, more stylised mix.
- If the voice is buried, lower the effects/music (more negative). If the hits disappear on a phone speaker,
  raise `sfx_lu` by 1-2 LU, not the master.

## Sound design for a Short

- **Cut accents:** a small whoosh, tick, thunk or servo on every picture change. The sound should match the
  object: metal for a hatch, a soft tick for a UI, a low pulse for an alarm, a hiss for a suit.
- **Choice cards:** a paper/card tick when A-D appears, and a distinct hit for the letter. Do not use a cash
  register or a game-show sound; the tone is survival, not a quiz show.
- **The vote card:** keep the music under the card. A hard cut at the question reads as the end of the video
  before the viewer has voted. Add a soft card tick when it lands and let the bed run to the loop.
- **The hook:** one strong sound in the first second. The alarm, the crack, the countdown.
- **The catch:** drop the music for one beat before the constraint lands, then bring it back.
- **The loop:** the last hit should be the first hit again, or a quiet echo of it. Do not end on a riser that
  resolves after the cut.
- **Silence is a tool.** One second of no music under a line can do more than another layer.

## Mix and master

`sfx.py` normalises each stem and computes the three volumes. `master.py` does the final loudness pass. For a
chunked render, pass `--remix` so the mix is rebuilt from the stems rather than the concatenated chunk audio:

```bash
python ../scripts/master.py <slug> --skip-render --remix
```

Each AAC chunk carries about 43 ms of encoder priming; concatenating ten chunks puts the voice 0.34 s late by
70 s. The picture is fine, but the lip sync is not. `--remix` mixes `voice.wav`, `sfx.wav` and `music.wav` at the
timeline volumes, then normalises that mix, so the voice is sample-aligned at every cut.

Targets:

- **-14 LUFS integrated**, +/- 1 LU.
- **True peak under -1.0 dBTP.**
- Voice forward and intelligible on a phone speaker.
- Music 5-10 dB under the voice; effects 3-8 dB under the voice at their peak.
- No clipping, no long silence at the head or tail, no audio after the last word beyond the `tail`.

`master.py` prints the measured LUFS, true peak and Shorts spec. `verify.py` re-measures the final file and
fails if the mix or spec is off. Do not publish on "it sounds fine on my headphones" alone.

## Credits and caching

- Sound generation is charged per clip. A 10-clip episode is usually a few hundred credits; a cached episode is
  zero.
- `sfx.py --dry` lists what would be generated before spending anything. Run it first.
- The library is shared across episodes. Reuse a hatch, a servo or an alarm instead of generating a near-duplicate.
- Report the credits used at the sound step.

## Do not

- Do not use copyrighted music, film stings, game sounds or a competitor's audio.
- Do not put a loud hit on every word; the cuts are the rhythm, not the syllables.
- Do not let the music mask the voice. If you cannot hear every word on a phone, the mix is wrong.
- Do not add a sound after the last word unless it is part of the loop.
- Do not master to -14 LUFS by ear; run the measurement.
