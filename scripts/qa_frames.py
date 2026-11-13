"""QA pass over a rendered video: sample one still every <step> frames and score it.

python <skill>/scripts/qa_frames.py <video.mp4> [--step 45] [--keep]
Writes out/<name>-qa/*.png alongside the video and prints a table. Exits 1 if a frame fails a gate.
Gates (tuned for the painted 3D toon look):
  luma mean    [0.06, 0.88]   a crushed black or blown-white frame is broken, not moody
  luma std     [0.02, 0.45]   a flat frame has no painted shapes in it
  edge energy  [0.4, 40]      Sobel-gradient mean in 0..255 units: outlined art has edges, nothing has zero
  saturation   [0.05, 0.95]   washed out, or candy-unreal beyond the house palette (our orb art runs ~0.8–0.9 by design)
Use --keep to keep the sample PNGs (default keeps them too).
"""
import json, pathlib, subprocess, sys

import numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

src = pathlib.Path(sys.argv[1])
if not src.exists():
    raise SystemExit(f'no such file: {src}')
step = 45
for i, a in enumerate(sys.argv):
    if a == '--step':
        step = int(sys.argv[i + 1])
qa_dir = src.with_name(src.stem + '-qa')
qa_dir.mkdir(exist_ok=True)

pattern = str(qa_dir / 'f%05d.png')
subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-y', '-i', str(src), '-vf', f'select=not(mod(n\\,{step}))', '-fps_mode', 'vfr', pattern],
               check=True, capture_output=True)
frames = sorted(qa_dir.glob('f*.png'))
if not frames:
    raise SystemExit('ffmpeg produced no frames')

def stats(img):
    a = np.asarray(img.convert('RGB'), dtype=np.float32) / 255.0
    mx = a.max(axis=2)
    mn = a.min(axis=2)
    luma = a @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    sat = np.where(mx > 1e-4, (mx - mn) / np.maximum(mx, 1e-4), 0.0)
    gx = np.abs(np.diff(luma, axis=1)).mean()
    gy = np.abs(np.diff(luma, axis=0)).mean()
    return dict(luma=float(luma.mean()), std=float(luma.std()), sat=float(sat.mean()), edge=float((gx + gy) * 255.0))

rows, bad = [], []
for f in frames:
    s = stats(Image.open(f))
    ok = (0.06 <= s['luma'] <= 0.88 and 0.02 <= s['std'] <= 0.45 and 0.4 <= s['edge'] <= 40 and 0.05 <= s['sat'] <= 0.95)
    rows.append((f.name, s, ok))
    if not ok:
        bad.append((f.name, s))

for name, s, ok in rows:
    flag = 'ok ' if ok else 'FAIL'
    print(f'{flag} {name}  luma {s["luma"]:.3f}  std {s["std"]:.3f}  sat {s["sat"]:.3f}  edge {s["edge"]:.2f}')
print(f'{len(rows)} frames scored, {len(bad)} failed')
print('samples kept in', qa_dir)
if bad:
    raise SystemExit(1)
