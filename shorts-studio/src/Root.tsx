import React from 'react';
import { Composition } from 'remotion';
import './engine/fonts';
import { FORMATS, STUDIO } from './studio.config';
import { EPISODES } from './episodes';

// Every episode gets two compositions: <Id> (the film) and <Id>Board (one frame per shot, at its key frame, for the
// storyboard). Each takes its size from the episode's format: Shorts are 1080 x 1920, the landscape examples 1920 x 1080.
//   npx remotion studio src/index.ts --port 3430

export const Root: React.FC = () => {
  return (
    <>
      {EPISODES.map((e) => {
        const size = { ...FORMATS[e.format], fps: STUDIO.fps };
        return (
          <React.Fragment key={e.id}>
            <Composition id={e.id} component={e.Main} durationInFrames={Math.max(1, e.total)} {...size} />
            <Composition id={`${e.id}Board`} component={e.Board} durationInFrames={Math.max(1, e.shotCount)} {...size} />
          </React.Fragment>
        );
      })}
    </>
  );
};
