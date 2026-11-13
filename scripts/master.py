"""Step 8: the master. Renders the episode, then brings the mix to -14 LUFS with true peaks under -1 dBTP (two-pass
loudnorm, video copied untouched), measures the result and writes the report. For a vertical episode it also checks
the Shorts spec: 1080 x 1920, the preset's length cap, loudness on target. Pass --remix after a chunked concat to
rebuild the mix from the three stems and avoid AAC priming drift.

python <skill>/scripts/master.py <slug> [--skip-render] [--remix] [--concurrency 6]
Writes out/<slug>/<slug>-raw.mp4, out/<slug>/<slug>-final.mp4 and out/<slug>/report.json
"""
import json, re, subprocess, sys, time

from wi import STUDIO, ep_dir, load_episode, load_json, loudness, out_dir, save_json

slug = sys.argv[1]
args = sys.argv[2:]
conc = args[args.index('--concurrency') + 1] if '--concurrency' in args else None
remix = '--remix' in args
ep = load_episode(slug)
preset = (ep.get('short') or {}).get('preset')
MAX_S = {'snap': 35, 'twist': 57, 'choice': 59, 'choice-long': 150}.get(preset, 59)
od = out_dir(slug)
raw = od / f'{slug}-raw.mp4'
final = od / f'{slug}-final.mp4'
npx = 'npx.cmd' if sys.platform == 'win32' else 'npx'

if '--skip-render' not in args:
    t0 = time.time()
    conc = conc or '1'
    cmd = [npx, 'remotion', 'render', 'src/index.ts', ep['id'], str(raw), '--log', 'error', '--gl=angle', '--concurrency', conc]
    print(' '.join(cmd))
    subprocess.run(cmd, cwd=STUDIO, check=True)
    print(f'rendered in {time.time() - t0:.0f} s')

tl = load_json(ep_dir(slug) / 'timeline.json')
audio_src = raw
if remix:
    A = tl.get('audio') or {}
    need = [A.get('voice'), A.get('sfx'), A.get('music')]
    if not all(need):
        sys.exit('--remix: timeline.audio needs voice, sfx and music')
    pub = STUDIO / 'public'
    mix = od / f'{slug}-mix.wav'
    vv, sv, mv = A.get('voiceVol', 1), A.get('sfxVol', 1), A.get('musicVol', 1)
    af = (f'[0:a]volume={vv}[v];[1:a]volume={sv}[s];[2:a]volume={mv}[m];'
          f'[v][s][m]amix=inputs=3:duration=longest:normalize=0[a]')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(pub / need[0]), '-i', str(pub / need[1]),
                    '-i', str(pub / need[2]), '-filter_complex', af, '-map', '[a]', '-ar', '48000',
                    '-ac', '2', '-c:a', 'pcm_s16le', str(mix)], check=True)
    audio_src = mix
    print(f'remixed audio from stems: {mix.name}')

I, TP, LRA = -14.0, -1.5, 11
first = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(audio_src), '-af', f'loudnorm=I={I}:TP={TP}:LRA={LRA}:print_format=json', '-f', 'null', '-'],
                       capture_output=True, text=True, encoding='utf-8', errors='ignore').stderr
m = json.loads(first[first.rfind('{'):first.rfind('}') + 1])
filt = (f"loudnorm=I={I}:TP={TP}:LRA={LRA}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
        f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
if remix:
    cmd = ['ffmpeg', '-y', '-v', 'error', '-i', str(raw), '-i', str(mix), '-map', '0:v', '-map', '1:a',
           '-c:v', 'copy', '-af', filt, '-ar', '48000', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', str(final)]
else:
    cmd = ['ffmpeg', '-y', '-v', 'error', '-i', str(raw), '-c:v', 'copy', '-af', filt, '-ar', '48000',
           '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', str(final)]
subprocess.run(cmd, check=True)
lufs, peak = loudness(final)
tp = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(final), '-af', f'loudnorm=I={I}:TP={TP}:print_format=json', '-f', 'null', '-'],
                    capture_output=True, text=True, encoding='utf-8', errors='ignore').stderr
true_peak = float(json.loads(tp[tp.rfind('{'):tp.rfind('}') + 1])['input_tp'])
dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(final)], capture_output=True, text=True).stdout.strip())
size = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', str(final)], capture_output=True, text=True).stdout.strip()
parts = [p for p in size.split(',') if p]
width, height = (int(parts[0]), int(parts[1])) if len(parts) >= 2 and all(p.isdigit() for p in parts[:2]) else (0, 0)
costs = load_json(od / 'costs.json', [])
report = {
    'episode': ep['id'], 'file': str(final), 'width': width, 'height': height, 'seconds': round(dur, 2), 'lufs': lufs, 'true_peak_dbtp': true_peak,
    'preset': preset, 'max_seconds': MAX_S,
    'segments': len(tl['segments']), 'cuts_per_min': round((len(tl['segments']) - 1) / (tl['total'] / tl['fps']) * 60, 1),
    'elevenlabs_credits': sum(c['credits'] for c in costs), 'cost_lines': costs,
}
save_json(od / 'report.json', report)
print(json.dumps({k: v for k, v in report.items() if k != 'cost_lines'}, indent=1))
ok = abs(lufs + 14) <= 0.5 and true_peak <= -1.0
print('loudness OK' if ok else '! loudness off target: check the report')
if height > width:  # a vertical episode: the Shorts spec
    problems = []
    if (width, height) != (1080, 1920):
        problems.append(f'size is {width} x {height}, a Short is 1080 x 1920')
    if dur > MAX_S:
        problems.append(f'{dur:.1f} s is over the {MAX_S} s {preset} cap')
    if not ok:
        problems.append('loudness is off target')
    report['shorts_ok'] = not problems
    report['shorts_problems'] = problems
    save_json(od / 'report.json', report)
    print('Shorts spec OK: 1080 x 1920, ' + f'{dur:.1f} s' if not problems else '! Shorts spec: ' + '; '.join(problems))
