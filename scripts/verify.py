"""Post-master verification of a rendered episode: the file, the Shorts spec, the mix.

python <skill>/scripts/verify.py <slug>
Reads  out/<slug>/<slug>-final.mp4 and out/<slug>/report.json (written by master.py). Exits 1 if anything is off.
"""
import json, pathlib, subprocess, sys

sys.stdout.reconfigure(encoding='utf-8')
STUDIO = pathlib.Path.cwd()
if not (STUDIO / 'src' / 'episodes').exists():
    raise SystemExit('Run this from the studio folder (the one with src/episodes and package.json).')
sys.path.insert(0, str(STUDIO.parent / 'scripts'))
from wi import loudness, out_dir  # noqa: E402

slug = sys.argv[1]
od = out_dir(slug)
final = od / f'{slug}-final.mp4'
problems = []
if not final.exists():
    raise SystemExit(f'no master yet: {final} (run master.py first, or render with --skip-render off)')

size = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', str(final)],
                      capture_output=True, text=True).stdout.strip()
size_parts = [p for p in size.split(',') if p]
w, h = (int(size_parts[0]), int(size_parts[1])) if len(size_parts) >= 2 and all(p.isdigit() for p in size_parts[:2]) else (0, 0)
dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(final)],
                            capture_output=True, text=True).stdout.strip())
if (w, h) != (1080, 1920):
    problems.append(f'size is {w} x {h}, a Short is 1080 x 1920')

report_p = od / 'report.json'
report = {}
if report_p.exists():
    try:
        report = json.loads(report_p.read_text())
    except Exception:
        report = {}
max_s = report.get('max_seconds') or 59
if dur > max_s:
    problems.append(f'{dur:.1f} s is over the {max_s} s {report.get("preset") or "Shorts"} cap')

lufs, peak = loudness(final)
if not (-15.5 <= lufs <= -12.5):
    problems.append(f'loudness {lufs:.1f} LUFS, target -14')

tp = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(final), '-af', 'loudnorm=I=-14:TP=-1:print_format=json', '-f', 'null', '-'],
                    capture_output=True, text=True, encoding='utf-8', errors='ignore').stderr
true_peak = float(json.loads(tp[tp.rfind('{'):tp.rfind('}') + 1])['input_tp'])
if true_peak > -1.0:
    problems.append(f'true peak {true_peak:.1f} dBTP over -1.0')

if report:
    if report.get('shorts_ok') is False:
        problems.append('master report says the Shorts spec failed: ' + '; '.join(report.get('shorts_problems', [])))
else:
    problems.append('out/' + slug + '/report.json missing — the master did not finish')

out = {'file': str(final), 'width': w, 'height': h, 'seconds': round(dur, 2), 'lufs': lufs,
       'true_peak_dbtp': true_peak, 'preset': report.get('preset'), 'max_seconds': max_s, 'ok': not problems}
print(json.dumps(out, indent=1))
if problems:
    for p in problems:
        print('!', p)
    sys.exit(1)
print('verify OK')
