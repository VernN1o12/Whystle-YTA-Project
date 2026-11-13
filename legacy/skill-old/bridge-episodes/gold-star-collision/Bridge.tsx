// ============================================================
// "What If & Paradox Explainers" — Gold Star Collision
//
// A 34-second YouTube Short about why gold on Earth came from
// colliding stars. Renders via the bridge Three.js pipeline
// (Canvas2D characters on billboard quads inside a 3D world).
//
// Structure: 4 shots × ~8.5 s each, day → golden hour transition
// ============================================================
import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Canvas as ThreeCanvas } from '@react-three/fiber';
import { useThree } from '@react-three/fiber';
import { EffectComposer } from '@react-three/postprocessing';
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from 'postprocessing';
import { Pen, bodyFront, SKINS, Outfit, Expr } from '../../engine/bridge/toon';
import { lam, boxGeo } from '../../engine/bridge/build';
import { LensBlur, GrainEffect } from '../../engine/bridge/lensblur';
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from '../../engine/bridge/grade';

// ─── Shot definitions ───────────────────────────────────────
interface Shot {
  id: number;
  a: number;
  b: number;
  light: 'day' | 'golden';
  camPos: [number, number, number];
  camLook: [number, number, number];
  fov: number;
  chars: CharSpec[];
  props?: PropSpec[];
}

interface CharSpec {
  x: number; y: number; z: number;
  outfit: Outfit;
  skinIndex: number;
  expr: Expr;
  side: boolean;
  mirror: boolean;
  scale: number;
  yaw: number;
  phase?: number;
}

interface PropSpec {
  kit: string;
  x: number; y: number; z: number;
  rz?: number; sx?: number; sy?: number; sz?: number; color?: string;
}

// ─── Story data ─────────────────────────────────────────────
export const FPS = 30;
export const TOTAL = 1020; // 34 s at 30 fps

export const SHOTS: Shot[] = [
  {
    id: 1, a: 0, b: 255, light: 'day',
    camPos: [-8, 6, 18], camLook: [0, 3, 0], fov: 45,
    chars: [
      { x: -2, y: 0, z: -5, outfit: { jacket: '#3b6cb4', pants: '#4a4a5a', boots: '#241726', hat: 'cap', cap: '#e2453c', build: 'kid' }, skinIndex: 0, expr: 'neutral', side: true, mirror: false, scale: 1.0, yaw: 0.3, phase: 0 },
      { x: 2, y: 0, z: -6, outfit: { jacket: '#c9943c', pants: '#5a4a3a', boots: '#241726', hat: 'beanie', hair: '#8b4513', build: 'adult' }, skinIndex: 1, expr: 'grin', side: false, mirror: false, scale: 1.0, yaw: -0.2, phase: 0.25 },
    ],
    props: [{ kit: 'ring', x: 0, y: 0.15, z: -3, rz: 0.3, sx: 3, sy: 3, sz: 0.05, color: '#ffd700' }],
  },
  {
    id: 2, a: 255, b: 510, light: 'day',
    camPos: [12, 10, 10], camLook: [0, 5, 0], fov: 55,
    chars: [
      { x: 0, y: 0, z: -8, outfit: { jacket: '#3b6cb4', pants: '#4a4a5a', boots: '#241726', hat: 'cap', cap: '#e2453c', build: 'kid' }, skinIndex: 0, expr: 'shock', side: false, mirror: false, scale: 1.0, yaw: 0, phase: 0 },
    ],
    props: [
      { kit: 'sphere', x: 0, y: 4, z: -5, sx: 1.2, sy: 1.2, sz: 1.2, color: '#ffcc00' },
      { kit: 'sphere', x: -3, y: 6, z: -7, sx: 0.6, sy: 0.6, sz: 0.6, color: '#ff6600' },
      { kit: 'sphere', x: 3, y: 5, z: -6, sx: 0.5, sy: 0.5, sz: 0.5, color: '#ffaa00' },
    ],
  },
  {
    id: 3, a: 510, b: 765, light: 'golden',
    camPos: [-6, 4, 14], camLook: [0, 2, -2], fov: 40,
    chars: [
      { x: -1.5, y: 0, z: -4, outfit: { jacket: '#3b6cb4', pants: '#4a4a5a', boots: '#241726', hat: 'cap', cap: '#e2453c', build: 'kid' }, skinIndex: 0, expr: 'whistle', side: true, mirror: true, scale: 1.0, yaw: -0.3, phase: 0 },
      { x: 1.5, y: 0, z: -5, outfit: { jacket: '#c9943c', pants: '#5a4a3a', boots: '#241726', hat: 'beanie', hair: '#8b4513', build: 'adult' }, skinIndex: 1, expr: 'laugh', side: false, mirror: false, scale: 1.0, yaw: 0.2, phase: 0.1 },
    ],
    props: [
      { kit: 'ring', x: 0, y: 0.2, z: -2, rz: 0.5, sx: 2, sy: 2, sz: 0.05, color: '#ffd700' },
      { kit: 'box', x: -4, y: 0.5, z: -8, sx: 1, sy: 1, sz: 1, color: '#8b6914' },
      { kit: 'box', x: 4, y: 0.5, z: -9, sx: 1, sy: 1, sz: 1, color: '#8b6914' },
    ],
  },
  {
    id: 4, a: 765, b: 1020, light: 'golden',
    camPos: [0, 12, 20], camLook: [0, 2, -3], fov: 60,
    chars: [
      { x: -3, y: 0, z: -6, outfit: { jacket: '#3b6cb4', pants: '#4a4a5a', boots: '#241726', hat: 'cap', cap: '#e2453c', build: 'kid' }, skinIndex: 0, expr: 'relief', side: true, mirror: false, scale: 1.0, yaw: 0.4, phase: 0 },
      { x: 3, y: 0, z: -7, outfit: { jacket: '#c9943c', pants: '#5a4a3a', boots: '#241726', hat: 'beanie', hair: '#8b4513', build: 'adult' }, skinIndex: 1, expr: 'relief_open', side: false, mirror: false, scale: 1.0, yaw: -0.3, phase: 0.15 },
      { x: 0, y: 0, z: -4, outfit: { jacket: '#6b8e5a', pants: '#4a5a3a', boots: '#241726', hat: null, build: 'stout' }, skinIndex: 2, expr: 'neutral', side: false, mirror: false, scale: 0.9, yaw: 0, phase: 0 },
    ],
    props: [
      { kit: 'sphere', x: 0, y: 8, z: -10, sx: 1.5, sy: 1.5, sz: 1.5, color: '#ffd700' },
      { kit: 'sphere', x: -5, y: 6, z: -12, sx: 0.8, sy: 0.8, sz: 0.8, color: '#ff9900' },
      { kit: 'sphere', x: 5, y: 7, z: -11, sx: 0.7, sy: 0.7, sz: 0.7, color: '#ffaa00' },
    ],
  },
];

// ─── Scene geometry helpers ─────────────────────────────────
const GROUND_Y = 0;
const WORLD_W = 60;
const WORLD_D = 60;

function makeWorld(): THREE.Group {
  const root = new THREE.Group();

  const groundMat = lam('ground', () => ({ color: '#5a7a3a' }));
  const groundGeo = boxGeo(
    new THREE.Vector3(-WORLD_W / 2, GROUND_Y - 0.1, -WORLD_D / 2),
    new THREE.Vector3(WORLD_W / 2, GROUND_Y, WORLD_D / 2),
    4,
  );
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.receiveShadow = true;
  root.add(ground);

  const hillMat = lam('hill', () => ({ color: '#4a6a2a' }));
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const r = 25 + Math.random() * 8;
    const h = 3 + Math.random() * 4;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const hillGeo = boxGeo(
      new THREE.Vector3(x - h, GROUND_Y, z - h),
      new THREE.Vector3(x + h, GROUND_Y + h * 1.5, z + h),
    );
    const hill = new THREE.Mesh(hillGeo, hillMat);
    hill.castShadow = true;
    hill.receiveShadow = true;
    root.add(hill);
  }

  return root;
}

// ─── Character renderer ─────────────────────────────────────
function renderCharacter(canvas: HTMLCanvasElement, char: CharSpec, lightAngle: number, frame: number): void {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  ctx.save();
  ctx.setTransform(w / 600, 0, 0, h / 1000, 0, 0);

  const pen = new Pen(ctx);

  const opts: Parameters<typeof bodyFront>[2] = {
    expr: char.expr,
    light: lightAngle,
    facing: char.side ? (char.mirror ? -1 : 1) : 0,
    seed: char.x * 100 + char.z * 7 + char.skinIndex * 13,
    phase: (char.phase ?? 0) + frame * 0.03,
    blink: Math.sin(frame * 0.1 + char.x * 50) > 0.97,
    mode: 'stand' as const,
    tilt: char.expr === 'shock' ? 5 : 0,
  };

  bodyFront(pen, char.outfit, opts);
  ctx.restore();
}

// ─── Inner scene component ──────────────────────────────────
const Inner: React.FC<{ shot: Shot }> = ({ shot }) => {
  const f = useCurrentFrame();
  const { camera, scene: threeScene } = useThree();
  const actorsRef = useRef<Map<string, THREE.Sprite>>(new Map());
  const world = useMemo(() => makeWorld(), []);
  const cam = camera as THREE.PerspectiveCamera;

  // Subtle camera breathing
  const breatheX = Math.sin(f * 0.015) * 0.3;
  const breatheY = Math.cos(f * 0.012) * 0.15;

  cam.position.set(shot.camPos[0] + breatheX, shot.camPos[1] + breatheY, shot.camPos[2]);
  cam.lookAt(new THREE.Vector3(...shot.camLook));
  cam.fov = shot.fov + Math.sin(f * 0.02) * 0.5;
  cam.updateProjectionMatrix();

  // Sky + fog
  const skyColor = shot.light === 'golden' ? '#ffd4a0' : '#87ceeb';
  threeScene.background = new THREE.Color(skyColor);
  threeScene.fog = new THREE.Fog(skyColor, 20, 80);

  // Directional light (sun)
  const sunDir = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
  let dirLight = threeScene.children.find(
    (c): c is THREE.DirectionalLight => c instanceof THREE.DirectionalLight && c.intensity > 0
  ) as THREE.DirectionalLight | undefined;

  if (!dirLight) {
    dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.castShadow = true;
    threeScene.add(dirLight);
    const target = new THREE.Object3D();
    threeScene.add(target);
    dirLight.target = target;
  }

  const lookTarget = new THREE.Vector3(...shot.camLook);
  dirLight.position.copy(lookTarget).add(sunDir.clone().multiplyScalar(200));
  dirLight.target.position.copy(lookTarget);
  dirLight.target.updateMatrixWorld();

  // Light angle for character shading
  const lightAngle = Math.atan2(
    -sunDir.y,
    sunDir.x * cam.matrixWorld.elements[0] + sunDir.z * cam.matrixWorld.elements[2]
  );

  // Add static world scenery
  if (!threeScene.children.includes(world)) {
    threeScene.add(world);
  }

  // Manage character sprites
  const charKeys = new Set<string>();
  for (const char of shot.chars) {
    const key = `${char.x}|${char.z}|${char.skinIndex}|${char.expr}|${char.side ? 'S' : 'F'}`;
    charKeys.add(key);

    let sprite = actorsRef.current.get(key);
    if (!sprite) {
      const cv = document.createElement('canvas');
      cv.width = 500;
      cv.height = Math.round(500 * (9 / 16));
      const tex = new THREE.CanvasTexture(cv);
      tex.colorSpace = THREE.SRGBColorSpace;
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
      sprite = new THREE.Sprite(mat);
      sprite.userData = { canvas: cv, tex };
      threeScene.add(sprite);
      actorsRef.current.set(key, sprite);
    }

    const dist = cam.position.distanceTo(new THREE.Vector3(char.x, char.y + 1.1, char.z));
    const sizes = dist < 4 ? [1400, 2300] : dist < 8 ? [900, 1500] : [500, 800];
    sprite.position.set(char.x, char.y + 1.1, char.z);
    sprite.scale.set(sizes[0] * 0.00216 * char.scale, sizes[1] * 0.00216 * char.scale, 1);
    sprite.rotation.y = char.yaw;

    const cv = (sprite.userData as { canvas: HTMLCanvasElement }).canvas;
    renderCharacter(cv, char, lightAngle, f);
    (sprite.userData as { tex: THREE.CanvasTexture }).tex.needsUpdate = true;
  }

  // Remove unused sprites
  for (const [key, sprite] of actorsRef.current) {
    if (!charKeys.has(key)) {
      threeScene.remove(sprite);
      (sprite.material as THREE.SpriteMaterial).map?.dispose();
      (sprite.material as THREE.SpriteMaterial).dispose();
      sprite.userData.tex?.dispose();
      actorsRef.current.delete(key);
    }
  }

  return null;
};

// ─── Post-processing overlay ────────────────────────────────
const PostFX: React.FC<{ shot: Shot }> = ({ shot }) => {
  const f = useCurrentFrame();
  const { camera } = useThree();
  const pc = camera as THREE.PerspectiveCamera;

  const fx = useMemo(() => ({
    lens: new LensBlur({ maxCoC: 15, nearScale: 1.2 }),
    bloom: new BloomEffect({
      blendFunction: BlendFunction.ADD,
      intensity: 0.4,
      luminanceThreshold: 1.0,
      luminanceSmoothing: 0.2,
      mipmapBlur: true,
      levels: 4,
      radius: 0.4,
    }),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADES[shot.light], GRADE_STRENGTH[shot.light]),
    grain: new GrainEffect({ amount: 0.02, cellPx: 1.5 }),
  }), [shot]);

  useEffect(() => () => {
    fx.lens.dispose?.();
    fx.bloom.dispose?.();
    fx.tone.dispose?.();
    fx.grade.dispose?.();
    fx.grain.dispose?.();
  }, [fx]);

  const focusPoint = new THREE.Vector3(...shot.camLook);
  const focusDist = pc.position.distanceTo(focusPoint);
  fx.lens.focus = Math.max(0.3, focusDist);
  fx.lens.cInf = shot.id === 2 || shot.id === 4 ? 12 : 0;
  gradeFor(fx.grade, shot.light);
  fx.grain.seed = f;

  return (
    <EffectComposer multisampling={4}>
      {/* @ts-ignore */}
      <primitive object={fx.lens.main} dispose={null} />
      {/* @ts-ignore */}
      <primitive object={fx.bloom} dispose={null} />
      {/* @ts-ignore */}
      <primitive object={fx.tone} dispose={null} />
      {/* @ts-ignore */}
      <primitive object={fx.grade} dispose={null} />
      {/* @ts-ignore */}
      <primitive object={fx.grain} dispose={null} />
    </EffectComposer>
  );
};

// ─── Main composition ───────────────────────────────────────
const ShotView: React.FC<{ shot: Shot; alpha: number }> = ({ shot, alpha }) => (
  <AbsoluteFill style={{ opacity: alpha }}>
    <ThreeCanvas shadows gl={{ antialias: false, stencil: false, powerPreference: 'high-performance', toneMappingExposure: 1.0 }}
      camera={{ fov: shot.fov, near: 0.2, far: 1500 }}>
      <Inner shot={shot} />
      <PostFX shot={shot} />
    </ThreeCanvas>
  </AbsoluteFill>
);

export const GoldStarCollision: React.FC = () => {
  const f = useCurrentFrame();
  const shot = SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
  return (
    <AbsoluteFill style={{ background: shot.light === 'golden' ? '#ffd4a0' : '#87ceeb' }}>
      <ShotView shot={shot} alpha={1} />
    </AbsoluteFill>
  );
};

GoldStarCollision.displayName = 'GoldStarCollision';
