import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { FrameProvider } from "../../engine/frame";
import { Captions } from "../../engine/captions";
import { ToonShort, ToonStage } from "../../engine/toon";
import type { SceneSpec, Segment, ShotSpec } from "../../engine/toon";
import timeline from "./timeline.json";
import visual from "./shots.json";

// mars-colony-survival — data-only episode (see shorts-studio/docs/TOON_WORKFLOW.md). This file is glue only:
// timeline.json (voice + edit) and shots.json (set/light/camera/cast) in, the rendered film out.

export const TOTAL = timeline.total;

const SCENE: SceneSpec = (() => {
  const v = visual.shots as unknown as Record<string, any>;
  const shots: ShotSpec[] = timeline.shots.map((s) => {
    const d = v[s.id];
    if (!d) throw new Error(`mars-colony-survival: no visual data for shot ${s.id} in shots.json`);
    return {
      id: s.id,
      set: d.set,
      light: d.light,
      dur: d.dur,
      cam: d.cam,
      actors: d.actors,
      fx: d.fx,
      dof: d.dof,
    } as ShotSpec;
  });
  return {
    slug: timeline.slug,
    fps: timeline.fps,
    width: 1080,
    height: 1920,
    shots,
    segments: timeline.segments as unknown as Segment[],
  };
})();

const AudioTrack: React.FC = () => {
  const A = (timeline as any).audio;
  if (!A) return null;
  return (
    <>
      {A.voice ? <Audio src={staticFile(A.voice)} volume={A.voiceVol ?? 1} /> : null}
      {A.sfx ? <Audio src={staticFile(A.sfx)} volume={A.sfxVol ?? 1} /> : null}
      {A.music ? <Audio src={staticFile(A.music)} volume={A.musicVol ?? 1} /> : null}
    </>
  );
};

const Main: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <FrameProvider format="shorts">
      <AbsoluteFill style={{ background: "#0d0d12" }}>
        <ToonShort scene={SCENE} />
        {timeline.captions?.length ? <Captions f={f} chunks={timeline.captions} style={timeline.captionStyle as never} /> : null}
        <AudioTrack />
      </AbsoluteFill>
    </FrameProvider>
  );
};

const Board: React.FC = () => {
  const f = useCurrentFrame();
  const shot = SCENE.shots[Math.min(Math.max(0, f), SCENE.shots.length - 1)];
  const t = shot.cam[0]?.t ?? 0;
  return (
    <AbsoluteFill style={{ background: "#0d0d12" }}>
      <ToonStage scene={SCENE} shot={shot} t={t} />
    </AbsoluteFill>
  );
};

export const MarsColonySurvival = Main;
export const MarsColonySurvivalBoard = Board;
