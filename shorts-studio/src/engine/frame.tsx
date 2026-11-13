import React from 'react';
import { FORMATS, Format, WORLD } from '../studio.config';
import { camT } from './anim';

// The frame: which part of the 1920 x 1080 world the video shows, and where text and faces must stay clear.
//
// Landscape shows the whole world. Shorts (1080 x 1920) shows a full-height, 607.5-unit-wide window cut from the
// middle of it, scaled up 1.78x: the world is vector, so nothing softens. A shot's camera is unchanged: camT(cx, cy, s)
// still centres the world point (cx, cy) in the frame at zoom s, so a Shorts shot just has to keep its subject
// inside the window (x from 656 to 1264 at zoom 1) or move the camera onto it.

export type Frame = {
  format: Format;
  /** Output size in pixels. */
  width: number;
  height: number;
  /** The window onto the world, in world units. The svg viewBox of everything the engine draws. */
  vb: { x: number; y: number; w: number; h: number };
  /** Centre of the window in world units (camT's origin). */
  cx: number;
  cy: number;
  /** Output pixels per world unit at zoom 1 (1.78 for Shorts, 1 for landscape). */
  k: number;
  /**
   * Where faces, the key object and text should stay (world units). For Shorts this keeps clear of the parts of the
   * picture the Shorts player covers with its own buttons, title and channel name (rough, conservative margins:
   * about 7% top, 22% bottom, 12% right, 3% left). Landscape has no such overlay, so it is the whole world.
   */
  safe: { x0: number; x1: number; y0: number; y1: number };
  /** The caption band, as a fraction of the output height (centre line). Captions are drawn in pixels, not world units. */
  captionY: number;
};

export const frameFor = (format: Format): Frame => {
  const { width, height } = FORMATS[format];
  const w = (WORLD.height * width) / height; // the window keeps the world's full height
  const h = WORLD.height;
  const x = (WORLD.width - w) / 2;
  const k = width / w;
  if (format === 'landscape') {
    return { format, width, height, vb: { x, y: 0, w, h }, cx: WORLD.width / 2, cy: WORLD.height / 2, k, safe: { x0: 0, x1: WORLD.width, y0: 0, y1: WORLD.height }, captionY: 0.84 };
  }
  // Shorts: margins in output pixels (130 top, 420 bottom, 130 right, 60 left), converted to world units.
  return {
    format,
    width,
    height,
    vb: { x, y: 0, w, h },
    cx: WORLD.width / 2,
    cy: WORLD.height / 2,
    k,
    safe: { x0: x + 60 / k, x1: x + w - 130 / k, y0: 130 / k, y1: h - 420 / k },
    captionY: 0.68,
  };
};

/** Ready-made frames, for authoring: `SHORTS.vb.x`, `SHORTS.safe.y1`... without a hook. */
export const SHORTS = frameFor('shorts');
export const LANDSCAPE = frameFor('landscape');

const FrameContext = React.createContext<Frame>(LANDSCAPE);
export const FrameProvider: React.FC<{ format: Format; children: React.ReactNode }> = ({ format, children }) => (
  <FrameContext.Provider value={frameFor(format)}>{children}</FrameContext.Provider>
);
/** The frame of the episode being drawn. Landscape outside an episode (the cast sheet). */
export const useFrame = (): Frame => React.useContext(FrameContext);

/**
 * A Shorts camera that puts the world point (x, y) at (u, v) of the frame (u across, v down, both 0..1) at zoom s, so a
 * face can sit at 38% from the top, clear of the caption band (68%) and the player's bottom 22%:
 *   <g transform={camAim(hero.x, headY, 1.8, 0.5, 0.38)}> ... </g>
 * It is camT with the window arithmetic done: at zoom s the frame shows 607.5 / s units across and 1080 / s down.
 */
export const camAim = (x: number, y: number, s: number, u = 0.5, v = 0.4) => camT(x + ((0.5 - u) * SHORTS.vb.w) / s, y + ((0.5 - v) * SHORTS.vb.h) / s, s);
