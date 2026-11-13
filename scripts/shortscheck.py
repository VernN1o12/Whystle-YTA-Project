"""The Shorts rule check: the rules that can be counted, counted by code instead of by eye.

Script (works in the studio or on its own):
  python <skill>/scripts/shortscheck.py <slug>                    # reads src/episodes/<slug>/episode.json
  python <skill>/scripts/shortscheck.py --file script.txt         # plain text, or an episode.json-shaped file
      [--preset snap|twist|choice|choice-long] [--route code|flow] [--clip 8|10] [--title "the YouTube title"] [--pattern twist|demo-trio|countdown|arc|choice|choice-long]

Publishing kit:
  python <skill>/scripts/shortscheck.py <slug> --publish          # reads out/<slug>/publish.json
  python <skill>/scripts/shortscheck.py --file publish.json --publish

Checks: length and word count against the preset, sentence length, banned openers and calls to action, the number
in the hook, the hypothetical label, the last line echoing the first, the fact-check list, the Flow clip-pack plan
(sentences grouped into 16-18-word clips), a crude safety keyword screen (flags to read, never a verdict), and the
title / description / tag format. Exit code 1 if any error, so it can gate a step. Warnings are judgement calls.

publish.json: {"search_phrase": "...", "titles": [{"text": "... 🧠", "recommended": true}, ...],
               "description": "line 1\\nline 2\\n#shorts #tag #tag", "tags": ["...", ...]}
"""
import json, math, pathlib, re, sys

args = sys.argv[1:]


def opt(name, default=None):
    return args[args.index(name) + 1] if name in args else default


# ---------------------------------------------------------------- the presets (see references/story.md)
PRESETS = {
    'snap': {'seconds': (24, 35), 'words': (62, 90), 'what': 'one hook, one payoff (the competitor-proven length)'},
    'twist': {'seconds': (46, 57), 'words': (115, 148), 'what': 'the full Twist Reveal (the watch-time play)'},
    'choice': {'seconds': (46, 59), 'words': (115, 155), 'what': 'the survival choice: four options, one catch, one vote'},
    'choice-long': {'seconds': (75, 150), 'words': (190, 260), 'what': 'the story-led survival choice: one POV, four costs, one call, one vote'},
}
HARD_MAX_S, HARD_MAX_WORDS = 180, 300  # absolute ceilings; the preset sets the real cap
WPS = {'code': 2.7, 'flow': 2.5}  # words a second: KokoroTTS/ElevenLabs after voice.py tightens the pauses / Flow's voice
TOKEN = re.compile(r"[\w'’]+(?:[.,:\-–][\w'’]+)*")
errors, warns, oks = [], [], []


def err(m): errors.append(m)
def warn(m): warns.append(m)
def ok(m): oks.append(m)


def load():
    """(kind, data): the script's text plus whatever the file knew about it."""
    f = opt('--file')
    if f:
        p = pathlib.Path(f)
        if not p.exists():
            raise SystemExit(f'No file {p}')
        raw = p.read_text(encoding='utf-8')
        if p.suffix == '.json':
            return json.loads(raw)
        return {'script': [{'text': raw}]}
    slug = next((a for i, a in enumerate(args) if not a.startswith('--') and (i == 0 or not args[i - 1].startswith('--') or args[i - 1] in ('--publish',))), None)
    if not slug:
        raise SystemExit(__doc__)
    cwd = pathlib.Path.cwd()
    p = cwd / ('out' if '--publish' in args else 'src/episodes') / slug / ('publish.json' if '--publish' in args else 'episode.json')
    if not p.exists():
        raise SystemExit(f'No {p}: run this from the studio folder' + (' (and write out/<slug>/publish.json first)' if '--publish' in args else ''))
    return json.loads(p.read_text(encoding='utf-8'))


def sentences(text):
    parts = re.split(r'(?<=[.!?…])["”’)]*\s+(?=["“‘(]?[A-Z0-9])', text.strip())
    return [p.strip() for p in parts if p.strip()]


def n_words(text):
    return len(TOKEN.findall(text))


STOP = set('this that with from your you the and for are was were will would could should have has had not but what when then than them they their there here just only into over about like more some most very make made does done it\'s that\'s you\'re can\'t don\'t one two'.split())
NUMWORDS = ('hundred', 'thousand', 'million', 'billion', 'trillion', 'percent', 'dozen')
_U = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split()
_T = 'x x twenty thirty forty fifty sixty seventy eighty ninety'.split()


def spell(n):
    """A number as it is spoken, for the numbers a title can carry: 42 -> forty-two, 7 -> seven, 100 -> one hundred."""
    if n < 20:
        return _U[n]
    if n < 100:
        return _T[n // 10] + ('-' + _U[n % 10] if n % 10 else '')
    if n < 1000:
        return _U[n // 100] + ' hundred' + (' ' + spell(n % 100) if n % 100 else '')
    return ''


# ---------------------------------------------------------------- the script
def check_script(d):
    beats = d.get('script') or []
    text = ' '.join(b['text'].strip() if isinstance(b, dict) else str(b).strip() for b in beats)
    if not text:
        raise SystemExit('The script is empty.')
    short = d.get('short', {})
    preset = opt('--preset') or short.get('preset')
    route = opt('--route') or short.get('route') or d.get('route') or 'code'
    pattern = opt('--pattern') or short.get('pattern') or ''
    title = opt('--title') or short.get('title') or ''
    sents = sentences(text)
    words = n_words(text)
    lens = [n_words(s) for s in sents]
    print(f'{words} words, {len(sents)} sentences (shortest {min(lens)}, longest {max(lens)}), route {route}, preset {preset or "none"}')

    # ---- length
    secs = words / WPS.get(route, 2.7)
    if route == 'flow':
        clip = int(opt('--clip', 8))
        hard = 18 if clip == 8 else 24
        lo, hi = (16, 18) if clip == 8 else (20, 23)
        clips, cur = [], []
        for s_, n in zip(sents, lens):
            if n > hard:
                err(f'a {n}-word sentence cannot fit one {clip} s clip (max {hard}): "{s_[:70]}…"')
            if cur and sum(c[1] for c in cur) + n > hard:
                clips.append(cur)
                cur = []
            cur.append((s_, n))
        if cur:
            clips.append(cur)
        secs = sum(sum(c[1] for c in cl) / WPS['flow'] + 0.4 for cl in clips)
        want = math.ceil(words / (17 if clip == 8 else 22))
        print(f'\nClip-pack plan ({clip} s clips, {lo}-{hi} words each, sentences never split): {len(clips)} clips, about {want} expected')
        for i, cl in enumerate(clips, 1):
            w = sum(c[1] for c in cl)
            flag = '' if lo <= w <= hi or (i == len(clips) and w <= hi) else ('  <- underfilled: pair the sentences so they add up to ' + f'{lo}-{hi}' if w < lo else '  <- over')
            print(f'  clip {i:>2}: {w:>2} words  ({" | ".join(str(c[1]) for c in cl)}){flag}')
            if w > hard:
                err(f'clip {i} has {w} words (max {hard})')
        if len(clips) > want + 2:
            warn(f'{len(clips)} clips for {words} words (about {want} expected): short sentences that cannot pair up; rebalance the script (aim for 8-10 word sentences, or pairs adding to {lo}-{hi})')
        else:
            ok(f'clip packing: {len(clips)} clips for {words} words')
    print(f'estimated length: about {secs:.0f} s')

    # ---- preset
    max_s, max_words = 59, 155
    if preset in PRESETS:
        P = PRESETS[preset]
        a, b = P['words']
        sa, sb = P['seconds']
        max_s, max_words = sb, b
        if not a <= words <= b:
            (err if words > b else warn)(f'{words} words is outside "{preset}" ({a}-{b} words: {P["what"]}); aim for the low end, every clip or pause trims it')
        else:
            ok(f'{words} words fits "{preset}" ({a}-{b})')
        if not sa - 2 <= secs <= sb + 1:
            warn(f'about {secs:.0f} s is outside "{preset}" ({sa}-{sb} s)')
    elif preset:
        err(f'unknown preset "{preset}" (snap, twist, choice or choice-long)')
    else:
        warn('no preset set: "short": {"preset": "snap"} (24-35 s), "twist" (46-57 s), "choice" (46-59 s) or "choice-long" (75-150 s)')
    if secs > max_s or words > max_words:
        err(f'about {secs:.0f} s / {words} words is over the {max_s} s / {max_words}-word cap for "{preset or "a Short"}"')

    # ---- sentences
    limit = 14 if route == 'flow' else 12
    for s_, n in zip(sents, lens):
        if n > limit:
            warn(f'{n} words, hard to read as one picture ({limit} max): "{s_[:80]}…"')

    # ---- the hook
    first, last = sents[0], sents[-1]
    low = text.lower()
    if re.match(r'(hey|hi|hello|welcome|today|so |okay|ok |alright|guys)', first.lower()):
        err(f'the hook opens with a greeting or filler: "{first[:50]}": start on the subject within the first 4 words')
    if n_words(first) > 14:
        warn(f'the hook is {n_words(first)} words: the first sentence should be short enough to land in about 3 seconds')
    if title:
        nums = [int(n.replace(',', '')) for n in re.findall(r'\d[\d,]*', title) if n.replace(',', '').isdigit()]
        spelled = [w for w in NUMWORDS + ('two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten') if re.search(rf'\b{w}\b', title.lower())]
        norm = lambda x: re.sub(r'[-–]', ' ', x.lower())
        fl = norm(first)
        for n in nums:  # the title says 42, the script says "forty-two" (spelled out for the voice): both count
            forms = {str(n), f'{n:,}', spell(n)} - {''}
            hit = any(re.search(rf'\b{re.escape(norm(f))}\b', fl) for f in forms)
            (ok if hit else warn)(f'the title has a number ({n}): ' + ('it is in the hook' if hit else f'say it in the first sentence: "{first[:60]}"'))
        for w in spelled:
            (ok if w in fl else warn)(f'the title has "{w}": ' + ('it is in the hook' if w in fl else 'say it in the first sentence'))

    # ---- banned phrases and calls to action
    for bad in ["did you know", "in this video", "welcome back", "today we're going to", "today we are going to", "thanks for watching", "subscribe", "smash that", "link in bio", "don't forget to", "before we start"]:
        if bad in low:
            err(f'"{bad}" is not allowed (no intro, no outro, no subscribe)')
    for soft in ["like if", "comment below", "in the comments", "follow for"]:
        if soft in low and preset not in ('choice', 'choice-long'):
            warn(f'"{soft}": a call to action is only allowed as the one light teaser, never subscribe')

    # ---- the hypothetical label, the loop
    if pattern != 'countdown' and preset not in ('choice', 'choice-long') and not re.search(r"what if|imagine|suppose|pretend|hypothetical|let's say|if you could|if you had", low):
        warn('no hypothetical label (what if / imagine / suppose): a thought experiment must be labelled, with the real facts first')
    content = lambda s_: {w.lower() for w in TOKEN.findall(s_) if len(w) >= 4 and w.lower() not in STOP}
    if content(first) & content(last):
        ok('the last line echoes the opening (shared: ' + ', '.join(sorted(content(first) & content(last))[:3]) + ')')
    else:
        warn('the last line shares no word with the opening: end by echoing the first line or image so the Short replays')

    # ---- facts
    science = d.get('science') or d.get('facts') or []
    has_number = bool(re.search(r'\d', text)) or any(re.search(rf'\b{w}\b', low) for w in NUMWORDS)
    if science:
        for i, f_ in enumerate(science, 1):
            if isinstance(f_, dict) and not all(f_.get(k) for k in ('claim', 'source')):
                err(f'fact {i} needs a claim and a source')
        ok(f'{len(science)} fact(s) in the fact-check list')
    elif has_number:
        err('the script has a number or a claim but no `science` list (claim, working, source): every fact is checked and sourced before it is voiced')
    else:
        warn('no fact-check list; fine only if the script states no facts')

    # ---- a crude safety screen: flags to read
    screens = {
        'medical (V3 rule: no health topics, and brain/sleep/mind count)': r'\b(disease|surgery|surgeon|injur\w*|medicat\w*|medicine|symptom\w*|cancer|virus|infection|diet|nutrition|calorie\w*|blood|brain|sleep\w*|conscious\w*|mental|doctor|hospital|pain)\b',
        'violence or death': r'\b(kill\w*|murder\w*|gore|tortur\w*|execut\w*|suicid\w*|self-harm|abuse\w*|corpse|death|dies|died|dying)\b',
        'weapons, hacking, drugs': r'\b(bomb\w*|explosive\w*|gun|guns|rifle|hack\w*|counterfeit|cocaine|heroin|meth|weapon\w*)\b',
        'politics': r'\b(election\w*|president|prime minister|republican|democrat\w*|invasion|terror\w*)\b',
    }
    for name, rx in screens.items():
        hits = sorted({m.group(0).lower() for m in re.finditer(rx, low)})
        if hits:
            warn(f'safety screen, {name}: {", ".join(hits)}. Read the lines; this is a keyword screen, not a verdict')


# ---------------------------------------------------------------- the publishing kit
EMOJI = re.compile('[\U0001F300-\U0001FAFF\u2600-\u27BF\u2B50\u2B06\u2705\u274C\uFE0F]+')


def check_publish(d):
    titles = d.get('titles') or []
    if len(titles) != 3:
        err(f'{len(titles)} titles: give exactly 3, one marked recommended')
    if sum(1 for t in titles if t.get('recommended')) != 1:
        err('mark exactly one title "recommended": true')
    for t in titles:
        raw = t['text'].strip()
        m = EMOJI.search(raw)
        body = EMOJI.sub('', raw).strip()
        nw = len(body.split())
        em = len(re.findall(EMOJI, raw))
        if not 5 <= nw <= 11:
            err(f'title "{raw}": {nw} words (5 to 11)')
        if not m or not raw.endswith(m.group(0)) or EMOJI.search(raw[: m.start()]):
            err(f'title "{raw}": put one or two emojis at the end, and nowhere else')
        if len(raw) > 100:
            err(f'title "{raw}": {len(raw)} characters (YouTube allows 100)')
    desc = (d.get('description') or '').strip()
    lines = [l for l in desc.splitlines() if l.strip()]
    if len(lines) < 3:
        err('description: line 1 the title reworded, line 2 what the Short shows (no spoiler), last line #shorts and 2 hashtags')
    elif not lines[-1].lower().startswith('#shorts') and '#shorts' not in lines[-1].lower():
        err('description: the last line must hold #shorts')
    else:
        tags_in_last = re.findall(r'#\w+', lines[-1])
        (ok if len(tags_in_last) == 3 else err)(f'description: last line has {len(tags_in_last)} hashtags (#shorts plus 2 relevant)')
    tags = d.get('tags') or []
    if not 8 <= len(tags) <= 12:
        err(f'{len(tags)} tags (8 to 12)')
    phrase = (d.get('search_phrase') or '').strip().lower()
    if not phrase:
        warn('no search_phrase: the plain 3-6 word phrase a viewer would type (check its volume and competition in vidIQ first)')
    elif not tags or tags[0].strip().lower() != phrase:
        err('the first tag must be the exact search phrase')
    long_tail = [t for t in tags if 3 <= len(t.split()) <= 6]
    if len(long_tail) < 4:
        err(f'{len(long_tail)} long-tail tags of 3 to 6 words (need the search phrase plus 4 variations)')
    if sum(len(t) for t in tags) + max(0, len(tags) - 1) > 480:
        warn('the tags run close to YouTube\'s 500-character limit; trim the weakest')
    if len({t.lower() for t in tags}) != len(tags):
        warn('duplicate tags: no keyword stuffing')
    if not errors:
        ok('title, description and tags follow the format')


# ---------------------------------------------------------------- run
data = load()
if '--publish' in args:
    check_publish(data)
else:
    check_script(data)
print()
for m in oks:
    print(f'  ok   {m}')
for m in warns:
    print(f'  warn {m}')
for m in errors:
    print(f'  ERR  {m}')
print(f'\n{len(errors)} error(s), {len(warns)} warning(s)')
sys.exit(1 if errors else 0)
