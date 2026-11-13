// The single renderer's stage: one Canvas, the painted set, the cast, the effect cards and the
// proven post chain (ink -> thin-lens DOF -> bloom -> NEUTRAL tone map -> grade).

import React, { useEffect, useMemo, useCallback } from "react";
import * as THREE from "three";
import { AbsoluteFill, getInputProps } from "remotion";
import { Canvas as ThreeCanvas, useThree } from "@react-three/fiber";
import { advance } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { InkPass, noInkFallback } from "../bridge/ink";
import { LensBlur, GrainEffect } from "../bridge/lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from "../bridge/grade";
import { Actor, Fx, Pool } from "../bridge/cast";
import { LightRig } from "./lighting";
import { buildSet } from "./sets";
import { actorAt, camAt, poseKey } from "./director";
import { drawActor } from "./outfits";
import { drawFx } from "./props";
import type { SceneSpec, SetHandle, ShotSpec } from "./types";

type PostToggles = { ink: boolean; lens: boolean; pre: boolean; bloom: boolean; grade: boolean; grain: boolean };
const toggles = (): PostToggles => ({
  ink: true,
  lens: true,
  pre: true,
  bloom: true,
  grade: true,
  grain: false,
  ...((getInputProps() as { post?: Partial<PostToggles> }).post ?? {}),
});

const makeBloom = () => {
  const b = new BloomEffect({
    blendFunction: BlendFunction.ADD,
    intensity: 0.42,
    luminanceThreshold: 1.0,
    luminanceSmoothing: 0.2,
    mipmapBlur: true,
    levels: 5,
    radius: 0.6,
  });
  const mip = b.mipmapBlurPass;
  const setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};

/** drawing resolution by distance, sized for a 1080 x 1920 output */
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1200, 2000, 2.0] : d < 6.5 ? [900, 1500, 1.5] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];

const Inner: React.FC<{ scene: SceneSpec; shot: ShotSpec; t: number; sets: Map<string, SetHandle>; world: THREE.Group }> = ({
  scene,
  shot,
  t,
  sets,
  world,
}) => {
  const { camera, scene: threeScene } = useThree();
  const cam = camera as THREE.PerspectiveCamera;

  const rig = useMemo(() => new LightRig(threeScene), [threeScene]);
  const pool = useMemo(() => new Pool(), []);
  const cast = useMemo(() => Array.from({ length: 12 }, () => new Actor(threeScene)), [threeScene]);
  const fxs = useMemo(() => Array.from({ length: 24 }, () => new Fx(threeScene)), [threeScene]);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const on = useMemo(toggles, []);

  const fx = useMemo(
    () => ({
      ink: new InkPass(threeScene, cam),
      lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
      bloom: makeBloom(),
      tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
      grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day),
      grain: new GrainEffect({ amount: 0.025, cellPx: 1.5 }),
    }),
    [cam, threeScene],
  );
  useEffect(() => () => fx.ink.dispose(), [fx]);

  const effects = useMemo(() => {
    const arr: Array<any> = [];
    if (on.ink) arr.push(fx.ink);
    if (on.lens && on.pre) arr.push(fx.lens.pre);
    if (on.lens) arr.push(fx.lens.main);
    if (on.bloom) arr.push(fx.bloom);
    arr.push(fx.tone);
    if (on.grade) arr.push(fx.grade);
    if (on.grain) arr.push(fx.grain);
    return arr;
  }, [fx, on]);

  const post = useMemo(
    () => (
      <EffectComposer multisampling={1}>
        {/* @ts-ignore */}
        {effects.map((p: any, i: number) => (
          <primitive key={i} object={p} dispose={null} />
        ))}
      </EffectComposer>
    ),
    [effects],
  );

  // Paint exactly once per React commit, synchronously, so Remotion's captureScreenshot always
  // sees a fully-painted frame and the GPU queue never backs up (the cause of the white-frames
  // crash on long batch renders).
  useEffect(() => {
    advance(performance.now());
  });

  // ---- camera ----
  const c = camAt(shot, t);
  cam.position.set(c.pos[0], c.pos[1], c.pos[2]);
  cam.up.set(0, 1, 0);
  cam.lookAt(c.look[0], c.look[1], c.look[2]);
  cam.rotateZ(c.roll);
  cam.fov = c.fov;
  cam.near = 0.1;
  cam.far = 200;
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();

  const lookPt = tmp.set(c.look[0], c.look[1], c.look[2]);
  const dist = cam.position.distanceTo(lookPt);
  rig.apply(shot.light, cam, lookPt, dist, threeScene);

  // ---- set ----
  for (const [name, h] of sets) h.root.visible = name === shot.set;
  const active = sets.get(shot.set);
  if (active) active.update(t, shot.phase);

  // ---- cast ----
  let ai = 0;
  for (const spec of shot.actors) {
    const a = cast[ai];
    if (!a) break;
    ai++;
    const p = actorAt(spec, t);
    const scale = p.scale || 1;
    const d = cam.position.distanceTo(tmp.set(p.x, p.y + 1.2 * scale, p.z)) / scale;
    const [w, h, k] = tier(d);
    a.r = pool.req(`${spec.cast}|${w}|${poseKey(p)}`, w, h, k, drawActor(spec.cast, p));
    a.mesh.visible = true;
    a.mesh.position.set(p.x, p.y, p.z);
    a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), 0);
    a.mesh.scale.set(scale, scale, scale);
    a.mesh.castShadow = true;
  }
  for (let i = ai; i < cast.length; i++) cast[i].mesh.visible = false;

  // ---- effect cards ----
  let fi = 0;
  for (const e of shot.fx ?? []) {
    const u = (t - e.t0) / Math.max(0.001, e.t1 - e.t0);
    if (u < 0 || u > 1) continue;
    const f = fxs[fi];
    if (!f) break;
    fi++;
    const size = (e.size ?? 0.7) * (0.35 + 1.25 * (1 - (1 - u) ** 3));
    f.r = pool.req(`fx|${e.kind}|${Math.round(u * 60)}|${e.seed ?? 0}`, 512, 512, 1, (pp) => drawFx(e.kind, pp, u, e.seed ?? 0));
    f.use(false);
    f.mesh.visible = true;
    f.mesh.position.set(e.x, e.y, e.z);
    f.mesh.quaternion.copy(cam.quaternion);
    f.mesh.scale.set(size, size, 1);
  }
  for (let i = fi; i < fxs.length; i++) fxs[i].mesh.visible = false;

  pool.flush();
  for (let i = 0; i < ai; i++) cast[i].bind();
  for (let i = 0; i < fi; i++) fxs[i].bind();

  // ---- lens ----
  let focus = shot.dof?.focus ?? dist;
  if (shot.dof?.track) {
    const a = shot.actors.find((x) => x.name === shot.dof!.track);
    if (a) {
      const p = actorAt(a, t);
      focus = cam.position.distanceTo(tmp.set(p.x, p.y + 1.1, p.z));
    }
  }
  fx.lens.focus = Math.max(0.3, focus);
  fx.lens.cInf = shot.dof?.cInf ?? 12;
  gradeFor(fx.grade, shot.light === "golden" ? "golden" : "day");
  fx.grain.seed = Math.round(t * 30);

  return (
    <>
      {/* @ts-ignore */}
      <primitive object={world} dispose={null} />
      {post}
    </>
  );
};

export const ToonStage: React.FC<{ scene: SceneSpec; shot: ShotSpec; t: number }> = ({ scene, shot, t }) => {
  const sets = useMemo(() => {
    const m = new Map<string, SetHandle>();
    for (const s of scene.shots) if (!m.has(s.set)) m.set(s.set, buildSet(s.set));
    return m;
  }, [scene]);

  const world = useMemo(() => {
    const g = new THREE.Group();
    for (const h of sets.values()) g.add(h.root);
    noInkFallback(g);
    return g;
  }, [sets]);

  // A batch render can lose the WebGL context mid-chunk (GPU driver reassembly under load).
  // preventDefault lets three.js re-upload everything on the next frames instead of the tab
  // painting a blank canvas forever.
  const onCreated = useCallback(({ gl }: { gl: THREE.WebGLRenderer }) => {
    const el = gl.domElement;
    el.addEventListener("webglcontextlost", (e: Event) => {
      e.preventDefault();
      console.error("[toon] webgl context lost; awaiting restore");
    });
    el.addEventListener("webglcontextrestored", () => {
      console.error("[toon] webgl context restored");
    });
  }, []);

  return (
    <AbsoluteFill>
      <ThreeCanvas
        shadows
        frameloop="never"
        gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }}
        camera={{ fov: 32, near: 0.1, far: 200 }}
        style={{ width: "100%", height: "100%" }}
        onCreated={onCreated}
      >
        <Inner scene={scene} shot={shot} t={t} sets={sets} world={world} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
