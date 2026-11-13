import React from 'react';
import { rnd } from '../anim';
import { Sun, Rays, Bokeh } from '../kit';
import { Glow, LightVeil, Dust } from '../light';

// The noon field: the standing ground for the sun-off episode. A bright cartoon meadow at high noon — deep blue sky,
// the sun high with turning rays, a picket fence, daisies and two butterflies, so the one-second dark blink reads hard.
// Variants:
//   <Field t id />        noon meadow, the sun high and hot
//   sun (0..1)            dims the sun and its glow (the moment the switch is thrown, seen from the ground)
//   dim (0..1)            the dark blink: a navy wash over the whole frame, deeper for more
// A scale-1 character stands with feet at FIELD_GROUND (hips = FIELD_GROUND - 140 * scale).

export const FIELD_HORIZON = 700;
export const FIELD_GROUND = 838;

const GRASS = (seed: number, n: number, y0: number, y1: number) =>
  Array.from({ length: n }).map((_, i) => {
    const y = y0 + rnd(seed, i) * (y1 - y0);
    const x = -420 + rnd(seed + 40, i) * 2760;
    const h = 12 + ((y - y0) / (y1 - y0)) * 30;
    return { x, y, h, k: rnd(seed + 80, i) };
  });

const SUN_POS = { x: 1190, y: 150 };

const Daisy: React.FC<{ x: number; y: number; s?: number; rot?: number }> = ({ x, y, s = 1, rot = 0 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <ellipse cx={3} cy={8} rx={15} ry={4.5} fill="#000" opacity={0.14} />
    <path d="M 0 -2 L 1 9" stroke="#3F7534" strokeWidth={3} strokeLinecap="round" />
    <g transform="translate(0 -12)">
      {[0, 60, 120, 180, 240, 300].map((d) => (
        <ellipse key={d} cy={-9} rx={4.6} ry={9.5} fill="#FFFFFF" stroke="#D9D4C2" strokeWidth={1.6} transform={`rotate(${d})`} />
      ))}
      <circle r={5.4} fill="#FFD23E" stroke="#C9862E" strokeWidth={2} />
    </g>
  </g>
);

export const Field: React.FC<{ t: number; id?: string; dim?: number; sun?: number }> = ({ t, id = 'field', dim = 0, sun = 1 }) => {
  const sv = Math.min(1, Math.max(0, sun));
  return (
    <g>
      <defs>
        <linearGradient id={`${id}sky`} x1="0" y1={-420} x2="0" y2={FIELD_HORIZON + 40} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2E6FD6" />
          <stop offset="55%" stopColor="#5E9DEF" />
          <stop offset="100%" stopColor="#CFE9FF" />
        </linearGradient>
      </defs>
      <rect x={-420} y={-420} width={2760} height={FIELD_HORIZON + 420} fill={`url(#${id}sky)`} />
      {/* the sun, high and small-yellow, its rays turning; the whole disc gutters when the switch is thrown */}
      <g opacity={0.2 + 0.8 * sv}>
        <Rays x={SUN_POS.x} y={SUN_POS.y} t={t} len={520} o={0.42 * sv} color="#FFE9A8" />
        <Sun x={SUN_POS.x} y={SUN_POS.y} r={148} t={t} />
        <Glow x={SUN_POS.x} y={SUN_POS.y} r={620 + 160 * sv} kind="warm" o={0.5 * sv} />
      </g>
      {/* fat white noon clouds, drifting */}
      {[
        [340, 260, 1],
        [1120, 190, 0.82],
        [1600, 340, 0.62],
      ].map(([cx, cy, sc], i) => (
        <g key={`c${i}`} transform={`translate(${((t * (0.24 + i * 0.05)) % 90) - 45} 0)`} opacity={0.92}>
          <ellipse cx={cx} cy={cy} rx={150 * sc} ry={42 * sc} fill="#FFFFFF" />
          <ellipse cx={cx - 88 * sc} cy={cy + 16 * sc} rx={88 * sc} ry={28 * sc} fill="#F4FAFF" />
          <ellipse cx={cx + 98 * sc} cy={cy + 12 * sc} rx={80 * sc} ry={24 * sc} fill="#F4FAFF" />
          <ellipse cx={cx} cy={cy + 24 * sc} rx={168 * sc} ry={20 * sc} fill="#FFFFFF" />
        </g>
      ))}
      {/* three birds, high, flattening the sky */}
      {[0, 1, 2].map((i) => {
        const bx = ((260 + t * (0.9 + i * 0.13) + i * 470) % 2300) - 200;
        const by = 230 + i * 42 + Math.sin(t / 17 + i) * 9;
        const fl = Math.sin(t / 2.7 + i * 1.2) * 6;
        return <path key={`b${i}`} d={`M ${bx - 12} ${by + fl * 0.4} Q ${bx - 5} ${by - 6 + fl} ${bx} ${by} Q ${bx + 5} ${by - 6 + fl} ${bx + 12} ${by + fl * 0.4}`} stroke="#274067" strokeWidth={3.4} fill="none" strokeLinecap="round" opacity={0.8} />;
      })}
      {/* the meadow: bright green bands, softer hills on the far edge */}
      <ellipse cx={380} cy={FIELD_HORIZON + 6} rx={520} ry={54} fill="#7CB866" />
      <ellipse cx={1660} cy={FIELD_HORIZON + 8} rx={620} ry={62} fill="#74B05E" />
      <rect x={-420} y={FIELD_HORIZON} width={2760} height={760} fill="#5EA94C" />
      <rect x={-420} y={FIELD_HORIZON} width={2760} height={90} fill="#6FBF58" opacity={0.85} />
      <rect x={-420} y={FIELD_GROUND - 60} width={2760} height={420} fill="#6CBC58" />
      {/* the picket fence along the far side, off-white so the noon light reads on it */}
      <g>
        <path d="M 180 742 L 1804 742 M 180 764 L 1804 764" stroke="#2C2A38" strokeWidth={5.5} />
        {[240, 480, 720, 1060, 1300, 1540].map((x, i) => (
          <g key={`f${i}`}>
            <path d={`M ${x - 10} 792 L ${x - 10} 730 L ${x} 722 L ${x + 10} 730 L ${x + 10} 792 Z`} fill="#EFE7D2" stroke="#4A4438" strokeWidth={4} strokeLinejoin="round" />
          </g>
        ))}
        <path d="M 180 742 L 1804 742 M 180 764 L 1804 764" stroke="#EFE7D2" strokeWidth={2} opacity={0.5} />
      </g>
      {/* grass tufts, swaying very slightly */}
      {GRASS(1, 70, FIELD_HORIZON + 6, 1050).map((g, i) => (
        <path
          key={`g${i}`}
          d={`M ${g.x} ${g.y} l -3.6 -${g.h.toFixed(1)} l 3.8 -1 l 3.4 ${g.h.toFixed(1)} Z`}
          fill={g.k > 0.62 ? '#8ED46E' : '#4F8F3C'}
          opacity={0.5 + g.k * 0.45}
          transform={`rotate(${Math.sin((t + i * 20) / 3.4) * 2.4} ${g.x} ${g.y})`}
        />
      ))}
      {/* daisies scattered through the near grass */}
      {[
        [820, 880, 1],
        [1140, 930, 1.15],
        [1430, 900, 0.9],
        [640, 960, 0.8],
        [1780, 964, 1.05],
        [990, 1010, 1.2],
        [1310, 1014, 0.85],
        [540, 1030, 1],
        [1700, 1040, 0.9],
      ].map(([px, py, ps], i) => (
        <Daisy key={`d${i}`} x={px} y={py} s={ps} rot={((i * 47) % 24) - 12} />
      ))}
      {/* two butterflies, always moving (the first frame of the Short already moves) */}
      {[0, 1].map((i) => {
        const bx = 880 + i * 250 + Math.sin(t / 46 + i * 2.4) * 150;
        const by = 560 + i * 80 + Math.cos(t / 33 + i * 1.9) * 55;
        const fl = Math.sin(t / 1.4 + i * 2);
        return (
          <g key={`bf${i}`} transform={`translate(${bx.toFixed(1)} ${by.toFixed(1)}) rotate(${(Math.sin(t / 50 + i) * 26).toFixed(1)})`}>
            <ellipse cx={-5} cy={0} rx={9} ry={4.5 + 4 * fl} fill="#FFFFFF" stroke="#2C2A38" strokeWidth={2.2} transform={`rotate(${-16 - 16 * fl} -5 0)`} />
            <ellipse cx={5} cy={0} rx={9} ry={4.5 + 4 * fl} fill="#FFFFFF" stroke="#2C2A38" strokeWidth={2.2} transform={`rotate(${16 + 16 * fl} 5 0)`} />
            <line x1={0} y1={-3} x2={0} y2={6} stroke="#2C2A38" strokeWidth={2.4} strokeLinecap="round" />
          </g>
        );
      })}
      {/* the light pass: sun-side veil, dust, bokeh */}
      <LightVeil id={`${id}veil`} lights={[[SUN_POS.x, SUN_POS.y, 860]]} o={0.32 * sv} />
      <Bokeh seed={13} x0={760} y0={430} w={760} h={430} t={t} o={0.12 * sv} />
      <Dust seed={19} x0={800} y0={470} w={620} h={320} t={t} n={26} o={0.3 * sv} />
      {dim > 0 ? (
        <g>
          <rect x={-420} y={-420} width={2760} height={1920} fill="#0A1226" opacity={0.8 * dim} />
          <rect x={-420} y={-420} width={2760} height={1920} fill="#233A66" opacity={0.18 * dim} />
        </g>
      ) : null}
    </g>
  );
};
