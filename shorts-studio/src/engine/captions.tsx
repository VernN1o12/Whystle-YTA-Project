import React from 'react';
import { clamp, backOut } from './anim';
import { FONT } from './fonts';
import { useFrame } from './frame';

// Word-by-word captions, burned into the picture: 1 to 3 words at a time, bold white with a thick dark outline,
// lower-centre (the Shorts house style). plan.py groups the voice's word timings into chunks and writes them to
// timeline.json; this draws whichever chunk is live. Drawn in output pixels (not world units) so the size reads the
// same on a phone whatever the format.

export type CaptionChunk = { a: number; b: number; text: string };
export type CaptionStyle = {
  /** Base size in output pixels (shrinks to fit the width). Default 112 for Shorts, 76 for landscape. */
  size?: number;
  /** Centre line as a fraction of the height. Default: the frame's caption band. */
  y?: number;
  /** Words (lower case, no punctuation) drawn in the accent colour: a key number, the payoff word. */
  accent?: string[];
  accentColor?: string;
  uppercase?: boolean;
};

const bare = (w: string) => w.toLowerCase().replace(/[^\w']/g, '');

export const Captions: React.FC<{ f: number; chunks: CaptionChunk[]; style?: CaptionStyle }> = ({ f, chunks, style = {} }) => {
  const fr = useFrame();
  const c = chunks.find((q) => f >= q.a && f < q.b);
  if (!c) return null;
  const portrait = fr.format === 'shorts';
  const { uppercase = true, accent = [], accentColor = '#FFE27A' } = style;
  const text = uppercase ? c.text.toUpperCase() : c.text;
  const words = text.split(' ');
  // Fit the longest line into the width, leaving the side margins the Shorts player needs.
  const maxW = fr.width - (portrait ? 220 : 360);
  const base = style.size ?? (portrait ? 112 : 76);
  const size = Math.min(base, maxW / (text.length * 0.6));
  const pop = backOut(clamp((f - c.a) / 4));
  const cy = (style.y ?? fr.captionY) * fr.height;
  return (
    <svg width={fr.width} height={fr.height} viewBox={`0 0 ${fr.width} ${fr.height}`} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <g transform={`translate(${fr.width / 2} ${cy}) scale(${0.82 + 0.18 * pop})`}>
        <text textAnchor="middle" fontFamily={FONT.title} fontWeight={800} fontSize={size} fill="#FFFFFF" stroke="#0B0816" strokeWidth={size * 0.2} strokeLinejoin="round" paintOrder="stroke" style={{ filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.45))' }}>
          {words.map((w, i) => (
            <tspan key={i} fill={accent.includes(bare(w)) ? accentColor : '#FFFFFF'}>
              {(i ? ' ' : '') + w}
            </tspan>
          ))}
        </text>
      </g>
    </svg>
  );
};

/**
 * The storyboard's guides: the parts of a Shorts frame the player's own buttons and text cover, and the caption band.
 * Drawn over a still (stills.mjs <slug> --guides) to check that faces and the key object are clear of them.
 */
export const Guides: React.FC = () => {
  const fr = useFrame();
  if (fr.format !== 'shorts') return null;
  const { width: W, height: H } = fr;
  const top = 130, bottom = 420, right = 130;
  const cy = fr.captionY * H;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <g fill="#FF2A2A" opacity={0.28}>
        <rect x={0} y={0} width={W} height={top} />
        <rect x={0} y={H - bottom} width={W} height={bottom} />
        <rect x={W - right} y={top} width={right} height={H - top - bottom} />
      </g>
      <rect x={60} y={cy - 90} width={W - 60 - right} height={180} fill="none" stroke="#3AA0FF" strokeWidth={4} strokeDasharray="18 12" />
      <text x={70} y={cy - 100} fontFamily={FONT.ui} fontSize={30} fill="#3AA0FF">CAPTIONS</text>
      <text x={70} y={H - bottom + 44} fontFamily={FONT.ui} fontSize={30} fill="#FFFFFF">PLAYER UI: KEEP FACES AND THE KEY OBJECT ABOVE THIS</text>
    </svg>
  );
};
