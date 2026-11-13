import { defineEpisode, Timeline } from '../../engine';
import timeline from './timeline.json';
import { S1, S2, S3 } from './shots';

// An episode's index.tsx. Nothing sets the format: it comes from timeline.json (written by plan.py from "format" in
// episode.json, 'shorts' by default), so the same file serves a Short. Then add the episode to src/episodes/index.ts:
//   import { foldPaper } from './fold-paper';  export const EPISODES = [..., foldPaper];
// A power look (a grade and an overlay while a rule is active) goes in `looks`; see episodes/rewind/index.tsx. In an
// overlay, position things with useFrame() / SHORTS.safe, not with landscape coordinates.
export const foldPaper = defineEpisode('FoldPaper', {
  timeline: timeline as Timeline,
  shots: { S1, S2, S3 },
});
