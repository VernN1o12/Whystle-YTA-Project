# Voice

The voice is the spine of the edit. `plan.py` cuts on its words, so the script and the voice settings decide the
pace before a single shot is staged.

The default engine is **KokoroTTS**, running locally in Docker at `http://localhost:7860`. It is free and needs no
API key. ElevenLabs is kept as an explicit fallback, and still generates the sound effects in `sfx.py`. The
channel's paid fallback voice is **Sarah** (`EXAVITQu4vr4xnSDxMaL`), documented below.

## The command

```bash
python ../scripts/voice.py <slug>
```

Run it from `shorts-studio/`. It reads `src/episodes/<slug>/episode.json` and writes:

- `public/<slug>/voice_raw.wav` — the KokoroTTS take (or `.mp3` when the engine is ElevenLabs);
- `public/<slug>/voice.wav` — the same take with long pauses tightened;
- `src/episodes/<slug>/words.json` — word timings after tightening;
- `out/<slug>/words_raw.json` — the raw timings before tightening;
- `out/<slug>/voice_meta.json` — the cache signature and the engine that produced the take.

The local service is only called when the script text or the voice block changes (cached by hash). Re-running to
retune gaps is free, and so is every KokoroTTS take.

## Kokoro setup

The Hangry-Labs KokoroTTS container publishes port 7860:

```bash
docker start kokoro
```

If the container does not exist yet:

```bash
docker run -p 7860:7860 -v kokorotts_data:/app/persistent hangrylabs/kokorotts:v1.0
```

`voice.py` finds the running container automatically through `docker ps --filter publish=7860`. Overrides:

- `KOKORO_URL` — the service URL (default `http://localhost:7860`);
- `KOKORO_CONTAINER` — the container name used for the timing helper.

If the service is down, `voice.py` stops with the exact command to start it. It does not fall back silently to a
paid engine.

Word timings come from the model's own duration predictor, run by `scripts/kokoro_timing.py` inside the container.
The predicted total matches the generated audio duration (a full Short matched at 55.700 s vs 55.700 s), so
captions and word cues stay frame-accurate without an alignment API.

On CPU a 900-character Short takes roughly a minute to synthesize, plus about 20 seconds for the timing pass. A GPU
container is faster. Both are free.

## Voice settings

The default is in `voice.py`; override per episode with a `voice` block:

```json
"voice": {
  "engine": "kokoro",
  "id": "am_liam",
  "speed": 0.9
}
```

- `id` is a Kokoro voice: `am_liam` is the closest match to the old ElevenLabs Liam narrator. Run
  `curl http://localhost:7860/tts/voices` for the full list.
- `speed` 0.9 lands a 146-word Mars script at about 50 s after tightening, inside the `choice` range, and a
  225-word `choice-long` at about 88 s.
- `lang` is optional and defaults to `a` (American English). Only change it with a voice from that language.
- An unknown voice id fails before any audio is written, with the available ids listed.

The ElevenLabs fallback is explicit:

```json
"voice": {
  "engine": "elevenlabs",
  "id": "EXAVITQu4vr4xnSDxMaL",
  "model": "eleven_multilingual_v2",
  "settings": {
    "stability": 0.45,
    "similarity_boost": 0.8,
    "style": 0.3,
    "use_speaker_boost": true,
    "speed": 0.9
  }
}
```

`EXAVITQu4vr4xnSDxMaL` is Sarah. `speed` belongs inside `settings`, not at the top level.

A legacy block with no `engine` but with `model` or `settings` is treated as ElevenLabs. It costs credits.

### Paid voice: Sarah

The paid take is a deliberate choice, not a silent fallback. Before generating:

1. Count the characters in the spoken script, including spaces and punctuation.
2. Multiply by the model's credit rate and say the estimate out loud.
3. Get approval if the account is low. Never blind-spend.

This Mars `choice-long` take cost:

| Run | Raw audio | Credits |
|---|---|---|
| Default speed | 81.41 s | 1,189 |
| Speed validation (short sample) | 0.8 s | 5 |
| Speed 0.9 | 89.44 s | 1,189 |
| **Total** | | **2,383** |

The account balance after the run was **856 / 10,000**. Write the same table to `out/<slug>/costs.json` with the
engine, model, voice id, characters, credits and balance, and repeat the actual usage in the final report. A
speed test is cheaper than a full retake: test a short line before committing the whole script.

Rules:

- One narrator per channel. Do not clone a competitor or a real person.
- Keep the same voice across a series so the channel is recognisable.
- A calm, steady read beats an exaggerated "YouTube" voice. The pictures carry the drama.
- Write numbers as words when they are spoken ("two hours", "eight klicks", "forty-two"), not digits. The
  captions inherit the spoken words. A screen can still show `02:00`; the voice says "two hours".
- Write contractions. Read the script aloud; if you stumble, the voice will too.

## Pause tightening

KokoroTTS also leaves natural pauses that are too slow for a Short. `voice.py` cuts every pause longer than its
limit, from the middle, with a 4 ms fade at each join. The defaults:

```json
"gaps": {
  "word": 0.12,
  "comma": 0.2,
  "sentence": 0.3,
  "question": 0.45,
  "pairs": { "anything|One": 0.6 }
}
```

- `word`: between ordinary words.
- `comma`: after a comma, dash or quote.
- `sentence`: after a full stop, colon or semicolon.
- `question`: after `?` or `!`.
- `pairs`: a per-word-pair override. Use it for a beat that must breathe, e.g. `"Wait|The"`.

Do not tighten below 0.08 s between words; it starts to sound clipped. If the read is rushed, lower the word
gap slightly, not the sentence gap.

## Pace targets

| Preset | Words | Seconds | Words/s |
|---|---|---|---|
| `snap` | 62-90 | 24-35 | 2.5-2.9 |
| `twist` | 115-148 | 46-57 | 2.5-2.9 |
| `choice` | 115-155 | 46-59 | 2.5-2.9 |
| `choice-long` | 190-260 | 75-150 | 2.3-3.0 |

A 146-word script lands at about 50 s after tightening at Kokoro `am_liam` speed 0.9; a 225-word `choice-long`
lands at about 88 s at Sarah speed 0.9. If `plan.py` says the words-per-second is over 3.4, the read is too
dense; cut words. If it is under 2.2, the pauses are too long or the script is too thin.

## Word timings

`words.json` is a list of:

```json
{ "w": "oxygen", "s": 12.34, "e": 12.71, "p": "," }
```

- `s` and `e` are seconds on the voice track.
- `p` is the punctuation that follows the word. `plan.py` uses it to group captions and decide pause limits.
- Kokoro returns punctuation as separate tokens; `voice.py` attaches it to the preceding word.
- Hyphenated words arrive as one token (`"forty-two"`), so captions keep them together.
- Do not hand-edit `words.json` unless you are fixing a single alignment error. Re-run `voice.py` instead.

## Captions from the voice

`plan.py` groups words into 1-3 word chunks. It never crosses a comma, full stop, question mark or exclamation
mark, and it splits long runs evenly so there is no one-word orphan. The caption timing is the word timing plus
a short hold, clamped to the next chunk.

The caption style lives in `episode.json`:

```json
"captions": {
  "on": true,
  "maxWords": 2,
  "accent": ["two", "one", "oxygen"],
  "size": 104,
  "y": 0.7
}
```

`accent` words are drawn in the accent colour. Use it for the number, the deadline, the choice letter or the
payoff word, not every other word.

## Credits and caching

- **Voice: 0 credits.** KokoroTTS runs on this machine; `voice.py` logs the voice row with 0 credits and the local
  provider name.
- **Sound: ElevenLabs credits, cached.** SFX and music clips are cached in `library/sfx/` by prompt and length.
  A repeated episode is usually 0 new credits.
- If the cache signature matches, `voice.py` prints "Voice unchanged since the last call: reusing it (no credits)."
- `--force` re-synthesizes even if the cache matches. Use it only after changing the voice block or when the take
  is genuinely wrong.
- `report.json` still reports `elevenlabs_credits`; after this change it counts paid SFX/music only.
- Do not hide a re-call of the paid fallback. Report its credits at the end of the voice step.

## Voice QA

Before moving to `plan.py`:

1. Listen to the first 3 s. Does the hook land before any setup?
2. Listen to the last line. Does it land and stop, with no trailing "so yeah"?
3. Check the words-per-second line in `plan.py`.
4. Check that the voice does not mispronounce a name or a number. If it does, rewrite the spelling in the script
   (e.g. "Kovic" -> "KO-vitch" only if the TTS needs it) and re-run. Do not fix it in the captions only.
5. Confirm `words.json` is non-empty and the first word starts at 0.00-0.45 s. Kokoro starts around 0.2 s.
6. Confirm `voice_meta.json` says `"engine": "kokoro"` unless you meant to use the fallback.

## Do not

- Do not use a competitor's voice, a cloned real person, or a "famous narrator" impression.
- Do not add a second narrator unless the format is a dialogue, and then cast both from the original cast table.
- Do not generate a new take for every tiny script edit. Edit the script, run `voice.py` once, then retune gaps
  for free.
- Do not publish a Short with no voice track or with the voice starting after 0.5 s.
- Do not edit with the KokoroTTS UI open in a second tab while the CLI is synthesizing; both use the same CPU. It
  still works, just slower.
