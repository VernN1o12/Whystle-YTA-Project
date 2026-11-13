import React from 'react';
import { clamp, easeOut, rnd } from '../anim';
import { DuskSky, NightSky, Stars, Moon, Sun, Rays, Haze, Bokeh, Skyline } from '../kit';
import { Glow, LightVeil, Dust } from '../light';

// The Pit: a field at dusk with a perfectly round, brick-lined hole into the ground. Built for the ball-through-the-Earth
// episode; the light is the low sun (or the moon and a lantern at night), and the hole's void reads as the darkest dark so
// the falling ball reads against it. Variants:
//   <Pit t id />          dusk field, the hole in the meadow, Pip-scale characters at hips y about 846
//   <Pit night />         night: stars, a moon, a lantern on a pole, distant town lights
//   <Pit shaft />         inside the shaft: brick rings rushing up while the camera falls, warm mouth above
// The ball prop and the stool live here because only the pit needs them (x, y is the ball's centre).

export const PIT_HORIZON = 700;
export const PIT_MOUTH = { x: 960, y: 856, rx: 208, ry: 55 }; // the void's opening ellipse
export const PIT_GROUND = 838; // where a standing character's feet land: the meadow just behind the lip
export const PIT_HIP = 846; // deprecated: a standing character's hips are PIT_GROUND - 140 * scale

export const Ball: React.FC<{ x: number; y: number; r: number; rot?: number; rim?: boolean; ck?: string }> = ({ x, y, r, rot = 0, rim = true, ck = 'b' }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot})`}>
    <clipPath id={`ballClip${ck}`}><circle cx={0} cy={0} r={r} /></clipPath>
    <circle cx={0} cy={0} r={r} fill="#C8503C" stroke="#241512" strokeWidth={r * 0.09} />
    <g clipPath={`url(#ballClip${ck})`}>
      <rect x={-r - 2} y={-r * 0.3} width={2 * r + 4} height={r * 0.6} fill="#EBD9B4" />
      <circle cx={-r * 0.42} cy={-r * 0.4} r={r * 1.15} fill="#FFFFFF" opacity={0.14} />
      <circle cx={-r * 0.34} cy={-r * 0.34} r={r * 0.55} fill="#FFFFFF" opacity={0.16} />
      <path d={`M ${-r} ${r * 0.2} Q 0 ${r * 0.78} ${r} ${r * 0.2} L ${r} ${r} L ${-r} ${r} Z`} fill="#8F3A30" opacity={0.85} />
      <path d={`M ${-r} ${r * 0.2} Q 0 ${r * 0.78} ${r} ${r * 0.2} L ${r} ${r} L ${-r} ${r} Z`} fill="#000" opacity={0.25} />
    </g>
    <circle cx={-r * 0.36} cy={-r * 0.38} r={r * 0.3} fill="#FFFFFF" opacity={0.3} />
    {rim ? <path d={`M ${r * 0.34} ${-r * 0.86} A ${r} ${r} 0 0 1 ${r * 0.92} ${-r * 0.18}`} stroke="#FFB46A" strokeWidth={r * 0.11} fill="none" strokeLinecap="round" opacity={0.8} /> : null}
  </g>
);

export const Stool: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <ellipse cx={2} cy={4} rx={52} ry={10} fill="#000" opacity={0.28} />
    <path d="M -40 -4 L 40 -4 L 40 8 L -40 8 Z" fill="#8A6A48" stroke="#241A10" strokeWidth={4} />
    <path d="M -30 8 L -18 92 M 30 8 L 18 92 M 2 8 L 2 92" stroke="#6E5137" strokeWidth={9} strokeLinecap="round" />
    <path d="M -34 0 L 34 0" stroke="#B98A5A" strokeWidth={5} strokeLinecap="round" />
  </g>
);

const GRASS = (seed: number, n: number, y0: number, y1: number) =>
  Array.from({ length: n }).map((_, i) => {
    const y = y0 + rnd(seed, i) * (y1 - y0);
    const x = -420 + rnd(seed + 40, i) * 2760;
    const h = 12 + (y - y0) / (y1 - y0) * 26;
    return { x, y, h, k: rnd(seed + 80, i) };
  });

export const Pit: React.FC<{ t: number; id?: string; night?: boolean; shaft?: boolean }> = ({ t, id = 'pit', night = false, shaft = false }) => {
  if (shaft) return <PitShaft t={t} id={id} />;
  const sway = (s: number, f = 3.1) => Math.sin((t + s) / f) * 6;
  const flag = Math.sin(t / 2.6) * 8;
  return (
    <g>
      <defs>
        <radialGradient id={`${id}void`}>
          <stop offset="0%" stopColor="#421108" stopOpacity={1} />
          <stop offset="55%" stopColor="#170806" />
          <stop offset="100%" stopColor="#050203" />
        </radialGradient>
      </defs>
      {night
        ? <g>
            <NightSky id={`${id}sky`} horizonY={PIT_HORIZON} />
            <Stars seed={11} x0={-400} y0={-300} w={2720} h={1000} t={t} n={60} o={0.8} />
            <Moon x={1290} y={300} r={84} />
          </g>
        : <g>
            <DuskSky id={`${id}sky`} horizonY={PIT_HORIZON} />
            <Sun x={1240} y={616} r={140} t={t} />
            <Rays x={1240} y={616} t={t} len={760} o={0.5} color="#FFB46A" />
            <Haze y={PIT_HORIZON} h={230} o={0.4} />
          </g>}
      <Skyline y={PIT_HORIZON + 2} seed={5} color={night ? '#181226' : '#2A1B45'} h={120} />
      <Skyline y={PIT_HORIZON + 2} seed={21} color={night ? '#201735' : '#2E2148'} h={66} />
      {night
        ? <g opacity={0.9}>
            {Array.from({ length: 22 }).map((_, i) => (
              <rect key={i} x={-300 + rnd(3, i) * 2640} y={706 + rnd(31, i) * 54} width={9} height={11} fill="#FFC96B" opacity={0.28 + rnd(29, i) * 0.5} />
            ))}
          </g>
        : null}
      {/* the meadow: dark olive under a dusk or moon sky, a worn track worn through the grass */}
      <rect x={-420} y={PIT_HORIZON} width={2760} height={740} fill={night ? '#1B1526' : '#241E2C'} />
      <rect x={-420} y={PIT_HORIZON} width={2760} height={140} fill={night ? '#241B33' : '#2C2538'} />
      {GRASS(1, 64, PIT_HORIZON + 4, 1060).map((g, i) => (
        <path key={i} d={`M ${g.x} ${g.y} l -3.4 -${g.h} l 3.4 -1 l 3.4 ${g.h + 1} Z`} fill={night ? '#2A2038' : '#39303F'} opacity={g.k > 0.55 ? 0.9 : 0.55} transform={`rotate(${(g.k - 0.5) * 12} ${g.x} ${g.y})`} />
      ))}
      {/* fence posts and a drooping wire along the far side */}
      {[260, 560, 1340, 1640].map((x, i) => (
        <g key={i}>
          <rect x={x - 8} y={742} width={16} height={64} rx={4} fill={night ? '#241B2E' : '#33283A'} stroke="#171020" strokeWidth={3} />
        </g>
      ))}
      <path d="M 260 756 Q 430 784 560 760 Q 960 806 1340 758 Q 1490 782 1640 758" stroke={night ? '#2A2038' : '#3A3044'} strokeWidth={3.4} fill="none" />
      {/* the warn sign: a plank with a pictogram, no words in the picture */}
      <g transform={`translate(520 806)`}>
        <ellipse cx={4} cy={40} rx={38} ry={9} fill="#000" opacity={0.3} />
        <rect x={-7} y={-46} width={14} height={92} rx={5} fill="#6E5137" stroke="#241A10" strokeWidth={4} />
        <rect x={-64} y={-96} width={128} height={62} rx={9} fill="#8A6A48" stroke="#241A10" strokeWidth={4} />
        <circle cx={-8} cy={-70} r={9} fill="#C8503C" stroke="#241512" strokeWidth={2.4} />
        <path d="M -2 -74 A 10 10 0 0 0 8 -64" stroke="#EBD9B4" strokeWidth={2.4} fill="none" />
        <path d="M 4 -78 Q 18 -74 26 -62 Q 30 -52 24 -48" stroke="#EBD9B4" strokeWidth={3.2} strokeLinecap="round" fill="none" />
        <ellipse cx={22} cy={-44} rx={10} ry={4} fill="#2A1013" />
      </g>
      {/* a wheelbarrow and spilled spoil by the rim */}
      <g transform={`translate(1490 892)`}>
        <ellipse cx={10} cy={44} rx={84} ry={11} fill="#000" opacity={0.28} />
        <path d="M -66 -14 L 34 -14 L 22 24 L -54 24 Z" fill="#7A5A3C" stroke="#241A10" strokeWidth={4} />
        <path d="M -70 -30 L 40 -30 L 34 -14 L -66 -14 Z" fill={night ? '#20304A' : '#5A7294'} opacity={0.7} stroke="#1A1424" strokeWidth={3} />
        <circle cx={-58} cy={38} r={16} fill="#241A10" />
        <circle cx={-58} cy={38} r={7} fill="#4A3830" />
        <path d="M 34 -10 L 96 30" stroke="#6E5137" strokeWidth={9} strokeLinecap="round" />
        <path d="M 40 26 q 30 -12 60 -4 M 52 30 q 22 -8 40 -2" stroke="#574C46" strokeWidth={7} strokeLinecap="round" fill="none" />
        <ellipse cx={96} cy={30} rx={14} ry={5} fill="#574C46" opacity={0.8} />
      </g>
      {/* rocks */}
      <g transform={`translate(330 984)`}>
        <ellipse cx={6} cy={16} rx={40} ry={8} fill="#000" opacity={0.25} />
        <path d="M -28 12 L -18 -12 L 8 -16 L 24 4 L 18 12 Z" fill={night ? '#262036' : '#4A4148'} stroke="#171020" strokeWidth={3.4} />
        <path d="M -18 -12 L 8 -16 L 12 0 Z" fill={night ? '#312946' : '#5E5560'} />
      </g>
      {/* the hole: a raised rim of spoil, the void, the brick lining on the near arc, the fault face */}
      <g>
        <ellipse cx={960} cy={866} rx={244} ry={72} fill="#000" opacity={0.28} />
        <ellipse cx={960} cy={856} rx={232} ry={64} fill="#3A2B22" stroke="#241A14" strokeWidth={5} />
        <ellipse cx={960} cy={858} rx={208} ry={55} fill={`url(#${id}void)`} stroke="#120A08" strokeWidth={6} />
        {/* brick courses on the near wall of the shaft */}
        <path d={`M 762 852 Q 960 912 1158 852`} stroke="#4E382E" strokeWidth={13} fill="none" />
        <path d={`M 790 868 Q 960 922 1130 868`} stroke="#3E2C24" strokeWidth={10} fill="none" />
        <path d={`M 826 880 Q 960 926 1094 880`} stroke="#33241E" strokeWidth={8} fill="none" />
        <path d="M 838 854 l 12 22 M 886 864 l 10 21 M 934 870 l 7 22 M 986 868 l -7 22 M 1040 860 l -11 21" stroke="#2A1C16" strokeWidth={4} strokeLinecap="round" opacity={0.85} />
        {/* the near cut face: strata under the lip */}
        <path d="M 700 894 Q 792 928 960 928 Q 1128 928 1220 894 L 1220 1022 L 700 1022 Z" fill="#3C2E38" stroke="#241A14" strokeWidth={5} />
        <path d="M 700 902 Q 792 936 960 936 Q 1128 936 1220 902 L 1220 942 L 700 942 Z" fill="#46384F" opacity={0.9} />
        <path d="M 700 948 Q 792 976 960 976 Q 1128 976 1220 948 L 1220 994 L 700 994 Z" fill="#5C4A3C" opacity={0.85} />
        <path d="M 700 998 Q 792 1020 960 1020 Q 1128 1020 1220 998 L 1220 1022 L 700 1022 Z" fill="#574C46" opacity={0.9} />
        <path d="M 700 894 Q 792 928 960 928 Q 1128 928 1220 894" stroke="#241A14" strokeWidth={4} fill="none" />
        {/* the rim catching the light on the sun side */}
        <path d={`M 806 808 Q 960 780 1140 816`} stroke={night ? '#7B6BC4' : '#E8A46C'} strokeWidth={6} strokeLinecap="round" fill="none" opacity={0.8} />
        {/* a warning flag on the rim */}
        <g transform={`translate(1150 864)`}>
          <rect x={-5} y={-140} width={10} height={140} rx={5} fill="#6E5137" stroke="#241A10" strokeWidth={4} transform={`rotate(${sway(50, 90) * 0.06})`} />
          <path d={`M 0 -134 Q 34 ${-128 + flag * 0.7} 8 -96 Q 40 ${-104 + flag * 0.6} 2 -76 Z`} fill="#C75050" stroke="#7A3232" strokeWidth={3.4} />
          <ellipse cx={4} cy={8} rx={22} ry={6} fill="#000" opacity={0.22} />
        </g>
        {/* the fall: an occasional pebble down the shaft keeps it alive */}
        <ellipse cx={905} cy={872} rx={5} ry={2.4} fill="#574C46" opacity={0.7} transform={`translate(0 ${(t % 26) < 8 ? easeOut((t % 26) / 8) * 42 : 0}`} />
      </g>
      {night
        ? <g>
            <Glow x={700} y={760} r={330} o={0.6} />
            <Glow x={1290} y={300} r={620} kind="cool" o={0.34} />
            <g transform="translate(700 862)">
              <rect x={-6} y={-132} width={12} height={132} rx={6} fill="#241B2E" stroke="#141020" strokeWidth={3} />
              <rect x={-22} y={-160} width={44} height={32} rx={9} fill="#2A2038" stroke="#141020" strokeWidth={3} />
              <circle cx={0} cy={-144} r={9} fill="#FFC96B" />
            </g>
            <LightVeil id={`${id}veil`} lights={[[1290, 300, 640], [700, 750, 300]]} o={0.5} />
          </g>
        : <g>
            <Glow x={1240} y={616} r={720} o={0.5} />
            <LightVeil id={`${id}veil`} lights={[[1240, 616, 900]]} o={0.45} />
          </g>}
      <Bokeh seed={9} x0={700} y0={520} w={700} h={420} t={t} o={0.14} />
      <Dust seed={6} x0={760} y0={520} w={520} h={260} t={t} o={0.5} />
    </g>
  );
};

/** Inside the brick shaft: ring brick rushing past (a falling camera), warm light from the mouth above. */
const PIT_SHAFT_RINGS = 12;
const PitShaft: React.FC<{ t: number; id: string }> = ({ t, id }) => {
  const flow = (t * 26) % 240;
  return (
    <g>
      <rect x={-420} y={-420} width={2760} height={1920} fill="#171019" />
      {/* the glow of the open mouth above, and the core's warm dark light far below */}
      <Glow x={960} y={120} r={720} o={0.4} />
      <Glow x={960} y={1180} r={520} kind="red" o={0.34} />
      {Array.from({ length: PIT_SHAFT_RINGS }).map((_, i) => {
        const y = ((i * 240 - flow) % (PIT_SHAFT_RINGS * 240)) + 120 - 720;
        const depth = 1 + (y + 600) / 820;
        return (
          <g key={i} opacity={clamp(1 - Math.max(0, depth - 1) * 0.16)}>
            <ellipse cx={960} cy={y} rx={290} ry={92} fill="none" stroke="#3E2C24" strokeWidth={17 + 3 * Math.sin(i * 3.1)} />
            <ellipse cx={960} cy={y} rx={290} ry={92} fill="none" stroke="#2A1C16" strokeWidth={4} strokeDasharray="34 17" />
            {i % 3 === 2 ? <ellipse cx={960} cy={y} rx={212} ry={66} fill="none" stroke="#33241E" strokeWidth={5} /> : null}
          </g>
        );
      })}
      <rect x={-420} y={-420} width={2760} height={1920} fill={`url(#${id}grad)`} />
      <defs>
        <linearGradient id={`${id}grad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E8A46C" stopOpacity={0.22} />
          <stop offset="40%" stopColor="#2A1820" stopOpacity={0.1} />
          <stop offset="100%" stopColor="#100713" stopOpacity={0.55} />
        </linearGradient>
      </defs>
      <Dust seed={13} x0={620} y0={-200} w={760} h={1000} t={t} n={26} o={0.4} />
    </g>
  );
};
