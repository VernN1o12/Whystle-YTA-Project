// The one renderer. A film is a SceneSpec; this component picks the shot for the current frame
// and hands it to the stage. Episodes never touch three.js.

import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { shotAt } from "./director";
import { ToonStage } from "./stage";
import type { SceneSpec } from "./types";

export const ToonShort: React.FC<{ scene: SceneSpec; shot?: string }> = ({ scene, shot }) => {
  const frame = useCurrentFrame();
  const pick = useMemo(() => {
    if (shot) {
      const s = scene.shots.find((x) => x.id === shot) ?? scene.shots[0];
      return { shot: s, t: frame / scene.fps };
    }
    return shotAt(scene, frame);
  }, [scene, shot, frame]);

  return (
    <AbsoluteFill style={{ background: "#0d0d12" }}>
      <ToonStage scene={scene} shot={pick.shot} t={pick.t} />
    </AbsoluteFill>
  );
};

/** one still per shot, for the storyboard: the Board composition's frame N is shot N */
export const ToonBoard: React.FC<{ scene: SceneSpec }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const s = scene.shots[Math.max(0, Math.min(scene.shots.length - 1, frame))];
  const t = s.cam[Math.min(1, s.cam.length - 1)]?.t ?? 0;
  return (
    <AbsoluteFill style={{ background: "#0d0d12" }}>
      <ToonStage scene={scene} shot={s} t={t} />
    </AbsoluteFill>
  );
};
