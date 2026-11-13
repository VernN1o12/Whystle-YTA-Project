"""Step 0b: scaffold a new data-driven episode.

python <skill>/scripts/new_episode.py <slug> <compId> [--title "TITLE"]
Creates  src/episodes/<slug>/episode.json   (script/voice/edit/sound skeleton, one shot)
         src/episodes/<slug>/shots.json     (the same one shot, camera + cast filled in)
         src/episodes/<slug>/index.tsx      (the standard glue: ToonShort + captions + audio)
         src/episodes/<slug>/timeline.json  (a compile-clean placeholder; voice.py + plan.py replace it)
and prints the lines to add to src/episodes/index.ts, or applies them with --register.

Then:
  1. write the script in episode.json (beats, words, shots, edit, fx, sound)
  2. npm run typecheck
  3. python ../scripts/voice.py <slug>   (check the pace)  and  ../scripts/plan.py <slug>
  4. python ../scripts/sfx.py <slug>     (0 credits if everything is cached)
  5. npx remotion still src/index.ts <compId> out/<slug>/test/f0000.png --frame=0 --gl=angle
  6. master/verify as usual (see references/render-qa-publish.md)
"""
import json, pathlib, re, sys

STUDIO = pathlib.Path.cwd()
if not (STUDIO / 'src' / 'episodes').exists():
    raise SystemExit('Run this from the studio folder (the one with src/episodes and package.json).')

slug = sys.argv[1]
comp_id = sys.argv[2]
title = 'NEW EPISODE'
for i, a in enumerate(sys.argv):
    if a == '--title':
        title = sys.argv[i + 1]
register = '--register' in sys.argv
if not re.fullmatch(r'[a-z0-9-]{2,40}', slug):
    raise SystemExit('slug must be lowercase letters/digits/dashes')
if not re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]*', comp_id):
    raise SystemExit('compId must be a valid identifier (letters/digits/underscore, not starting with a digit)')

ep_dir = STUDIO / 'src' / 'episodes' / slug
if ep_dir.exists():
    raise SystemExit(f'already exists: {ep_dir}')
ep_dir.mkdir(parents=True)

print('creating', ep_dir)

# ------------------------------------------------------------------ episode.json
episode = {
    'id': comp_id,
    'slug': slug,
    'topic': title,
    'format': 'shorts',
    'fps': 30,
    'lead': 2,
    'tail': 0.5,
    'voice': {'engine': 'kokoro', 'id': 'am_liam', 'speed': 0.9},
    'short': {'preset': 'snap', 'pattern': 'twist', 'route': 'code', 'title': title, 'search_phrase': '',
              'wardrobe': '', 'hook': '', 'loop': ''},
    'title': title.split(),
    'captions': {'on': True, 'maxWords': 2, 'accent': [], 'size': 104, 'y': 0.7},
    'script': [
        {'beat': '1 HOOK', 'text': 'Write the hook: the impossible claim, stated as fact.'},
        {'beat': '2 SETUP', 'text': 'Name the condition and how common it is.'},
        {'beat': '3 PAYOFF', 'text': 'The twist lands here, and the last line loops back to the first.'},
    ],
    'science': [],
    'cast': ['wren'],
    'shots': [
        {'id': 'S1', 'size': 'medium', 'set': 'studio', 'key': 30, 'note': 'the hero delivers the hook'},
    ],
    'edit': [{'shot': 'S1', 'at': 'f:0'}],
    'fx': [],
    'sound': {
        'clips': {'flash': ['bright camera flash pop', 0.5], 'music': ['ambient synth pad, slow evolving chords, mysterious and calm, warm and curious', 30]},
        'events': [['f:0', 'flash', 0.5]],
        'repeats': [],
        'music': {'clip': 'music'},
        'levels': {'sfx_lu': -5.0, 'music_lu': -10.5},
    },
}
(ep_dir / 'episode.json').write_text(json.dumps(episode, indent=2, ensure_ascii=False), encoding='utf-8')

# ------------------------------------------------------------------ shots.json
shots = {
    '_note': 'Visual data only; timeline.json (plan.py) supplies the edit. Camera key t is the shot clock in seconds.',
    'shots': {
        'S1': {
            'set': 'studio',
            'light': 'studio',
            'dur': 5.0,
            'cam': [
                {'t': 0, 'pos': [1.92, 1.56, 4.4], 'look': [0, 1.0, 0], 'fov': 32},
                {'t': 5.0, 'pos': [1.74, 1.53, 4.16], 'look': [0, 1.02, 0], 'fov': 31},
            ],
            'actors': [
                {'name': 'wren', 'cast': 'wren', 'x': 0, 'y': 0, 'z': 0, 'expr': 'smile', 'facing': 0,
                 'wave': 1, 'fork': False, "headTilt": 0,
                 'keys': [{'t': 0, 'expr': 'smile', 'wave': 1}, {'t': 2.4, 'expr': 'grin', 'wave': 1.05}, {'t': 5.0, 'expr': 'smile', 'wave': 1}]},
            ],
            'fx': [],
            'dof': {'track': 'wren', 'cInf': 13},
        },
    },
}
(ep_dir / 'shots.json').write_text(json.dumps(shots, indent=2), encoding='utf-8')

# ------------------------------------------------------------------ placeholder timeline.json
timeline = {
    'slug': slug,
    'title': title,
    'format': 'shorts',
    'fps': 30,
    'total': 150,
    'shots': [{'id': 'S1', 'size': 'medium', 'key': 30, 'len': 150, 'first': 0, 'line': '', 'note': ''}],
    'segments': [{'shot': 'S1', 'a': 0, 'b': 150, 't0': 0, 't1': 150, 'line': ''}],
    'captions': [],
    'captionStyle': {'size': 104, 'y': 0.7, 'accent': []},
    'audio': {},
}
(ep_dir / 'timeline.json').write_text(json.dumps(timeline, indent=2), encoding='utf-8')

# ------------------------------------------------------------------ index.tsx
index = f'''import React from "react";
import {{ AbsoluteFill, Audio, staticFile, useCurrentFrame }} from "remotion";
import {{ FrameProvider }} from "../../engine/frame";
import {{ Captions }} from "../../engine/captions";
import {{ ToonShort, ToonStage }} from "../../engine/toon";
import type {{ SceneSpec, Segment, ShotSpec }} from "../../engine/toon";
import timeline from "./timeline.json";
import visual from "./shots.json";

// {slug} — data-only episode (see shorts-studio/docs/TOON_WORKFLOW.md). This file is glue only:
// timeline.json (voice + edit) and shots.json (set/light/camera/cast) in, the rendered film out.

export const TOTAL = timeline.total;

const SCENE: SceneSpec = (() => {{
  const v = visual.shots as unknown as Record<string, any>;
  const shots: ShotSpec[] = timeline.shots.map((s) => {{
    const d = v[s.id];
    if (!d) throw new Error(`{slug}: no visual data for shot ${{s.id}} in shots.json`);
    return {{
      id: s.id,
      set: d.set,
      light: d.light,
      dur: d.dur,
      cam: d.cam,
      actors: d.actors,
      fx: d.fx,
      dof: d.dof,
      phase: d.phase,
    }} as ShotSpec;
  }});
  return {{
    slug: timeline.slug,
    fps: timeline.fps,
    width: 1080,
    height: 1920,
    shots,
    segments: timeline.segments as unknown as Segment[],
  }};
}})();

const AudioTrack: React.FC = () => {{
  const A = (timeline as any).audio;
  if (!A) return null;
  return (
    <>
      {{A.voice ? <Audio src={{staticFile(A.voice)}} volume={{A.voiceVol ?? 1}} /> : null}}
      {{A.sfx ? <Audio src={{staticFile(A.sfx)}} volume={{A.sfxVol ?? 1}} /> : null}}
      {{A.music ? <Audio src={{staticFile(A.music)}} volume={{A.musicVol ?? 1}} /> : null}}
    </>
  );
}};

const Main: React.FC = () => {{
  const f = useCurrentFrame();
  return (
    <FrameProvider format="shorts">
      <AbsoluteFill style={{{{ background: "#0d0d12" }}}}>
        <ToonShort scene={{SCENE}} />
        {{timeline.captions?.length ? <Captions f={{f}} chunks={{timeline.captions}} style={{timeline.captionStyle as never}} /> : null}}
        <AudioTrack />
      </AbsoluteFill>
    </FrameProvider>
  );
}};

const Board: React.FC = () => {{
  const f = useCurrentFrame();
  const shot = SCENE.shots[Math.min(Math.max(0, f), SCENE.shots.length - 1)];
  const t = shot.cam[0]?.t ?? 0;
  return (
    <AbsoluteFill style={{{{ background: "#0d0d12" }}}}>
      <ToonStage scene={{SCENE}} shot={{shot}} t={{t}} />
    </AbsoluteFill>
  );
}};

export const {comp_id} = Main;
export const {comp_id}Board = Board;
'''
(ep_dir / 'index.tsx').write_text(index, encoding='utf-8')

# ------------------------------------------------------------------ print / register
scream = re.sub(r'([a-z0-9])([A-Z])', r'\1_\2', comp_id).upper().replace('-', '_')
import_line = f"import {{ {comp_id}, {comp_id}Board, TOTAL as {scream}_TOTAL }} from './{slug}';\n"
entry = f"""
export const {comp_id}Episode = {{
  id: '{comp_id}',
  format: 'shorts' as const,
  total: {scream}_TOTAL,
  shotCount: 1,
  Main: {comp_id},
  Board: {comp_id}Board,
}};
"""
idx_path = STUDIO / 'src' / 'episodes' / 'index.ts'
if register:
    src = idx_path.read_text(encoding='utf-8')
    if f"'./{slug}'" in src:
        raise SystemExit('index.ts already imports this slug')
    src = src.replace("export const EPISODES = [", entry + "\nexport const EPISODES = [", 1)
    # append the new episode to the EPISODES array and the import after the last toon import
    anchor = "import { colorSounds, colorSoundsBoard, TOTAL as CS_TOTAL } from './color-sounds';\n"
    if anchor in src:
        src = src.replace(anchor, anchor + import_line, 1)
    else:
        last_import = src.rfind('\nimport ')
        src = src[:last_import + 1] + import_line + src[last_import + 1:]
    src = re.sub(r"export const EPISODES = \[([^\]]*)\];", lambda m: f"export const EPISODES = [{m.group(1)}, {comp_id}Episode];", src)
    idx_path.write_text(src, encoding='utf-8')
    print(f'registered {comp_id} in src/episodes/index.ts')
else:
    print('\nTo register, add to src/episodes/index.ts:')
    print('  ' + import_line.rstrip())
    print(entry)
    print('  and add "' + comp_id + 'Episode" to the EPISODES array (or rerun with --register).')
print('\nNext: write the script in episode.json, then npm run typecheck && python ../scripts/voice.py', slug)
