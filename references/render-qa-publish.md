# Render, QA, publish

The render is the last place to discover a story problem. Storyboard first, then render in chunks, then master,
then verify.

## Before the render

1. `python ../scripts/plan.py <slug>` prints the pace and the Shorts checks.
2. `python ../scripts/check_episode.py <slug> --require-timeline` passes.
3. `npx tsc --noEmit` passes.
4. `node ../scripts/stills.mjs <slug> --scale 0.5` and `--guides` stills all read. For every close-up, render the
   actual timeline frame too: a board still has no captions and will hide a mouth-band collision.
5. `python ../scripts/sfx.py <slug>` has run after the last `plan.py`.
6. The first and last frames are the same loop.
7. For `choice-long`, `timeline.vote` exists and the vote-card frames (e.g. 2440, 2500, 2600) show the face
   fully above the card and the chosen letter highlighted.

## Chunked render

This machine (7.7 GB RAM, RTX 3050 4 GB) loses the WebGL context when six tabs render at once. Use 288-frame
chunks and `--concurrency 2`. Drop to 1 if a chunk still loses context.

```bash
mkdir -p out/<slug>/chunks

npx remotion render src/index.ts <Id> out/<slug>/chunks/chunk0.mp4 \
  --frames=0-287 --concurrency=2 --log=error --gl=angle --timeout=180000

npx remotion render src/index.ts <Id> out/<slug>/chunks/chunk1.mp4 \
  --frames=288-575 --concurrency=2 --log=error --gl=angle --timeout=180000
```

Continue until the last frame. For an 88.7 s `choice-long` at 30 fps, 2,662 frames, the ranges are:

```
0-287, 288-575, 576-863, 864-1151, 1152-1439, 1440-1727, 1728-2015, 2016-2303, 2304-2591, 2592-2661
```

The last chunk is shorter. A 57.6 s Short is six chunks; a 46-52 s Short uses fewer; a 35 s `snap` uses four or
fewer. Always end on `total - 1`, not `total`.

### QA every chunk

Before joining, extract one frame at the start, middle and end of each chunk:

```bash
ffmpeg -y -v error -ss 0.3 -i out/<slug>/chunks/chunk0.mp4 -frames:v 1 -vf scale=540:-1 out/<slug>/chunks/qa_c0_start.png
ffmpeg -y -v error -ss 5.0 -i out/<slug>/chunks/chunk0.mp4 -frames:v 1 -vf scale=540:-1 out/<slug>/chunks/qa_c0_mid.png
ffmpeg -y -v error -ss 9.4 -i out/<slug>/chunks/chunk0.mp4 -frames:v 1 -vf scale=540:-1 out/<slug>/chunks/qa_c0_end.png
```

Look at all three. A chunk that ends white, black or frozen is a failed chunk even if `ffprobe` reports the
right frame count. Re-render that chunk at concurrency 1 before joining.

For a `choice-long`, also render the vote-card frames from the main composition and check them at full size:

```bash
node ../scripts/stills.mjs <slug> --frames 2440 2500 2600 --scale 0.5
```

The face must sit fully above the card, the question and all four labels must be legible, and the chosen letter
must be highlighted.

### Join

Write `out/<slug>/chunks/parts.txt`:

```
file 'chunk0.mp4'
file 'chunk1.mp4'
file 'chunk2.mp4'
file 'chunk3.mp4'
file 'chunk4.mp4'
file 'chunk5.mp4'
```

The paths are relative to the list file. Then:

```bash
ffmpeg -y -v error -f concat -safe 0 -i out/<slug>/chunks/parts.txt -c copy out/<slug>/<slug>-raw.mp4
ffprobe -v error -show_entries format=duration,size -show_entries stream=width,height,nb_frames \
  -of default=noprint_wrappers=1 out/<slug>/<slug>-raw.mp4
```

The video stream must have the expected frame count (2,662 for the 88.7 s picture at 30 fps). The container can be
a few tenths longer because the stems run to 89.13 s. Do **not** accept a growing audio offset: each concatenated
AAC chunk carries about 43 ms of priming, which is 0.34 s late by 70 s across ten chunks. Master with `--remix`
(below) to rebuild the mix from the stems.

## Master

```bash
python ../scripts/master.py <slug> --skip-render --remix
```

`master.py`:

- with `--remix`, rebuilds the mix from `voice.wav` + `sfx.wav` + `music.wav` at the timeline volumes, so chunked
  AAC priming cannot drift the voice;
- two-pass loudnorm to **-14 LUFS**, true peak **-1.0 dBTP**;
- copies the video untouched (no re-encode);
- writes `out/<slug>/<slug>-final.mp4` and `report.json`;
- checks 1080 x 1920 and the preset's own cap.

Expected report shape:

```json
{
  "episode": "MarsColonySurvival",
  "file": "…/mars-colony-survival-final.mp4",
  "width": 1080,
  "height": 1920,
  "seconds": 89.2,
  "lufs": -14.0,
  "true_peak_dbtp": -1.49,
  "segments": 32,
  "cuts_per_min": 21.0,
  "preset": "choice-long",
  "max_seconds": 150,
  "elevenlabs_credits": 2383
}
```

The loudness numbers above are the gate targets; copy the actual values from `report.json`. `master.py` reads
`short.preset` and uses its own cap (`snap` 35, `twist` 57, `choice` 59, `choice-long` 150); it writes `preset`
and `max_seconds` so `verify.py` checks the same limit.

`elevenlabs_credits` sums every paid row in `out/<slug>/costs.json`. On the Sarah take that includes the voice
(1,189 + 1,189 + 5 credits) plus SFX; the Mars total is 2,383 because all ten SFX clips were cached. If the voice
is Kokoro, the voice row is 0.

## Pixel QA and verify

```bash
python ../scripts/qa_frames.py out/<slug>/<slug>-final.mp4 --step 45
python ../scripts/verify.py <slug>
```

`qa_frames.py` samples one frame every 45 frames and checks luma mean, luma std, saturation and edge energy.
Every sampled frame must print `ok`. The gate catches white frames, crushed blacks, flat frames and a render that
silently lost the canvas.

`verify.py` must print `verify OK`. It checks:

- 1080 x 1920;
- `max_seconds` or less (150 s for `choice-long`, 59 s for the shorter presets);
- loudness -15.5 to -12.5 LUFS;
- true peak under -1.0 dBTP;
- `report.json` exists and its Shorts spec passed.

If `verify.py` fails, fix the cause. Do not hand-edit the report or the final file.

## Watch the film

After the gates, watch the final once, end to end, on a phone-sized window:

1. Does the hook land in the first 3 s?
2. Does every cut land on a new idea?
3. Do the captions ever cover a face or a readout?
4. Does the loop actually loop (first frame = last frame)?
5. Is every word audible?
6. Do the A-D cards appear and leave cleanly? (choice only)
7. Does the vote card repeat the spoken question and the same four labels, with Wren's pick highlighted?
   (choice-long only)
8. Is her face fully above the card, and are the captions hidden while it holds? (choice-long only)
9. Does the card hold 7-8 s and cut back to the opening frame? (choice-long only)
10. Is there any frame that is white, black, frozen or duplicated at a chunk join?

A gate pass is necessary, not sufficient. The watch is the final picture check.

## Publish kit

Write `out/<slug>/publish.json`:

```jsonc
{
  "search_phrase": "mars colony survival",
  "thumbnail_text": "ONE BATTERY. FOUR WAYS TO DIE.",
  "titles": [
    { "text": "Four Ways to Save Mars. One Battery. You Choose. 🔴⚡", "recommended": true },
    { "text": "One Battery. Four Ways to Die on Mars. 🔴⚡", "recommended": false },
    { "text": "Wren Chose the Surface Walk. Was She Right? 🚀🔴", "recommended": false }
  ],
  "description": "Four ways to save the Mars colony. One battery. Wren chooses C, the surface walk.\nA: rover dash. B: greenhouse. C: surface. D: signal Earth.\n#shorts #mars #survival",
  "tags": [
    "mars colony survival",
    "mars colony power failure",
    "one battery four ways",
    "survival scenario shorts",
    "space survival story",
    "mars surface walk",
    "what if mars colony",
    "animated space short",
    "science fiction shorts",
    "mars colony vote"
  ],
  "pinned_comment": "Wren chose C. Would you? Vote A–D.",
  "upload_plan": "Upload as a Short, pin the A-D comment, reply to the first 20 votes with the option name."
}
```

Rules the checker enforces:

- exactly 3 titles, one marked `recommended`;
- each title 5-11 words, one or two emojis at the **end only**, 100 characters or less;
- description has at least 3 non-empty lines and the last line has `#shorts` plus exactly 2 relevant hashtags;
- 8-12 tags; the first tag is the exact search phrase; at least 4 tags are 3-6 word long-tails;
- no duplicate tags, no keyword stuffing.

Check it:

```bash
python ../scripts/shortscheck.py <slug> --publish
```

The output must be `0 error(s)`. Warnings are judgement calls; read them.

### Choice Shorts

- The pinned comment is the vote mechanism. List A-D and ask for a letter.
- A `choice-long` names the decision the film made before it asks: "Wren chose C. Would you? Vote A–D." The
  viewer is judging a choice, not filling in a blank.
- Reply to early votes with the option name, not just "thanks".
- The next part opens on the winning pick and says so in the first line.
- Do not ask for likes/subscribes in the video. The vote is the engagement.

## Review

After publishing, log:

- the upload date, title and preset;
- views at 24 h and 7 days (when available);
- average view duration and swipe-away point;
- the A-D tally (choice) or the most-repeated comment (explainer);
- one next action: a different hook, a shorter setup, a clearer card, a better loop.

Do not change the whole format after one video. Change one thing, publish, compare.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `[toon] webgl context lost; awaiting restore` and white frames | too many render tabs / GPU memory | re-render the chunk at `--concurrency 1`, smaller range, `--gl=angle` |
| render finishes but MP4 is white | context lost mid-chunk, captions survive as DOM | delete the chunk, re-render, QA the new chunk |
| Chrome OOM / tab crash | full-length render, too many sets, too many tabs | chunk it, keep sets to 4, concurrency 1-2 |
| duration is 1-2 s short | last frame range wrong | count frames: last range ends at `total - 1` |
| audio drifts at a chunk join | concat with mismatched streams | re-encode the concat or use identical render settings for every chunk |
| captions missing | `captions.on` false or `words.json` empty | fix `episode.json`, re-run `voice.py` and `plan.py` |
| card never appears | `card` missing, or overlay compares shot-local to absolute frames | add `card` to the edit entry; compare `f` to `seg.a`/`seg.b` |
| face under the vote card | H1 camera is too low | raise the actor/camera so the face sits above 780 px; re-render H1 |
| vote labels differ from the A-D cards | two label sources | make `vote.options` match the card data exactly |
| camera inside a rover or bioreactor | camera position is inside geometry | pull it out along the look vector and re-render the still |
| chunk join repeats or drops a frame | ranges overlap or skip one | end each range at the next start minus one |
| face under the caption | staging too low | raise the actor/camera, re-render the still |
| prop floating beside the hand | 3D prop placed in the set | draw it in the actor canvas with `prop` |
| giant red orb / lamp | a 0.1 m basic sphere at 2-3 m | shrink to 0.03 m or attach it to a visible housing |
| camera splits the frame | a beam/column on the lens axis | offset the ring or stage 3/4 |
| `verify.py` loudness fail | master did not run or levels changed after master | re-run `master.py --skip-render --remix`, then verify |
| `master.py` id not found | `episode.json.id` != registered composition | fix the id in both places |

## Time estimates

Be honest with the user:

- storyboard and still QA: 20-40 min for a 31-shot `choice-long`, more if the framing needs a second pass;
- render: the ten 288-frame chunks took 12 min at two tabs for the 88.7 s picture (chunk 0: 82 s). Add 2-4 min
  for each framing re-render (two chunks at a time) and 5-10 min to QA and join; the Mars cut was about 20 min
  including the C3 and L3 fixes;
- master and gates: 2-4 min (two-pass loudnorm plus verify);
- publish kit and review: 5-10 min.

A 90 s `choice-long` is a half-day including the script, 31 stills, framing fixes, voice, mix and gates. The
render is the short part once the board is right. If you skip the chunk QA, you will discover the white frames
after the master and pay for the render twice.
