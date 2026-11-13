"""Step 2: the voice. Local KokoroTTS text-to-speech with word timings, then the pauses tightened to the genre's pace.

python <skill>/scripts/voice.py <slug> [--force]
Reads  src/episodes/<slug>/episode.json  (script, voice, gaps)
Writes public/<slug>/voice_raw.wav (KokoroTTS) or voice_raw.mp3 (ElevenLabs), public/<slug>/voice.wav (tightened),
       src/episodes/<slug>/words.json (word timings after tightening, used by plan.py) and
       out/<slug>/words_raw.json.
The local KokoroTTS service is only called when the text or voice settings change (cached by a hash), so re-running
to retune the gaps is free.

episode.json "voice" (all optional):
  {"engine": "kokoro", "id": "am_liam", "speed": 0.9}
  {"engine": "elevenlabs", "id": "TX3LPaxmHKxFdv7VOQHJ", "model": "eleven_multilingual_v2",
   "settings": {"stability": 0.4, "similarity_boost": 0.8, "style": 0.35, "use_speaker_boost": true}}
The default engine is KokoroTTS at http://localhost:7860 (free, local). "elevenlabs" is kept as an explicit fallback.
episode.json "gaps" (seconds, all optional): {"word": 0.12, "comma": 0.2, "sentence": 0.3, "question": 0.45,
  "pairs": {"anything|One": 0.6}}  -> every pause longer than its limit is cut to the limit, from its middle.
"""
import base64, hashlib, json, re, sys, time

import numpy as np

import kokoro
from wi import SR, api, decode, ep_dir, load_episode, load_json, log_cost, out_dir, pub_dir, save_json, spent_since, write_wav

slug = sys.argv[1]
force = '--force' in sys.argv
ep = load_episode(slug)
V = {'engine': 'kokoro', 'id': kokoro.DEFAULT_VOICE, 'speed': kokoro.DEFAULT_SPEED}
_voice = ep.get('voice') or {}
# An old-style ElevenLabs voice block has no "engine" but does have model/settings.
ENGINE = str(_voice.get('engine') or ('elevenlabs' if ('model' in _voice or 'settings' in _voice) else 'kokoro')).lower()
V.update(_voice)
V['engine'] = ENGINE
text = ' '.join(b['text'].strip() for b in ep['script'])
sig = hashlib.sha1(json.dumps([text, V, ENGINE], sort_keys=True).encode()).hexdigest()[:12]
raw_audio = pub_dir(slug) / ('voice_raw.wav' if ENGINE == 'kokoro' else 'voice_raw.mp3')
raw_words = out_dir(slug) / 'words_raw.json'
meta = load_json(out_dir(slug) / 'voice_meta.json', {})

if force or meta.get('sig') != sig or not raw_audio.exists() or not raw_words.exists():
    if ENGINE == 'kokoro':
        voice = str(V.get('id', kokoro.DEFAULT_VOICE))
        speed = float(V.get('speed', kokoro.DEFAULT_SPEED))
        lang = str(V.get('lang', 'a'))
        kokoro.check_voice(voice)
        print(f'{len(text)} characters to KokoroTTS (voice {voice}, speed {speed})')
        t0 = time.time()
        seconds = kokoro.generate(text, raw_audio, voice=voice, speed=speed)
        print(f'  generated {seconds:.2f} s of audio in {time.time() - t0:.0f} s')
        t0 = time.time()
        payload = kokoro.timings(text, voice=voice, speed=speed, lang=lang)
        words = kokoro.words(payload)
        predicted = float(payload.get('total') or 0)
        kokoro.fit(words, seconds, predicted)
        save_json(raw_words, words)
        save_json(out_dir(slug) / 'voice_meta.json', {
            'sig': sig, 'chars': len(text), 'engine': 'kokoro', 'voice': voice, 'speed': speed,
            'seconds': seconds, 'timings_seconds': predicted,
        })
        print(f'  {len(words)} words timed in {time.time() - t0:.0f} s')
        log_cost(slug, 'voice', 0, f'{len(text)} characters', provider='KokoroTTS')
    elif ENGINE == 'elevenlabs':
        E = {
            'id': 'TX3LPaxmHKxFdv7VOQHJ',
            'model': 'eleven_multilingual_v2',
            'settings': {'stability': 0.4, 'similarity_boost': 0.8, 'style': 0.35, 'use_speaker_boost': True},
        }
        E.update({k: V[k] for k in ('id', 'model', 'settings') if k in V})
        print(f'{len(text)} characters to ElevenLabs (voice {E["id"]})')
        t0 = time.time()
        res = json.loads(api(f'/v1/text-to-speech/{E["id"]}/with-timestamps?output_format=mp3_44100_128', {'text': text, 'model_id': E['model'], 'voice_settings': E['settings']}))
        raw_audio.write_bytes(base64.b64decode(res['audio_base64']))
        al = res['alignment']
        words, cur = [], None
        for ch, s, e in zip(al['characters'], al['character_start_times_seconds'], al['character_end_times_seconds']):
            if re.match(r"[\w'’]", ch):
                if cur is None:
                    cur = {'w': '', 's': s, 'e': e, 'p': ''}
                cur['w'] += ch
                cur['e'] = e
            else:
                if cur is not None:
                    words.append(cur)
                    cur = None
                if words and ch.strip():
                    words[-1]['p'] += ch  # punctuation after the word decides how long its pause may be
        if cur:
            words.append(cur)
        for w in words:
            w['s'], w['e'] = round(w['s'], 3), round(w['e'], 3)
        save_json(raw_words, words)
        save_json(out_dir(slug) / 'voice_meta.json', {'sig': sig, 'chars': len(text), 'engine': 'elevenlabs', 'voice': E['id']})
        used, n = spent_since(t0, expect=1)
        log_cost(slug, 'voice', used, f'{len(text)} characters' + ('' if n else '; not in the history yet, check the usage page'))
    else:
        raise SystemExit(f'Unknown voice engine "{ENGINE}": use "kokoro" or "elevenlabs".')
else:
    print('Voice unchanged since the last call: reusing it (no credits).')

# ---------------------------------------------------------------- tighten the pauses
words = load_json(raw_words)
G = {'word': 0.12, 'comma': 0.2, 'sentence': 0.3, 'question': 0.45, 'pairs': {}}
G.update(ep.get('gaps', {}))
x = decode(raw_audio)
cuts = []


def bare(w):
    return re.sub(r'[^\w]', '', w)


for a, b in zip(words, words[1:]):
    gap = b['s'] - a['e']
    key = bare(a['w']) + '|' + bare(b['w'])
    if key in G['pairs']:
        keep = G['pairs'][key]
    elif '?' in a['p'] or '!' in a['p']:
        keep = G['question']
    elif '.' in a['p'] or ':' in a['p'] or ';' in a['p'] or '…' in a['p']:
        keep = G['sentence']
    elif ',' in a['p'] or '—' in a['p'] or '-' in a['p']:
        keep = G['comma']
    else:
        keep = G['word']
    if gap > keep:
        mid = (a['e'] + b['s']) / 2
        rm = gap - keep
        cuts.append((mid - rm / 2, mid + rm / 2))
parts, last = [], 0.0
for s, e in cuts:
    parts.append(x[int(last * SR):int(s * SR)])
    last = e
parts.append(x[int(last * SR):])
fade = int(0.004 * SR)  # a 4 ms fade either side of each join, so no click
for i, part in enumerate(parts):
    part = part.copy()
    if i > 0 and len(part) > fade:
        part[:fade] *= np.linspace(0, 1, fade)
    if i < len(parts) - 1 and len(part) > fade:
        part[-fade:] *= np.linspace(1, 0, fade)
    parts[i] = part
y = np.concatenate(parts)
write_wav(pub_dir(slug) / 'voice.wav', y)


def shift(t):
    return t - sum(min(e, t) - s for s, e in cuts if t > s)


out = [{'w': w['w'], 's': round(shift(w['s']), 3), 'e': round(shift(w['e']), 3), 'p': w.get('p', '')} for w in words]
save_json(ep_dir(slug) / 'words.json', out)
print(f'Tightened {len(cuts)} pauses, removed {sum(e - s for s, e in cuts):.2f} s: {len(x) / SR:.2f} s -> {len(y) / SR:.2f} s')
print(' '.join(f"{w['w']}@{w['s']}" for w in out))
