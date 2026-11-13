"""Step 3: the shot list on the voice. Resolves the edit's cues against the word timings and writes the timeline.

python <skill>/scripts/plan.py <slug>
Reads  src/episodes/<slug>/episode.json (shots, edit, fx) and words.json (from voice.py)
Writes src/episodes/<slug>/timeline.json (the engine reads it) and out/<slug>/shotlist.md, and prints the pace.

An edit entry:  {"shot": "S4", "at": "homework", "look": "copy"}
  at       when the cut lands: a word ("homework", "paste#2" = its 2nd occurrence after the previous cut), "+18" (frames
           after the previous cut), "s:4.2", "f:126". A word cut lands `lead` frames (default 2) before the word.
  reverse  true plays the shot's clock backwards, from where it was last seen ("from") to "to" (default 0)
  from     the shot's clock at the cut, IN FRAMES (default 0 forward). shots.json `dur` is in SECONDS.
  look     a power look the episode defines (rewind, copy...): grade and overlay while it runs
  card     a choice card letter (A-D): copied to the segment so the episode overlay can draw it
The episode ends `tail` seconds (default 0.9) after the last word, or at "end": "<cue>".

Shorts (the default format, `"format": "shorts"` in episode.json: 1080 x 1920):
  - word-by-word captions are written to timeline.json (`"captions": {"on": true, "maxWords": 3, "accent": ["42"],
    "skipShots": ["S9"], "size": 112, "y": 0.68}`, all optional); landscape episodes get none unless "on": true
  - `"short": {"preset": "snap" | "twist" | "choice" | "choice-long"}` checks the length against the preset
    (snap 24-35 s, twist 46-57 s, choice 46-59 s, choice-long 75-150 s; 180 s absolute max)
  - a Short should loop: end `tail` about 0.5 and finish on an image that echoes the first shot
"""
import statistics, sys

from wi import ep_dir, load_episode, load_json, out_dir, resolve, save_json, find_word, stem

slug = sys.argv[1]
ep = load_episode(slug)
FPS = ep.get('fps', 30)
LEAD = ep.get('lead', 2)
FORMAT = ep.get('format', 'shorts')
SHORTS = FORMAT == 'shorts'
SHORT = ep.get('short', {})
PRESETS = {'snap': (24, 35), 'twist': (46, 57), 'choice': (46, 59), 'choice-long': (75, 150)}  # seconds
HARD_MAX = 180
words = load_json(ep_dir(slug) / 'words.json', [])
if not words and any(not str(e['at']).startswith(('f:', 's:', '+')) for e in ep['edit']):
    raise SystemExit('No words.json yet: run voice.py first (or use f:/s: cues).')
shots = {s['id']: s for s in ep['shots']}

# ---------------------------------------------------------------- cut points
starts, wi_prev, prev = [], 0, 0
for k, e in enumerate(ep['edit']):
    if e['shot'] not in shots:
        raise SystemExit(f'Edit entry {k} uses unknown shot {e["shot"]}')
    at = str(e['at'])
    if at.startswith(('f:', 's:')):
        a = resolve(at, words, FPS)
    elif at.startswith('+'):
        a = prev + int(at[1:])
    else:
        base, _, off = at.partition('+') if '+' in at else (at, '', '0')
        if '#' in base:
            w, n = base.split('#')
            i = find_word(words, w, wi_prev, int(n))
        else:
            i = find_word(words, base, wi_prev)
        wi_prev = i + 1
        a = max(0, round(words[i]['s'] * FPS) - LEAD + int(off or 0))
    if k == 0:
        a = 0
    if a <= prev and k > 0:
        raise SystemExit(f'Edit entry {k} ({e["shot"]} at {at}) starts at frame {a}, not after the previous cut ({prev})')
    starts.append(a)
    prev = a
end = resolve(ep['end'], words, FPS) if 'end' in ep else round((words[-1]['e'] + ep.get('tail', 0.9)) * FPS)
if end <= starts[-1]:
    raise SystemExit(f'The last shot starts at {starts[-1]} but the episode ends at {end}')

# ---------------------------------------------------------------- the vote overlay
vote = None
v = ep.get('vote')
if isinstance(v, dict):
    at = str(v.get('at', '')).strip()
    if not at:
        raise SystemExit('episode.vote needs an "at" cue')
    if at.startswith(('f:', 's:')):
        va = resolve(at, words, FPS)
    elif at.startswith('+'):
        va = starts[-1] + int(at[1:])
    else:
        base, _, off = at.partition('+') if '+' in at else (at, '', '0')
        if '#' in base:
            w, n = base.split('#')
            i = find_word(words, w, wi_prev, int(n))
        else:
            i = find_word(words, base, wi_prev)
        va = max(0, round(words[i]['s'] * FPS) - LEAD + int(off or 0))
    if not 0 <= va < end:
        raise SystemExit(f'vote.at {at!r} resolves to frame {va}, outside the film (0-{end})')
    if va < starts[-1]:
        print(f'note: the vote overlay starts at {va} ({va / FPS:.1f} s), before the last cut ({starts[-1]})')
    vote = {
        'a': va, 'b': end,
        'question': str(v.get('question') or '').strip(),
        'options': [dict(o) for o in (v.get('options') or []) if isinstance(o, dict)],
    }

# ---------------------------------------------------------------- segments and shot clocks
segments, last_clock = [], {}
for k, e in enumerate(ep['edit']):
    a, b = starts[k], starts[k + 1] if k + 1 < len(starts) else end
    if e.get('reverse'):
        t0 = e.get('from', last_clock.get(e['shot'], b - a))
        t1 = e.get('to', 0)
    else:
        t0 = e.get('from', 0)
        t1 = t0 + (b - a)
    last_clock[e['shot']] = t1
    line = ' '.join(w['w'] + w.get('p', '').strip() for w in words if a <= round(w['s'] * FPS) + LEAD < b)
    seg = {'shot': e['shot'], 'a': a, 'b': b, 't0': t0, 't1': t1, 'line': line}
    if e.get('look'):
        seg['look'] = e['look']
    if e.get('card'):
        seg['card'] = e['card']
    segments.append(seg)

ids = list(dict.fromkeys(s['shot'] for s in segments))
for sid in shots:
    if sid not in ids:
        print(f'note: shot {sid} is defined but not in the edit')
info = []
for sid in ids:
    segs = [s for s in segments if s['shot'] == sid]
    fwd = [s for s in segs if s['t1'] >= s['t0']]
    length = max([s['t1'] for s in fwd] + [s['t0'] for s in segs])
    d = shots[sid]
    first = segs[0]
    info.append({
        'id': sid, 'size': d.get('size', ''), 'key': d.get('key', (first['b'] - first['a']) // 2), 'len': length, 'first': first['a'],
        'line': first['line'], 'note': d.get('note', ''),
    })

# ---------------------------------------------------------------- captions (word by word)
def caption_chunks(words, maxw):
    """Group the voice's words into chunks of 1..maxw words. A chunk never crosses punctuation (a comma, full stop,
    question mark); a run longer than maxw is split into even parts (4 words -> 2+2, 5 -> 3+2), so no one-word orphans.
    A hyphenated word (voice.py reads "forty-two" as forty, two) stays one unit and is captioned as written."""
    units = []
    for w in words:
        if units and units[-1].get('p', '').strip() == '-':  # the previous word ended in a hyphen: join them
            u = units[-1]
            u.update({'w': u['w'] + '-' + w['w'], 'e': w['e'], 'p': w.get('p', '')})
        else:
            units.append(dict(w))
    runs, cur = [], []
    for u in units:
        cur.append(u)
        if any(ch in u.get('p', '') for ch in '.,?!;:—…'):
            runs.append(cur)
            cur = []
    if cur:
        runs.append(cur)
    out = []
    for run in runs:
        n = len(run)
        parts = -(-n // maxw)
        sizes = [n // parts + (1 if i < n % parts else 0) for i in range(parts)]
        i = 0
        for sz in sizes:
            grp = run[i:i + sz]
            i += sz
            text = ' '.join(g['w'] for g in grp) + ''.join(ch for ch in grp[-1].get('p', '') if ch in '?!…')
            out.append({'text': text, 's': grp[0]['s'], 'e': grp[-1]['e']})
    return out


cap_cfg = ep.get('captions', {})
captions = []
if words and cap_cfg.get('on', SHORTS):
    raw = caption_chunks(words, int(cap_cfg.get('maxWords', 3)))
    skip = set(cap_cfg.get('skipShots', []))
    skip_ranges = [(g['a'], g['b']) for g in segments if g['shot'] in skip]
    for i, c in enumerate(raw):
        a = round(c['s'] * FPS)
        if any(x <= a < y for x, y in skip_ranges):
            continue
        nxt = round(raw[i + 1]['s'] * FPS) if i + 1 < len(raw) else end
        b = min(nxt, round(c['e'] * FPS) + round(0.3 * FPS), end)
        captions.append({'a': a, 'b': max(a + 2, b), 'text': c['text']})

# ---------------------------------------------------------------- fx, audio
fx = []
for e in ep.get('fx', []):
    item = {k: v for k, v in e.items() if k != 'at'}
    item['f'] = resolve(e['at'], words, FPS, segments, ids)
    fx.append(item)
old = load_json(ep_dir(slug) / 'timeline.json', {}) or {}
audio = {k: v for k, v in old.get('audio', {}).items() if k.endswith('Vol')}
for k in ['voice', 'sfx', 'music']:
    f = stem(slug, k)
    if f:
        audio[k] = f'{slug}/{f.name}'
title = ep.get('title', ['', ''])
tl = {'slug': slug, 'title': ' '.join(title) if isinstance(title, list) else title, 'format': FORMAT, 'fps': FPS, 'total': end, 'segments': segments, 'shots': info, 'fx': fx, 'audio': audio}
if vote:
    tl['vote'] = vote
if captions:
    tl['captions'] = captions
    style = {k: cap_cfg[k] for k in ('size', 'y', 'accent', 'accentColor', 'uppercase') if k in cap_cfg}
    if style:
        tl['captionStyle'] = style
save_json(ep_dir(slug) / 'timeline.json', tl)

# ---------------------------------------------------------------- the pace report and the shot list
cuts = [s['a'] for s in segments[1:]]
lens = [(s['b'] - s['a']) / FPS for s in segments]
dur = end / FPS
first10 = len([c for c in cuts if c < 10 * FPS])
per_min = len(cuts) / dur * 60
print(f'{len(segments)} segments, {len(ids)} shots, {dur:.1f} s ({end} frames)')
print(f'pace: {per_min:.0f} cuts/min overall, {first10 / min(10, dur) * 60:.0f} cuts/min in the first 10 s; median shot {statistics.median(lens):.1f} s, longest {max(lens):.1f} s')
if per_min < 20:
    print('  ! slower than the house pace (20 to 30 cuts a minute): split a long shot on a phrase')
elif per_min > 30:
    print('  ! faster than the house pace (20 to 30 cuts a minute): the edit is strobing; hold shots longer')
HOLD = 5.5 if SHORTS else 6.0  # a Short changes picture every 2 to 3 s, but a card or a loop may hold ~4 s
for s in segments:
    if (s['b'] - s['a']) / FPS > HOLD:
        print(f'  ! {s["shot"]} holds {(s["b"] - s["a"]) / FPS:.1f} s: give it action inside (a move, a light change, a push in) or split it')

# ---------------------------------------------------------------- the Shorts checks
checks = []
if SHORTS:
    nwords = len(words)
    lo, hi = PRESETS.get(SHORT.get('preset'), (None, None))
    cap = hi if hi is not None else 59
    if dur > cap:
        checks.append(f'! {dur:.1f} s is over the {cap} s {SHORT.get("preset") or "Shorts"} cap: cut words, or tighten `gaps`')
    elif lo is not None and not lo <= dur <= hi:
        checks.append(f'! {dur:.1f} s is outside the "{SHORT["preset"]}" preset ({lo}-{hi} s): change the preset or the script')
    else:
        checks.append(f'ok {dur:.1f} s' + (f' (preset {SHORT["preset"]}: {lo}-{hi} s)' if lo else ' (no preset set: add "short": {"preset": "snap"|"twist"|"choice"|"choice-long"})'))
    if words:
        first = words[0]['s']
        checks.append(f'{"ok" if first <= 0.45 else "!"} the first word starts at {first:.2f} s' + ('' if first <= 0.45 else ': the first 3 seconds are the hook, cut the lead-in'))
        checks.append(f'{"ok" if 2.2 <= nwords / (words[-1]["e"] - first + 1e-9) <= 3.4 else "!"} {nwords} words, {nwords / (words[-1]["e"] - first + 1e-9):.1f} words a second (Shorts narration: about 2.5 to 2.9)')
    checks.append(f'{"ok" if 20 <= per_min <= 30 else "!"} {per_min:.0f} picture changes a minute (target 20 to 30: a new picture every 2 to 3 s)')
    if lens:
        med = statistics.median(lens)
        checks.append(f'{"ok" if 1.5 <= med <= 3.5 else "!"} median shot {med:.1f} s (target 1.5 to 3.5 s)')
    first_shot, last_shot = ep['edit'][0]['shot'], ep['edit'][-1]['shot']
    if first_shot == last_shot:
        checks.append(f'ok the Short ends on its first shot ({first_shot}): it loops')
    else:
        checks.append(f'check the loop by eye: it opens on {first_shot} and ends on {last_shot}; the last image should echo the first')
    tail_s = (end - round(words[-1]['e'] * FPS)) / FPS if words else 0
    if tail_s > 0.9:
        checks.append(f'! {tail_s:.1f} s of tail after the last word: a looping Short ends within about 0.5 s (set "tail": 0.5)')
    checks.append(f'{len(captions)} caption chunks written' if captions else '! no captions (set "captions": {"on": true})')
    print('Shorts checks:')
    for c in checks:
        print('  ' + c)

rows = ['| # | Shot | Size | In | Length | Clock | Look | Words |', '|---|---|---|---|---|---|---|---|']
for k, s in enumerate(segments):
    d = shots[s['shot']]
    clock = f"{s['t0']:.0f}→{s['t1']:.0f}" + (' (back)' if s['t1'] < s['t0'] else '')
    rows.append(f"| {k + 1} | {s['shot']} | {d.get('size', '')} | {s['a'] / FPS:.2f} s | {(s['b'] - s['a']) / FPS:.2f} s | {clock} | {s.get('look', '')} | {s['line']} |")
md = f"# {tl['title']}: shot list\n\n{FORMAT}, {dur:.1f} s, {len(segments)} segments, {per_min:.0f} cuts/min\n\n"
if checks:
    md += '## Shorts checks\n\n' + '\n'.join(f'- {c}' for c in checks) + '\n\n'
md += '\n'.join(rows) + '\n'
(out_dir(slug) / 'shotlist.md').write_text(md, encoding='utf-8')
print(md)
