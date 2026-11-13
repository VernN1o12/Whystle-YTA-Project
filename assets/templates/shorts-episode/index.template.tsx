import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { FrameProvider } from "../../engine/frame";
import { Captions } from "../../engine/captions";
import { FONT } from "../../engine/fonts";
import { ToonShort, ToonStage } from "../../engine/toon";
import type { SceneSpec, Segment, ShotSpec } from "../../engine/toon";
import timeline from "./timeline.json";
import visual from "./shots.json";

// TEMPLATE glue. Copy to src/episodes/<slug>/index.tsx and change the slug and the two exports at the bottom.
// timeline.json (voice + edit) and shots.json (set/light/camera/cast) in, the rendered film out. No three.js here.
// The A-D cards are DOM overlays keyed by timeline.segments[].card, so the edit owns them.

export const TOTAL = timeline.total;

const SCENE: SceneSpec = (() => {
  const v = visual.shots as unknown as Record<string, any>;
  const shots: ShotSpec[] = timeline.shots.map((s) => {
    const d = v[s.id];
    if (!d) throw new Error(`shadow-memory: no visual data for shot ${s.id} in shots.json`);
    return {
      id: s.id,
      set: d.set,
      light: d.light,
      dur: d.dur,
      cam: d.cam,
      actors: d.actors,
      fx: d.fx,
      dof: d.dof,
      phase: d.phase,
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

// Replace these four entries with the episode's real options. A snap/twist episode leaves the overlay unused.
const CARD_DATA: Record<string, { title: string; sub: string; color: string }> = {
  A: { title: "OPTION A", sub: "replace with the fast, dangerous choice", color: "#d95a3a" },
  B: { title: "OPTION B", sub: "replace with the slow, fragile choice", color: "#3f9a5c" },
  C: { title: "OPTION C", sub: "replace with the personal-risk choice", color: "#c9a24a" },
  D: { title: "OPTION D", sub: "replace with the long-shot choice", color: "#4a7ac9" },
};

type EditSegment = Segment & { card?: string };

/** The choice card for the current edit segment, drawn below the player's top bar. */
const ChoiceCard: React.FC<{ f: number }> = ({ f }) => {
  const seg = (timeline.segments as EditSegment[]).find((s) => s.card && f >= s.a && f < s.b);
  const card = seg?.card;
  const data = card ? CARD_DATA[card] : undefined;
  if (!seg || !data) return null;
  const k = Math.max(0, Math.min(1, (f - seg.a) / 7));
  const e = 1 - (1 - k) ** 3;
  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        top: 144,
        width: 700,
        opacity: e,
        transform: `translateY(${(1 - e) * 24}px) rotate(-1.3deg)`,
        background: "#f3e7cf",
        border: "7px solid #241726",
        borderRadius: 20,
        boxShadow: "12px 14px 0 rgba(20,10,18,0.52)",
        padding: "15px 20px 17px",
        display: "flex",
        alignItems: "center",
        gap: 18,
        fontFamily: FONT.title,
        color: "#241726",
      }}
    >
      <div
        style={{
          width: 116,
          height: 116,
          flex: "0 0 auto",
          background: data.color,
          border: "6px solid #241726",
          borderRadius: 16,
          display: "grid",
          placeItems: "center",
          color: "#fff8ea",
          fontSize: 88,
          fontWeight: 900,
          lineHeight: 1,
          textShadow: "4px 5px 0 rgba(20,10,18,0.35)",
        }}
      >
        {card}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 18, letterSpacing: 3.2, fontWeight: 800, color: data.color, marginBottom: 3 }}>YOUR CALL // OPTION {card}</div>
        <div style={{ fontSize: 43, fontWeight: 900, letterSpacing: 0.5, lineHeight: 1.02 }}>{data.title}</div>
        <div style={{ fontSize: 23, fontWeight: 600, opacity: 0.72, marginTop: 7, lineHeight: 1.1 }}>{data.sub}</div>
      </div>
    </div>
  );
};

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
        <ChoiceCard f={f} />
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

export const ShadowMemory = Main;
export const ShadowMemoryBoard = Board;
