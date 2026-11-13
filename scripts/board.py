"""Step 4: the storyboard sheet. Lays the board stills out as one captioned contact sheet: shot number and size, start
time, the words over it, and the note. This is what gets reviewed (by you, then by the person) before any animation.

python <skill>/scripts/board.py <slug> [--cols 3] [--guides]
Reads  out/<slug>/board/<shot>.png (from stills.mjs) and src/episodes/<slug>/timeline.json
Writes out/<slug>/storyboard.jpg  (--guides reads board-guides/ and writes storyboard-guides.jpg)
Landscape stills get 960 x 540 tiles, 3 across; vertical (Shorts) stills get 360 x 640 tiles, 6 across, so a whole
Short fits one sheet at about phone-in-the-hand size.
"""
import json, pathlib, sys

from PIL import Image, ImageDraw, ImageFont

from wi import STUDIO, ep_dir, out_dir

slug = sys.argv[1]
guides = '--guides' in sys.argv
src = out_dir(slug) / ('board-guides' if guides else 'board')
stills = sorted(src.glob('*.png')) if src.exists() else []
portrait = bool(stills) and (lambda size: size[1] > size[0])(Image.open(stills[0]).size)  # a vertical (Shorts) board
cols = int(sys.argv[sys.argv.index('--cols') + 1]) if '--cols' in sys.argv else (6 if portrait else 3)
tl = json.loads((ep_dir(slug) / 'timeline.json').read_text(encoding='utf-8'))
ep = json.loads((ep_dir(slug) / 'episode.json').read_text(encoding='utf-8'))


def font(size, bold=True):
    """The first face that exists: your own (fonts/ in the studio), then common system faces, then Pillow's default."""
    cands = [STUDIO / 'public' / 'fonts' / 'board.ttf', STUDIO / 'public' / 'fonts' / 'board.otf']
    cands += [pathlib.Path(p) for p in ['C:/Windows/Fonts/segoeuib.ttf' if bold else 'C:/Windows/Fonts/segoeui.ttf', 'C:/Windows/Fonts/arialbd.ttf',
                                         '/System/Library/Fonts/Supplemental/Arial Bold.ttf', '/System/Library/Fonts/Helvetica.ttc',
                                         '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf']]
    for c in cands:
        if c.exists():
            return ImageFont.truetype(str(c), size)
    return ImageFont.load_default(size)


if portrait:
    head, body, note = font(26), font(21), font(17, False)
    W, H, CAP, PAD = 360, 640, 215, 20
else:
    head, body, note = font(34), font(28), font(23, False)
    W, H, CAP, PAD = 960, 540, 160, 24
n = len(tl['shots'])
rows = (n + cols - 1) // cols
sheet = Image.new('RGB', (cols * W + (cols + 1) * PAD, rows * (H + CAP + PAD) + PAD + 90), (20, 17, 26))
d = ImageDraw.Draw(sheet)
title = ' '.join(ep['title']) if isinstance(ep.get('title'), list) else ep.get('topic', slug)
d.text((PAD, 26), f'{title}  ·  storyboard, one key frame per shot  ·  {tl["total"] / tl["fps"]:.1f} s', font=head, fill=(246, 239, 227))


def fit(text, f, width, maxlines=2):
    """Wrap text into at most `maxlines` lines that fit the caption."""
    words, lines, cur = text.split(), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if d.textlength(t, font=f) <= width:
            cur = t
        else:
            lines.append(cur)
            cur = w
    lines.append(cur)
    if len(lines) > maxlines:
        lines = lines[:maxlines]
        lines[-1] = lines[-1][: max(0, len(lines[-1]) - 2)] + '…'
    return lines


for i, s in enumerate(tl['shots']):
    x = PAD + (i % cols) * (W + PAD)
    y = 90 + PAD + (i // cols) * (H + CAP + PAD)
    p = src / f'{s["id"]}.png'
    if p.exists():
        sheet.paste(Image.open(p).convert('RGB').resize((W, H)), (x, y))
    else:
        d.rectangle([x, y, x + W, y + H], fill=(60, 30, 40))
        d.text((x + 20, y + 20), f'missing {p.name}', font=body, fill=(255, 120, 120))
    d.rectangle([x, y + H, x + W, y + H + CAP], fill=(32, 27, 40))
    at = f'{s["first"] / tl["fps"]:.1f} s'
    at_w = d.textlength(at, font=note)
    if portrait:  # narrow tile: the id and time on one line, the shot size (never cut) on the next
        d.text((x + 18, y + H + 10), f'{s["id"]}', font=head, fill=(255, 177, 90))
        d.text((x + W - 18 - at_w, y + H + 16), at, font=note, fill=(170, 160, 185))
        d.text((x + 18, y + H + 42), fit(s['size'].upper(), note, W - 36, 1)[0], font=note, fill=(255, 177, 90))
        text_y = y + H + 68
    else:
        d.text((x + 18, y + H + 12), f'{i + 1}  {s["id"]}  {s["size"].upper()}', font=head, fill=(255, 177, 90))
        d.text((x + W - 18 - at_w, y + H + 20), at, font=note, fill=(170, 160, 185))
        text_y = y + H + 58
    line = f'"{s["line"]}"' if s.get('line') else '(no words)'
    yy = text_y
    for ln in fit(line, body, W - 36, 3 if portrait else 2):
        d.text((x + 18, yy), ln, font=body, fill=(246, 239, 227))
        yy += 27 if portrait else 34
    if s.get('note'):
        for ln in fit(s['note'], note, W - 36, 3 if portrait else 1):
            d.text((x + 18, yy + 2), ln, font=note, fill=(170, 160, 185))
            yy += 22
out = out_dir(slug) / ('storyboard-guides.jpg' if guides else 'storyboard.jpg')
sheet.save(out, quality=88)
print(out, sheet.size)
