"""KokoroTTS client: local speech, word timings from the running Docker container, and a no-credit voice step.

The Hangry-Labs KokoroTTS app serves http://localhost:7860. Its /tts/generate endpoint returns audio but no word
timings, so the companion `kokoro_timing.py` runs inside the same container and uses the model's own duration
predictor. The container is auto-detected by the published 7860 port; override it with KOKORO_CONTAINER, and the URL
with KOKORO_URL. No API key is used.
"""
import json
import os
import pathlib
import re
import shutil
import subprocess
import urllib.error
import urllib.request

URL = os.environ.get('KOKORO_URL', 'http://localhost:7860').rstrip('/')
DEFAULT_VOICE = 'am_liam'
DEFAULT_SPEED = 0.9
MARKER = 'KOKORO_TIMINGS_JSON:'
HELPER = pathlib.Path(__file__).with_name('kokoro_timing.py')


def _request(path, body=None, timeout=900):
    req = urllib.request.Request(
        URL + path,
        data=json.dumps(body, ensure_ascii=False).encode('utf-8') if body is not None else None,
        headers={'Content-Type': 'application/json; charset=utf-8'},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read(), r.headers
    except urllib.error.HTTPError as e:
        detail = e.read().decode('utf-8', 'replace')
        try:
            detail = json.loads(detail).get('detail', detail)
        except Exception:
            pass
        raise SystemExit(f'KokoroTTS rejected the request ({e.code}): {detail}') from None
    except urllib.error.URLError as e:
        raise SystemExit(
            f'Cannot reach KokoroTTS at {URL}: {e.reason}. Start the Docker container '
            f'(`docker start kokoro`) or set KOKORO_URL.'
        ) from None


def available_voices():
    try:
        data = json.loads(_request('/tts/voices', timeout=30)[0])
    except SystemExit:
        raise
    except Exception:
        return []
    return [v['id'] for v in data.get('voices', [])]


def check_voice(voice):
    ids = available_voices()
    if ids and voice not in ids:
        shown = ', '.join(ids[:40])
        raise SystemExit(f'KokoroTTS has no voice "{voice}". Some available voices: {shown}')


def generate(text, dest, voice=DEFAULT_VOICE, speed=DEFAULT_SPEED, timeout=900):
    """Write a WAV take to dest and return its duration in seconds."""
    payload = {
        'text': text,
        'input_type': 'text',
        'voice': voice,
        'speed': float(speed),
        'device': 'auto',
        'pitch_semitones': 0,
        'tempo': 1.0,
        'volume': 1.0,
        'normalize': False,
        'output_format': 'wav',
    }
    audio, headers = _request('/tts/generate', payload, timeout=timeout)
    if not audio:
        raise SystemExit('KokoroTTS returned no audio.')
    pathlib.Path(dest).write_bytes(audio)
    try:
        return float(headers.get('X-KokoroTTS-Duration') or 0)
    except (TypeError, ValueError):
        return 0.0


def container():
    """The running container that publishes port 7860, or KOKORO_CONTAINER if set."""
    name = os.environ.get('KOKORO_CONTAINER')
    if name:
        return name
    if not shutil.which('docker'):
        raise SystemExit('Docker is not on PATH. Word timings need the KokoroTTS container.')
    try:
        out = subprocess.run(
            ['docker', 'ps', '--filter', 'publish=7860', '--format', '{{.Names}}'],
            capture_output=True, text=True, timeout=20,
        )
    except Exception as e:
        raise SystemExit(f'Could not query Docker: {e}') from None
    names = out.stdout.split()
    if names:
        return names[0]
    try:
        allout = subprocess.run(
            ['docker', 'ps', '-a', '--filter', 'name=kokoro', '--format', '{{.Names}}'],
            capture_output=True, text=True, timeout=20,
        )
        stopped = allout.stdout.split()
    except Exception:
        stopped = []
    if stopped:
        raise SystemExit(
            f'KokoroTTS container "{stopped[0]}" is stopped. Start it with: docker start {stopped[0]}'
        )
    raise SystemExit(
        'No KokoroTTS container is publishing port 7860. Start it, or set KOKORO_URL to a running '
        'KokoroTTS service and KOKORO_CONTAINER to a container that has the kokorotts package.'
    )


def timings(text, voice=DEFAULT_VOICE, speed=DEFAULT_SPEED, lang='a', timeout=900):
    """Ask the container's Kokoro model for exact token timings (no audio generated)."""
    if not HELPER.exists():
        raise SystemExit(f'Missing timing helper: {HELPER}')
    name = container()
    if len(text.encode('utf-8')) > 30000:
        raise SystemExit(
            'Script is too long for the Kokoro timing helper (over 30k characters). '
            'Split the episode or set KOKORO_TIMINGS=off and time the words another way.'
        )
    cmd = [
        'docker', 'exec', '-i',
        '-e', f'KOKORO_TEXT={text}',
        '-e', f'KOKORO_VOICE={voice}',
        '-e', f'KOKORO_SPEED={speed}',
        '-e', f'KOKORO_LANG={lang}',
        name, 'python',
    ]
    try:
        p = subprocess.run(cmd, input=HELPER.read_bytes(), capture_output=True, timeout=timeout)
    except FileNotFoundError:
        raise SystemExit('Docker is not on PATH. Word timings need the KokoroTTS container.') from None
    except subprocess.TimeoutExpired:
        raise SystemExit('The KokoroTTS timing helper timed out. Is the container healthy?') from None
    out = p.stdout.decode('utf-8', 'replace')
    err = p.stderr.decode('utf-8', 'replace')
    line = next((l for l in out.splitlines() if l.startswith(MARKER)), None)
    if p.returncode != 0 or not line:
        tail = (err or out).strip().splitlines()[-15:]
        raise SystemExit('KokoroTTS timing helper failed:\n' + '\n'.join(tail))
    return json.loads(line[len(MARKER):])


def words(payload):
    """Kokoro token timings -> the {w, s, e, p} list that plan.py reads."""
    out = []
    for t in payload.get('tokens', []):
        text = str(t.get('text', '')).strip()
        if not text:
            continue
        if re.search(r'[A-Za-z0-9]', text):
            out.append({
                'w': text,
                's': round(float(t['s']), 3),
                'e': round(float(t['e']), 3),
                'p': '',
            })
        elif out:
            out[-1]['p'] += text
    if not out:
        raise SystemExit('KokoroTTS returned no word timings.')
    return out


def fit(words, audio_seconds, predicted_total):
    """Scale timings if the audio duration and the model's prediction disagree materially."""
    if not audio_seconds or not predicted_total:
        return
    ratio = audio_seconds / predicted_total
    if abs(ratio - 1) <= 0.01:
        return
    print(f'  timing total {predicted_total:.2f} s vs audio {audio_seconds:.2f} s: scaling by {ratio:.4f}')
    for w in words:
        w['s'] = round(w['s'] * ratio, 3)
        w['e'] = round(w['e'] * ratio, 3)
