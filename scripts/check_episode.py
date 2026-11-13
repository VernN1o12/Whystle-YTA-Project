"""Step 1b: the structural contract check for a data-driven episode.

python <skill>/scripts/check_episode.py <slug> [--require-timeline] [--strict]

Reads  src/episodes/<slug>/episode.json
       src/episodes/<slug>/shots.json
       src/episodes/<slug>/timeline.json   (optional; required with --require-timeline)
       src/episodes/<slug>/words.json      (optional; used to resolve word cues)
       src/episodes/<slug>/index.tsx
Checks ids, clocks, sets, cast, captions, pacing, the choice cards and the 59 s cap.
Exit code 1 on errors. Warnings are judgement calls; --strict turns them into errors.

The valid set names, cast keys, light names and expressions are read from the studio source, so this checker
cannot drift from the renderer. Run it from shorts-studio/ (the folder with src/episodes and package.json).
"""
import json, pathlib, re, statistics, sys

sys.stdout.reconfigure(encoding='utf-8')

args = sys.argv[1:]
if not args or args[0].startswith('--'):
    raise SystemExit(__doc__)
slug = args[0]
STRICT = '--strict' in args
REQUIRE_TIMELINE = '--require-timeline' in args

STUDIO = pathlib.Path.cwd()
EP = STUDIO / 'src' / 'episodes' / slug
if not EP.exists():
    raise SystemExit(f'No episode folder at {EP}: run this from the studio folder')

errors, warns, oks = [], [], []


def err(m):
    errors.append(m)


def warn(m):
    warns.append(m)


def ok(m):
    oks.append(m)


def load(name, default=None):
    p = EP / name
    if not p.exists():
        return default
    try:
        return json.loads(p.read_text(encoding='utf-8'))
    except Exception as e:
        raise SystemExit(f'{p}: not valid JSON ({e})')


def num(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool)


def int_(x):
    return isinstance(x, int) and not isinstance(x, bool)


def vec3(x):
    return isinstance(x, list) and len(x) == 3 and all(num(v) for v in x)


# ---------------------------------------------------------------- what the engine knows
def ts_block(path, pattern):
    if not path.exists():
        return ''
    return path.read_text(encoding='utf-8')


def known_sets():
    src = ts_block(STUDIO / 'src' / 'engine' / 'toon' / 'sets' / 'index.ts', '')
    m = re.search(r'export const SETS[^=]*=\s*\{(.*?)\n\};', src, re.S)
    if not m:
        return {'studio', 'void', 'scan', 'scan2', 'habitat', 'mars_surface', 'greenhouse', 'schematic'}
    return set(re.findall(r'^\s{2}([a-z0-9_]+)\s*:', m.group(1), re.M))


def known_cast():
    src = ts_block(STUDIO / 'src' / 'engine' / 'toon' / 'outfits.ts', '')
    m = re.search(r'export const CAST[^=]*=\s*\{(.*?)\n\};', src, re.S)
    if not m:
        return {'wren', 'sam', 'doc', 'voss', 'chen', 'kovic'}
    return set(re.findall(r'^\s{2}([a-z0-9_]+)\s*:', m.group(1), re.M))


def type_values(name, default):
    src = ts_block(STUDIO / 'src' / 'engine' / 'toon' / 'types.ts', '')
    m = re.search(rf'export type {name}\s*=(.*?);', src, re.S)
    if not m:
        return set(default)
    return set(re.findall(r'"([^"]+)"', m.group(1)))


def expr_values():
    src = ts_block(STUDIO / 'src' / 'engine' / 'bridge' / 'toon.ts', '')
    m = re.search(r'export type Expr\s*=(.*?);', src, re.S)
    if not m:
        return {'neutral', 'smile', 'grin', 'stern', 'shock', 'nervous', 'pained', 'relief', 'relief_open', 'oops'}
    return set(re.findall(r'"([^"]+)"', m.group(1)))


SETS = known_sets()
CAST = known_cast()
LIGHTS = type_values('LightName', {'day', 'golden', 'studio', 'void', 'habitat', 'mars', 'greenhouse', 'schematic'})
FXKINDS = type_values('FxKind', {'ring', 'note', 'burst', 'star'})
EXPRS = expr_values()
MODES = {'stand', 'stroll', 'march', 'sit', 'fall'}
HELMETS = {'on', 'off', 'carry'}
PROPS = {'keys', 'wrench', 'clipboard', 'seal', None}
EASES = {'linear', 'out', 'inOut'}
PRESETS = {
    'snap': {'seconds': (24, 35), 'words': (62, 90), 'shots': (4, 12)},
    'twist': {'seconds': (46, 57), 'words': (115, 148), 'shots': (8, 20)},
    'choice': {'seconds': (46, 59), 'words': (115, 155), 'shots': (10, 24)},
    'choice-long': {'seconds': (75, 150), 'words': (190, 260), 'shots': (20, 36)},
}
HARD_MAX_S = 180  # absolute ceiling; the preset sets the real cap
HARD_MAX_WORDS = 300


def preset_caps(p):
    if p in PRESETS:
        return PRESETS[p]['seconds'][1], PRESETS[p]['words'][1]
    return 59, 155
CUE = re.compile(r'^(?P<base>[^+\-#]+?)(?:#(?P<nth>\d+))?(?P<off>[+-]\d+)?$')
TOKEN = re.compile(r"[\w'’]+(?:[.,:\-–][\w'’]+)*")


# ---------------------------------------------------------------- the episode file
ep = load('episode.json')
if not ep:
    raise SystemExit(f'No episode.json at {EP}')

preset = (ep.get('short') or {}).get('preset')
if ep.get('format') != 'shorts':
    err(f'format is {ep.get("format")!r}: every episode in this skill is a Short ("shorts")')
if ep.get('fps') != 30:
    err(f'fps is {ep.get("fps")!r}: Shorts render at 30 fps')
if not ep.get('id'):
    err('episode.id is missing')
if ep.get('slug') != slug:
    err(f'episode.slug is {ep.get("slug")!r}, folder is {slug!r}')
if preset not in PRESETS:
    err(f'unknown preset {preset!r} (snap, twist, choice or choice-long)')
else:
    ok(f'preset {preset} ({PRESETS[preset]["seconds"][0]}-{PRESETS[preset]["seconds"][1]} s)')
MAX_S, MAX_WORDS = preset_caps(preset)

short = ep.get('short') or {}
for k in ('title', 'search_phrase', 'wardrobe', 'hook', 'loop'):
    if not str(short.get(k) or '').strip():
        warn(f'short.{k} is empty: fill it before the storyboard')
pattern = short.get('pattern')
if pattern and pattern not in {'twist', 'demo-trio', 'countdown', 'arc', 'choice', 'choice-long', 'snap'}:
    warn(f'short.pattern {pattern!r} is not one of twist, demo-trio, countdown, arc, choice, choice-long, snap')

lead = ep.get('lead', 2)
if not int_(lead) or not 0 <= lead <= 10:
    warn(f'lead is {lead!r}: use 0-10 frames')
tail = ep.get('tail', 0.9)
if not num(tail) or not 0 <= tail <= 2:
    warn(f'tail is {tail!r}: use 0-2 seconds')

# captions
cap = ep.get('captions') or {}
if cap.get('on') is not True:
    err('captions.on must be true: burned-in captions are part of every Short')
maxw = cap.get('maxWords', 3)
if not int_(maxw) or not 1 <= maxw <= 3:
    err(f'captions.maxWords is {maxw!r}: use 1-3')
y = cap.get('y', 0.68)
if not num(y) or not 0.5 <= y <= 0.85:
    err(f'captions.y is {y!r}: use 0.68-0.70 for a Short')
elif not 0.66 <= y <= 0.72:
    warn(f'captions.y is {y}: the house band is 0.68-0.70')
size = cap.get('size', 104)
if num(size) and not 80 <= size <= 130:
    warn(f'captions.size is {size}: the house range is 100-112')

# script
beats = ep.get('script') or []
if not beats:
    err('script is empty')
texts = []
for i, b in enumerate(beats, 1):
    t = b.get('text') if isinstance(b, dict) else str(b)
    if not str(t or '').strip():
        err(f'script beat {i} has no text')
    else:
        texts.append(str(t).strip())
text = ' '.join(texts)
words = TOKEN.findall(text)
nwords = len(words)
if preset in PRESETS:
    lo, hi = PRESETS[preset]['words']
    if not lo <= nwords <= hi:
        (err if nwords > MAX_WORDS else warn)(f'{nwords} words is outside {preset} ({lo}-{hi})')
    else:
        ok(f'{nwords} words fits {preset} ({lo}-{hi})')
if nwords > MAX_WORDS:
    err(f'{nwords} words is over the {MAX_WORDS}-word maximum for {preset}')
min_beats = 8 if preset == 'choice-long' else 5 if preset in ('twist', 'choice') else 3
if len(beats) < min_beats:
    warn(f'{len(beats)} script beats: {preset or "this preset"} wants at least {min_beats}')
def sentences(t):
    parts = re.split(r'(?<=[.!?…])["”’)]*\s+(?=["“‘(]?[A-Z0-9])', t.strip())
    return [p.strip() for p in parts if p.strip()]


first = texts[0] if texts else ''
first_sent = (sentences(first) or [first])[0]
if re.match(r'(hey|hi|hello|welcome|today|so |okay|ok |alright|guys)\b', first_sent.lower()):
    err(f'the hook opens with a greeting or filler: "{first_sent[:60]}"')
if len(TOKEN.findall(first_sent)) > 14:
    warn(f'the hook sentence is {len(TOKEN.findall(first_sent))} words: land it in about 3 seconds')

# science
science = ep.get('science') or []
if science:
    allowed = ('verified', 'arithmetic', 'hypothetical', 'supported')
    for i, f in enumerate(science, 1):
        if not isinstance(f, dict):
            err(f'science {i} is not an object')
            continue
        for k in ('claim', 'source', 'status'):
            if not str(f.get(k) or '').strip():
                err(f'science {i} is missing {k}')
        st = str(f.get('status') or '').strip().lower()
        if st and not st.startswith(allowed):
            warn(f'science {i} status {f.get("status")!r}: use verified, arithmetic, hypothetical or supported')
    ok(f'{len(science)} sourced claim(s)')
elif re.search(r'\d', text):
    err('the script states a number but has no `science` list (claim, working, source, status)')
else:
    warn('no science list: fine only if the script states no facts')

# cast
cast = ep.get('cast') or []
if not isinstance(cast, list):
    err('cast must be a list of cast keys')
    cast = []
if not cast:
    err('cast is empty: at least the hero must be billed')
for c in cast:
    if not isinstance(c, str) or c not in CAST:
        err(f'cast {c!r} is not in the engine CAST table ({", ".join(sorted(CAST))})')
if 'wren' not in cast:
    if preset == 'choice':
        ok('ensemble choice: the billed cast carries this Short')
    else:
        warn('wren is not billed in cast: Wren is the channel hero')

# shots (the edit's list)
ep_shots = ep.get('shots') or []
if not ep_shots:
    err('shots is empty: the edit needs a shot list')
ep_ids = []
for i, s in enumerate(ep_shots, 1):
    if not isinstance(s, dict):
        err(f'shots {i} is not an object')
        continue
    sid = s.get('id')
    if not sid:
        err(f'shots {i} has no id')
        continue
    if sid in ep_ids:
        err(f'shot id {sid!r} is duplicated in episode.shots')
    ep_ids.append(sid)
    if not str(s.get('size') or '').strip():
        warn(f'shot {sid} has no size')
    if not str(s.get('note') or '').strip():
        warn(f'shot {sid} has no note')
    if not int_(s.get('key', 0)) or s.get('key', 0) < 0:
        warn(f'shot {sid} key is {s.get("key")!r}: use a non-negative frame index')
if preset in PRESETS:
    lo, hi = PRESETS[preset]['shots']
    if not lo <= len(ep_shots) <= hi:
        warn(f'{len(ep_shots)} shots is outside {preset} ({lo}-{hi}): a Short cuts every 2-3 s')

# edit
edit = ep.get('edit') or []
if not edit:
    err('edit is empty')
edit_ids = []
prev_a, wi_prev = 0, 0
word_list = load('words.json', None)
for i, e in enumerate(edit):
    if not isinstance(e, dict):
        err(f'edit {i + 1} is not an object')
        continue
    sid = e.get('shot')
    at = str(e.get('at', '')).strip()
    if sid not in ep_ids:
        err(f'edit {i + 1} uses {sid!r}, which is not in episode.shots')
    if not at:
        err(f'edit {i + 1} ({sid}) has no at cue')
        continue
    if e.get('card') is not None and e.get('card') not in ('A', 'B', 'C', 'D'):
        err(f'edit {i + 1} card {e.get("card")!r}: use A-D')
    if e.get('reverse') and not int_(e.get('from', 0)):
        err(f'edit {i + 1} ({sid}) reverse needs an integer from (frames)')
    if 'from' in e and (not int_(e['from']) or e['from'] < 0):
        err(f'edit {i + 1} ({sid}) from is {e["from"]!r}: frames, non-negative')
    if 'to' in e and (not int_(e['to']) or e['to'] < 0):
        err(f'edit {i + 1} ({sid}) to is {e["to"]!r}: frames, non-negative')
    if e.get('look') and not isinstance(e['look'], str):
        err(f'edit {i + 1} ({sid}) look must be a string')

    # resolve the cue when words.json exists
    a = None
    if at.startswith('f:'):
        try:
            a = int(round(float(at[2:])))
        except ValueError:
            err(f'edit {i + 1} ({sid}) bad frame cue {at!r}')
    elif at.startswith('s:'):
        try:
            a = int(round(float(at[2:]) * 30))
        except ValueError:
            err(f'edit {i + 1} ({sid}) bad seconds cue {at!r}')
    elif at.startswith('+'):
        try:
            a = prev_a + int(at[1:])
        except ValueError:
            err(f'edit {i + 1} ({sid}) bad offset cue {at!r}')
    else:
        m = CUE.match(at)
        if not m:
            err(f'edit {i + 1} ({sid}) bad cue {at!r}')
        elif word_list:
            base, nth, off = m['base'], int(m['nth'] or 1), int(m['off'] or 0)
            target = re.sub(r"[^\w']", '', base.lower().replace('’', "'"))
            seen, found = 0, None
            for wi in range(wi_prev, len(word_list)):
                w = re.sub(r"[^\w']", '', str(word_list[wi].get('w', '')).lower().replace('’', "'"))
                if w == target:
                    seen += 1
                    if seen == nth:
                        found = wi
                        break
            if found is None:
                err(f'edit {i + 1} ({sid}) cue word {base!r} (#{nth}) is not in words.json after the previous cut')
            else:
                a = max(0, round(word_list[found]['s'] * 30) - lead + off)
                wi_prev = found + 1
    if a is not None:
        if i == 0:
            a = 0
        if i > 0 and a <= prev_a:
            err(f'edit {i + 1} ({sid}) starts at frame {a}, not after the previous cut ({prev_a})')
        prev_a = a
    if i == 0 and at != 'f:0':
        err(f'the first edit entry is {at!r}: it must be f:0 so the voice starts on frame 0')
    edit_ids.append(sid)
if edit and edit[0].get('shot') != edit[-1].get('shot'):
    warn(f'opens on {edit[0].get("shot")} and ends on {edit[-1].get("shot")}: the last image should echo the first')
for sid in ep_ids:
    if sid not in edit_ids:
        warn(f'shot {sid} is in episode.shots but never used in edit')

# ---------------------------------------------------------------- the visual file
visual = load('shots.json')
if not visual:
    raise SystemExit(f'No shots.json at {EP}')
vshots = visual.get('shots') or {}
if not isinstance(vshots, dict) or not vshots:
    raise SystemExit('shots.json: "shots" must be a non-empty object keyed by shot id')

for sid in ep_ids:
    if sid not in vshots:
        err(f'shot {sid} has no visual data in shots.json')
for sid in vshots:
    if sid not in ep_ids:
        warn(f'shots.json has {sid}, which is not in episode.shots (unused)')

for sid, d in vshots.items():
    if not isinstance(d, dict):
        err(f'{sid}: visual data is not an object')
        continue
    st = d.get('set')
    if st not in SETS:
        err(f'{sid}: unknown set {st!r} (known: {", ".join(sorted(SETS))})')
    li = d.get('light')
    if li not in LIGHTS:
        err(f'{sid}: unknown light {li!r} (known: {", ".join(sorted(LIGHTS))})')
    dur = d.get('dur')
    if not num(dur) or dur <= 0:
        err(f'{sid}: dur must be a positive number of seconds')
        dur = 0
    if dur > 12:
        warn(f'{sid}: dur {dur:.1f} s is a long source clock; the edit can split it, but check the shot has internal action')

    cam = d.get('cam')
    if not isinstance(cam, list) or not cam:
        err(f'{sid}: cam must be a non-empty list of keys')
    else:
        ts = []
        for j, c in enumerate(cam, 1):
            if not isinstance(c, dict):
                err(f'{sid}: cam key {j} is not an object')
                continue
            t = c.get('t')
            if not num(t) or t < 0:
                err(f'{sid}: cam key {j} t must be a non-negative number of seconds')
                continue
            ts.append(t)
            if not vec3(c.get('pos')):
                err(f'{sid}: cam key {j} pos must be [x, y, z]')
            if not vec3(c.get('look')):
                err(f'{sid}: cam key {j} look must be [x, y, z]')
            fov = c.get('fov')
            if fov is not None and (not num(fov) or not 10 <= fov <= 80):
                err(f'{sid}: cam key {j} fov {fov!r}: use 10-80')
            elif fov is not None and not 30 <= fov <= 50:
                warn(f'{sid}: cam key {j} fov {fov}: the house range is 30-50')
            roll = c.get('roll')
            if roll is not None and (not num(roll) or abs(roll) > 0.35):
                err(f'{sid}: cam key {j} roll {roll!r}: radians, keep |roll| <= 0.35')
            if c.get('ease') is not None and c['ease'] not in EASES:
                err(f'{sid}: cam key {j} ease {c["ease"]!r} (linear, out, inOut)')
        if ts:
            if ts[0] != 0:
                warn(f'{sid}: first camera key is t={ts[0]}, not 0')
            if ts != sorted(ts):
                err(f'{sid}: camera keys are not in time order')
            if dur and ts[-1] > dur + 0.05:
                err(f'{sid}: last camera key t={ts[-1]:.2f} is after dur={dur:.2f}')

    actors = d.get('actors', [])
    if not isinstance(actors, list):
        err(f'{sid}: actors must be a list')
        actors = []
    names = []
    for j, a in enumerate(actors, 1):
        if not isinstance(a, dict):
            err(f'{sid}: actor {j} is not an object')
            continue
        name = a.get('name')
        if not name:
            err(f'{sid}: actor {j} has no name')
        elif name in names:
            err(f'{sid}: actor name {name!r} is duplicated')
        else:
            names.append(name)
        ck = a.get('cast')
        if not isinstance(ck, str) or ck not in CAST:
            err(f'{sid}: actor {name or j} cast {ck!r} is not in CAST ({", ".join(sorted(CAST))})')
        for k in ('x', 'y', 'z'):
            if k in a and not num(a[k]):
                err(f'{sid}: actor {name or j} {k} must be a number')
        if a.get('expr') is not None and a['expr'] not in EXPRS:
            err(f'{sid}: actor {name or j} expr {a["expr"]!r} is not a known expression')
        if a.get('facing') is not None and a['facing'] not in (-1, 0, 1):
            err(f'{sid}: actor {name or j} facing {a["facing"]!r}: use -1, 0 or 1')
        if a.get('mode') is not None and a['mode'] not in MODES:
            err(f'{sid}: actor {name or j} mode {a["mode"]!r} (stand, stroll, march, sit, fall)')
        if a.get('helmet') is not None and a['helmet'] not in HELMETS:
            err(f'{sid}: actor {name or j} helmet {a["helmet"]!r} (on, off, carry)')
        if 'prop' in a and a['prop'] not in PROPS:
            err(f'{sid}: actor {name or j} prop {a["prop"]!r} (keys, wrench, clipboard, seal or null)')
        for k in ('wave', 'headTilt', 'tilt', 'look', 'phase', 'scale'):
            if k in a and not num(a[k]):
                err(f'{sid}: actor {name or j} {k} must be a number')
        keys = a.get('keys')
        if keys is not None:
            if not isinstance(keys, list) or not keys:
                err(f'{sid}: actor {name or j} keys must be a non-empty list')
            else:
                kts = []
                for q, k in enumerate(keys, 1):
                    if not isinstance(k, dict) or not num(k.get('t')) or k['t'] < 0:
                        err(f'{sid}: actor {name or j} key {q} needs a non-negative t (seconds)')
                        continue
                    kts.append(k['t'])
                    if k.get('expr') is not None and k['expr'] not in EXPRS:
                        err(f'{sid}: actor {name or j} key {q} expr {k["expr"]!r} is unknown')
                    if k.get('ease') is not None and k['ease'] not in EASES:
                        err(f'{sid}: actor {name or j} key {q} ease {k["ease"]!r}')
                if kts:
                    if kts[0] != 0:
                        warn(f'{sid}: actor {name or j} first key is t={kts[0]}, not 0')
                    if kts != sorted(kts):
                        err(f'{sid}: actor {name or j} keys are not in time order')
                    if dur and kts[-1] > dur + 0.05:
                        err(f'{sid}: actor {name or j} last key t={kts[-1]:.2f} is after dur={dur:.2f}')

    dof = d.get('dof')
    if dof is not None:
        if not isinstance(dof, dict):
            err(f'{sid}: dof must be an object')
        else:
            tr = dof.get('track')
            if tr and tr not in names:
                err(f'{sid}: dof.track {tr!r} is not an actor in this shot')
            if 'focus' in dof and (not num(dof['focus']) or dof['focus'] <= 0):
                err(f'{sid}: dof.focus must be a positive distance in metres')
            if 'cInf' in dof and (not num(dof['cInf']) or dof['cInf'] <= 0):
                err(f'{sid}: dof.cInf must be positive')
            if not tr and 'focus' not in dof:
                warn(f'{sid}: dof has neither track nor focus')

    fx = d.get('fx')
    if fx is not None:
        if not isinstance(fx, list):
            err(f'{sid}: fx must be a list')
        else:
            for q, f in enumerate(fx, 1):
                if not isinstance(f, dict):
                    err(f'{sid}: fx {q} is not an object')
                    continue
                if f.get('kind') not in FXKINDS:
                    err(f'{sid}: fx {q} kind {f.get("kind")!r} (ring, note, burst, star)')
                for k in ('x', 'y', 'z'):
                    if not num(f.get(k)):
                        err(f'{sid}: fx {q} needs a numeric {k}')
                t0, t1 = f.get('t0'), f.get('t1')
                if not num(t0) or not num(t1) or t1 <= t0:
                    err(f'{sid}: fx {q} needs t1 > t0 (seconds)')
                elif t0 < 0:
                    err(f'{sid}: fx {q} t0 is negative')
                elif dur and t1 > dur + 0.05:
                    warn(f'{sid}: fx {q} ends at {t1:.2f} s, after dur={dur:.2f}')
                if 'size' in f and (not num(f['size']) or f['size'] <= 0):
                    err(f'{sid}: fx {q} size must be positive')
                if 'seed' in f and not int_(f['seed']):
                    err(f'{sid}: fx {q} seed must be an integer')

    if 'phase' in d and not num(d['phase']):
        err(f'{sid}: phase must be a number (the set reads it)')
    if 'grade' in d and d['grade'] not in LIGHTS:
        err(f'{sid}: grade {d["grade"]!r} is not a known light')

ok(f'{len(vshots)} visual shot(s): sets {", ".join(sorted({str(d.get("set")) for d in vshots.values() if isinstance(d, dict)}))}')

# billing must match the film: every visual cast key is billed, and every billed actor appears
used_cast = sorted({a.get('cast') for d in vshots.values() if isinstance(d, dict)
                    for a in d.get('actors', []) if isinstance(a, dict) and a.get('cast')})
for c in used_cast:
    if c not in cast:
        err(f'visual cast {c!r} is not billed in episode.cast ({", ".join(str(x) for x in cast) or "empty"})')
for c in cast:
    if c not in used_cast:
        warn(f'cast {c!r} is billed but never appears in shots.json')

# ---------------------------------------------------------------- the timeline
timeline = load('timeline.json')
if not timeline:
    if REQUIRE_TIMELINE:
        err('timeline.json is missing: run plan.py first')
    else:
        warn('timeline.json is missing: run plan.py before the render')
else:
    if timeline.get('slug') != slug:
        err(f'timeline.slug is {timeline.get("slug")!r}, folder is {slug!r}')
    if timeline.get('fps') != ep.get('fps'):
        err(f'timeline.fps is {timeline.get("fps")!r}, episode.fps is {ep.get("fps")!r}')
    if timeline.get('format') != 'shorts':
        err(f'timeline.format is {timeline.get("format")!r}: expected shorts')
    total = timeline.get('total')
    if not int_(total) or total <= 0:
        err('timeline.total must be a positive frame count')
        total = 0
    elif total > MAX_S * 30:
        err(f'timeline.total is {total / 30:.1f} s: over the {MAX_S} s {preset} cap')
    else:
        ok(f'timeline: {total} frames ({total / 30:.1f} s)')
        if preset in PRESETS:
            lo, hi = PRESETS[preset]['seconds']
            secs = total / 30
            if secs < lo or secs > hi:
                warn(f'timeline is {secs:.1f} s: {preset} targets {lo}-{hi} s')

    segs = timeline.get('segments') or []
    if not segs:
        err('timeline.segments is empty')
    prev_b = 0
    for i, s in enumerate(segs):
        if not isinstance(s, dict):
            err(f'segment {i + 1} is not an object')
            continue
        sid = s.get('shot')
        if sid not in vshots:
            err(f'segment {i + 1} shot {sid!r} has no visual data')
            continue
        a, b = s.get('a'), s.get('b')
        t0, t1 = s.get('t0'), s.get('t1')
        if not all(int_(x) for x in (a, b, t0, t1)):
            err(f'segment {i + 1} ({sid}) needs integer a, b, t0, t1')
            continue
        if i == 0 and a != 0:
            err(f'the first segment starts at {a}, not 0')
        if i > 0 and a != prev_b:
            err(f'segment {i + 1} ({sid}) starts at {a}, the previous ended at {prev_b}: a gap or overlap')
        if b <= a:
            err(f'segment {i + 1} ({sid}) has b <= a')
        if t0 < 0 or t1 < 0:
            err(f'segment {i + 1} ({sid}) has a negative shot clock')
        durf = (vshots[sid].get('dur') or 0) * 30
        if max(t0, t1) > durf + 0.51:
            err(f'segment {i + 1} ({sid}) clock {max(t0, t1)} is past the shot dur ({durf:.1f} frames)')
        if s.get('card') is not None and s['card'] not in ('A', 'B', 'C', 'D'):
            err(f'segment {i + 1} ({sid}) card {s["card"]!r}: use A-D')
        prev_b = b
    if segs and prev_b != total:
        err(f'the last segment ends at {prev_b}, timeline.total is {total}')

    # pacing
    if total:
        dur_s = total / 30
        lens = [(s['b'] - s['a']) / 30 for s in segs if all(int_(s.get(k)) for k in ('a', 'b')) and s['b'] > s['a']]
        cuts = len(segs) - 1
        if lens:
            per_min = cuts / dur_s * 60
            if not 20 <= per_min <= 30:
                warn(f'{per_min:.0f} cuts/min: the house pace is 20-30')
            else:
                ok(f'pace: {per_min:.0f} cuts/min')
            med = statistics.median(lens)
            if not 1.5 <= med <= 3.5:
                warn(f'median shot {med:.1f} s: the house range is 1.5-3.5 s')
            else:
                ok(f'median shot {med:.1f} s')
            longest = max(lens)
            if longest > 5.5:
                warn(f'longest hold {longest:.1f} s: over 5.5 s, give the shot internal action or split it')

    # captions
    caps = timeline.get('captions') or []
    if not caps:
        err('timeline.captions is empty: burned-in captions are mandatory')
    else:
        prev_ca = -1
        for i, c in enumerate(caps):
            if not isinstance(c, dict):
                err(f'caption {i + 1} is not an object')
                continue
            a, b = c.get('a'), c.get('b')
            if not int_(a) or not int_(b):
                err(f'caption {i + 1} needs integer a and b')
                continue
            if a < 0 or (total and b > total):
                err(f'caption {i + 1} ({c.get("text")!r}) is outside the film (0-{total})')
            if b <= a:
                err(f'caption {i + 1} ({c.get("text")!r}) has b <= a')
            if a < prev_ca:
                err(f'caption {i + 1} starts before the previous caption')
            prev_ca = a
            t = str(c.get('text') or '').strip()
            if not t:
                err(f'caption {i + 1} has no text')
            elif len(t.split()) > maxw:
                warn(f'caption {i + 1} {t!r} has {len(t.split())} words (maxWords {maxw})')
        ok(f'{len(caps)} caption chunk(s)')

    style = timeline.get('captionStyle') or {}
    if style:
        sy = style.get('y')
        if sy is not None and (not num(sy) or not 0.5 <= sy <= 0.85):
            err(f'captionStyle.y is {sy!r}: use 0.68-0.70')
        elif sy is not None and not 0.66 <= sy <= 0.72:
            warn(f'captionStyle.y is {sy}: the house band is 0.68-0.70')

    # audio
    audio = timeline.get('audio') or {}
    voice = audio.get('voice')
    if not voice:
        err('timeline.audio.voice is missing')
    elif not (STUDIO / 'public' / voice).exists():
        err(f'timeline.audio.voice points at public/{voice}, which does not exist')
    else:
        ok(f'voice track: public/{voice}')
    for k in ('sfx', 'music'):
        p = audio.get(k)
        if not p:
            warn(f'timeline.audio.{k} is missing: run sfx.py')
        elif not (STUDIO / 'public' / p).exists():
            warn(f'timeline.audio.{k} points at public/{p}, which does not exist')
    for k in ('voiceVol', 'sfxVol', 'musicVol'):
        if k in audio and (not num(audio[k]) or not 0 <= audio[k] <= 2):
            warn(f'timeline.audio.{k} is {audio[k]!r}: use 0-2')

    # fx
    for i, f in enumerate(timeline.get('fx') or [], 1):
        if not isinstance(f, dict) or not int_(f.get('f')):
            err(f'timeline.fx {i} needs an integer frame f')
        elif total and not 0 <= f['f'] < total:
            err(f'timeline.fx {i} frame {f["f"]} is outside 0-{total - 1}')

    # choice cards
    if preset in ('choice', 'choice-long'):
        cards = [(s.get('card'), s) for s in segs if s.get('card')]
        letters = [c for c, _ in cards]
        if sorted(set(letters)) != ['A', 'B', 'C', 'D'] or len(letters) != 4:
            err(f'{preset} needs exactly one A, B, C and D card; found {letters}')
        else:
            ok('choice cards: A, B, C and D each once')
            if letters != ['A', 'B', 'C', 'D']:
                warn(f'choice cards run {letters}: the house order is A-D')
            for c, s in cards:
                if all(int_(s.get(k)) for k in ('a', 'b')) and (s['b'] - s['a']) / 30 < 0.8:
                    warn(f'card {c} is on screen for only {(s["b"] - s["a"]) / 30:.1f} s')

    # the final vote overlay (choice-long)
    if preset == 'choice-long':
        v = ep.get('vote')
        if not isinstance(v, dict):
            err('choice-long needs an episode.vote block: {"at": ..., "question": ..., "options": [...]}')
        else:
            if not str(v.get('question') or '').strip():
                err('vote.question is empty')
            opts = v.get('options') or []
            vletters = [o.get('letter') for o in opts if isinstance(o, dict)]
            if vletters != ['A', 'B', 'C', 'D']:
                err(f'vote.options must be A, B, C, D in order; found {vletters}')
            for o in opts:
                if not isinstance(o, dict) or not str(o.get('label') or '').strip():
                    err('vote options need a letter, a label and a detail')
        tv = timeline.get('vote')
        if not isinstance(tv, dict):
            err('timeline.vote is missing: run plan.py after adding the vote block')
        else:
            va, vb = tv.get('a'), tv.get('b')
            if not all(int_(x) for x in (va, vb)):
                err('timeline.vote needs integer a and b')
            elif not total or not 0 <= va < vb <= total:
                err(f'timeline.vote {va}-{vb} is outside the film')
            else:
                ok(f'vote card: {(vb - va) / 30:.1f} s from {va / 30:.1f} s')
                if (vb - va) / 30 < 2.5:
                    warn(f'the vote card holds only {(vb - va) / 30:.1f} s: give the viewer 3-5 s to read it')

    # words
    if word_list:
        if not isinstance(word_list, list) or not word_list:
            err('words.json is empty')
        else:
            prev_s = -1
            for i, w in enumerate(word_list):
                s, e = w.get('s'), w.get('e')
                if not num(s) or not num(e):
                    err(f'word {i + 1} needs numeric s and e')
                    continue
                if s < prev_s - 0.01:
                    err(f'word {i + 1} ({w.get("w")!r}) is out of order')
                if e < s:
                    err(f'word {i + 1} ({w.get("w")!r}) ends before it starts')
                prev_s = s
            if word_list[0].get('s', 1) > 0.45:
                err(f'the first word starts at {word_list[0]["s"]:.2f} s: the hook must land by 0.45 s')
            else:
                ok(f'the first word starts at {word_list[0]["s"]:.2f} s')
            if total and word_list[-1].get('e', 0) > total / 30 + 0.1:
                warn(f'the last word ends at {word_list[-1]["e"]:.2f} s, after the film ({total / 30:.2f} s)')

# ---------------------------------------------------------------- the glue
index = EP / 'index.tsx'
if not index.exists():
    err('index.tsx is missing: the composition needs the glue component')
else:
    src = index.read_text(encoding='utf-8')
    for token, label in (('ToonShort', 'ToonShort'), ('Captions', 'Captions'), ('Audio', 'Audio'), ('segments', 'timeline.segments')):
        if token not in src:
            err(f'index.tsx does not use {label}')
    if any(isinstance(d, dict) and 'phase' in d for d in vshots.values()) and 'phase' not in src:
        err('index.tsx drops shot phase: add `phase: d.phase` to the SceneSpec mapping')
    if preset in ('choice', 'choice-long') and 'card' not in src:
        warn(f'{preset} episode but index.tsx has no card overlay: draw timeline.segments[].card')
    if preset == 'choice-long' and 'vote' not in src.lower():
        warn('choice-long episode but index.tsx has no vote overlay: draw timeline.vote')
    comp = ep.get('id')
    if comp and f'export const {comp}' not in src:
        err(f'index.tsx does not export the composition {comp!r}')

# registration
idx = STUDIO / 'src' / 'episodes' / 'index.ts'
if idx.exists():
    reg = idx.read_text(encoding='utf-8')
    comp = ep.get('id')
    if comp and f"id: '{comp}'" not in reg and f'id: "{comp}"' not in reg:
        warn(f'{comp!r} is not registered in src/episodes/index.ts')
else:
    warn('src/episodes/index.ts is missing')

# ---------------------------------------------------------------- report
print(f'{slug}: {len(vshots)} visual shots, {len(ep.get("edit") or [])} edit entries')
print()
for m in oks:
    print(f'  ok   {m}')
for m in warns:
    print(f'  warn {m}')
for m in errors:
    print(f'  ERR  {m}')
if STRICT:
    errors += warns
    warns = []
print(f'\n{len(errors)} error(s), {len(warns)} warning(s)')
sys.exit(1 if errors else 0)
