import React from 'react';
import {
  Hero, poseAt, faceAt, kf, clamp, easeOut, camT, camAim, SHORTS, LOOKS, ShotProps,
  Study, Desk, Tabletop, LightVeil, Glow, Paper, PaperStack, Foreground,
  Schematic, SchLabel, CountUp, DrawOn, Arrow, SCH, Rooftop,
} from '../../engine';

// FOUR PATTERNS for authoring Shorts shots. This is a pattern sheet, not a finished episode: copy a pattern into
// src/episodes/<slug>/shots.tsx, rename it to your shot id (S1, S2...) and change what it draws.
//
// The rules of a vertical frame (see references/kit.md, "The vertical frame"):
//   - The world is still 1920 x 1080 and every set and prop is drawn in it. A Shorts frame is a window onto it:
//     607.5 units across and 1080 down at zoom 1, so at zoom s it shows 607.5 / s x 1080 / s. SHORTS.vb.x is 656.
//   - Keep faces and the key object inside SHORTS.safe (x 690-1190, y 73-844): the Shorts player covers the rest.
//   - The captions sit at 68% of the height (world y about 734 at zoom 1). Don't put a face or a number there.
//   - camAim(x, y, zoom, u, v) puts a world point at (u, v) of the frame: the face at v 0.38 is the default pose.
//   - A "wide" shot can't show a wide room. Reveal a place with a pan (move the camera x over the shot) or a tilt.
//   - Every shot is a pure function of its own clock t: no state, no Math.random.

const PIP = LOOKS.pipHood;

// ---------- Pattern 1: a character medium. The face sits at 38% from the top; the camera pushes in ----------
// Pip stands behind the desk in the Study (hips at 960, 712, scale 1: the proof clip's mark).
export const PatternMedium: React.FC<ShotProps> = ({ t, len }) => {
  const pose = poseAt(t, [
    { f: 0, p: { x: 960, y: 712, yaw: 0.35, look: 0.5, armR: { a: 20, b: -6 } } },
    { f: 7, p: { armR: { a: 80, b: -4 } }, ease: easeOut }, // lift the sheet
    { f: 11, p: { armR: { a: 72, b: -4 } } }, // settle
  ]);
  const face = faceAt(t, [[0, 'neutral'], [9, 'smug']]);
  const headY = 712 - 190; // about where the head is for a scale-1 Pip
  return (
    <g transform={camAim(960, headY, kf(t, [[0, 1.8], [len, 2.0]]), 0.5, 0.38)}>
      <Study t={t + 80} id="pm" />
      <Hero look={PIP} pose={{ ...pose, ...face }} rimId="rimR" shadow={0} />
      <Desk x0={520} x1={1300} y={700} />
      {/* a dark, soft shape near the lens gives depth: placed at the right edge of the window (656 to 1264) */}
      <Foreground blur={10}>
        <path d="M 1130 1000 Q 1170 780 1280 720 Q 1240 840 1260 1000 Z" fill="#0E1610" />
      </Foreground>
    </g>
  );
};

// ---------- Pattern 2: a top-down macro insert. A tall frame suits a vertical thing (a stack, a tower, a fall) ----------
export const PatternMacro: React.FC<ShotProps> = ({ t, len }) => {
  const layers = Math.round(kf(t, [[0, 1], [10, 2], [20, 4], [30, 8]], easeOut)); // each fold doubles the stack
  return (
    <g transform={camAim(960, 560, kf(t, [[0, 1.5], [len, 1.8]]), 0.5, 0.42)}>
      <Tabletop edge={1100} />
      <LightVeil id="pmv" lights={[[960, 520, 520]]} o={0.5} />
      <Glow x={960} y={500} r={420} o={0.3} />
      <Paper x={880} y={470} w={220} done={false} />
      <PaperStack x={960} y={640} n={Math.min(layers, 8)} w={220} />
    </g>
  );
};

// ---------- Pattern 3: a schematic built for the column. Everything is stacked, nothing sits side by side ----------
// The column is SHORTS.vb.w wide (607). Numbers must fit it: 17 characters at size 52 is about 540 units.
export const PatternSchematic: React.FC<ShotProps> = ({ t }) => {
  const cx = SHORTS.cx;
  return (
    <g>
      <Schematic t={t} id="psch" />
      <SchLabel x={cx} y={250} t={t - 2} text="LAYERS" size={44} color={SCH.dim} />
      <CountUp x={cx} y={340} t={t - 6} to={4398046511104} dur={36} size={52} />
      <DrawOn d={`M ${cx - 140} 420 L ${cx} 480 L ${cx + 140} 420`} t={t - 14} dur={8} />
      <SchLabel x={cx} y={560} t={t - 18} text="OVER 400,000 KM" size={46} />
      <Arrow x0={cx} y0={600} x1={cx} y1={690} t={t - 22} />
      <SchLabel x={cx} y={760} t={t - 28} text="THE MOON IS CLOSER" size={34} color={SCH.live} />
    </g>
  );
};

// ---------- Pattern 4: a tall rise. The camera tilts up with the thing; the portrait frame is made for it ----------
export const PatternTallRise: React.FC<ShotProps> = ({ t, len }) => {
  const p = clamp(t / len);
  const top = 760 - 560 * easeOut(p); // the tip of the tower climbs
  return (
    <g transform={camT(960, kf(t, [[0, 760], [len, 330]]), 1.3)}>
      <Rooftop t={t + 200} sunX={960} sunY={420} low={160} />
      <rect x={946} y={top} width={28} height={820 - top} fill="#F6EFE3" stroke="#1A1230" strokeWidth={6} />
    </g>
  );
};
