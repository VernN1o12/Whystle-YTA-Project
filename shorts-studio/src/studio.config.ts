// The studio's settings.

/**
 * The drawing space. Every set, prop and shot is authored in these units, whatever size the video is. A landscape
 * episode shows all of it; a Shorts episode shows a tall window onto it (see engine/frame.tsx), so the sets, the rig
 * and every shot written for either format keep working.
 */
export const WORLD = { width: 1920, height: 1080 } as const;

/** The video sizes. `shorts` is YouTube Shorts: vertical 9:16. */
export const FORMATS = {
  shorts: { width: 1080, height: 1920 },
  landscape: { width: 1920, height: 1080 },
} as const;
export type Format = keyof typeof FORMATS;

export const STUDIO = {
  fps: 30,
  /**
   * The format a new episode renders in when its episode.json / timeline.json doesn't say. 'shorts' is this skill's
   * default. The two shipped examples (rewind, copy-paste) pin themselves to 'landscape' in their index.tsx.
   */
  format: 'shorts' as Format,
  /**
   * A local display face for titles, as a file in public/ (your brand font, say). null uses Bricolage Grotesque
   * from Google Fonts. Example: { family: 'My Brand Font', file: 'fonts/MyBrandFont.woff2', weight: '200 700' }
   */
  titleFont: null as null | { family: string; file: string; weight: string },
};
