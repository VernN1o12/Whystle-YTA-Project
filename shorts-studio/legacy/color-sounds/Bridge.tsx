// ============================================================
// "What If" — COLORS MAKE SOUNDS?
//
// A vertical YouTube Short about synesthesia: colors have specific
// musical sounds. Renders via the bridge Three.js pipeline.
// ============================================================
import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Canvas as ThreeCanvas } from '@react-three/fiber';
import { useThree } from '@react-three/fiber';
import { Pen, bodyFront, SKINS, Outfit, Expr } from '../../engine/bridge/toon';
import { lam, boxGeo } from '../../engine/bridge/build';
// Post-processing disabled for headless render; would crash GPU driver.
// Visual grading applied in ffmpeg master step via colorcorrect filter.
// import { LensBlur, GrainEffect } from '../../engine/bridge/lensblur';
// import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from '../../engine/bridge/grade';

interface Shot {
  id: number;
  a: number;
  b: number;
  light: 'day' | 'golden';
  bgColor: string;
  fogColor: string;
  fogNear: number;
  fogFar: number;
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
  color1?: string;
  color2?: string;
}

export const FPS = 30;
export const TOTAL = 1524; // 50.8 s at 30 fps

// Simple built-in prop builders
function makeProp(shot: Shot, spec: PropSpec): THREE.Mesh | null {
  const mat = lam(`prop_${spec.kit}_${spec.x}_${spec.y}_${spec.z}`, () => ({
    color: spec.color || '#ffffff',
  }));

  let geo: THREE.BufferGeometry;
  switch (spec.kit) {
    case 'sphere':
      geo = new THREE.SphereGeometry(1, 32, 32);
      break;
    case 'box':
      geo = new THREE.BoxGeometry(1, 1, 1);
      break;
    case 'ring':
      geo = new THREE.RingGeometry(0.4, 1, 32);
      break;
    case 'tuning_fork':
      geo = new THREE.CylinderGeometry(0.05, 0.05, 2, 16);
      break;
    case 'cylinder':
      geo = new THREE.CylinderGeometry(1, 1, 1, 32);
      break;
    default:
      geo = new THREE.BoxGeometry(1, 1, 1);
  }

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(spec.x, spec.y, spec.z);
  if (spec.rz) mesh.rotation.z = spec.rz;
  if (spec.sx !== undefined || spec.sy !== undefined || spec.sz !== undefined) {
    mesh.scale.set(spec.sx ?? 1, spec.sy ?? 1, spec.sz ?? 1);
  }
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export const SHOTS: Shot[] = [
  {
    id: 1, a: 0, b: 276, light: 'day', bgColor: '#87ceeb', fogColor: '#b0c4de', fogNear: 20, fogFar: 80,
    camPos: [-2, 0, -5], camLook: [0, 2, 3], fov: 50,
    chars: [
      { x: -1, y: 0, z: -3, outfit: { jacket: '#e2453c', pants: '#2a2a3a', boots: '#241726', hat: 'beanie', hair: '#8b4513', build: 'kid' }, skinIndex: 0, expr: 'nervous', side: false, mirror: false, scale: 1.0, yaw: 0, phase: 0 },
    ],
    props: [
      { kit: 'tuning_fork', x: 0, y: 0.2, z: -1, rz: 0.3, sx: 0.5, sy: 2, sz: 0.5, color: '#e2453c' },
      { kit: 'sphere', x: 2, y: 4, z: 0, sx: 1.5, sy: 1.5, sz: 1.5, color: '#FF4444' },
    ],
  },
  {
    id: 2, a: 276, b: 375, light: 'day', bgColor: '#87ceeb', fogColor: '#b0c4de', fogNear: 15, fogFar: 60,
    camPos: [0, 5, 18], camLook: [0, 3, 0], fov: 48,
    chars: [
      { x: 0, y: 0, z: -8, outfit: { jacket: '#E2453C', pants: '#2a2a3a', boots: '#241726', hat: 'beanie', hair: '#8b4513', build: 'kid' }, skinIndex: 0, expr: 'neutral', side: false, mirror: false, scale: 1.0, yaw: 0, phase: 0 },
    ],
    props: [
      { kit: 'sphere', x: 0, y: 4, z: -5, sx: 1.8, sy: 1.8, sz: 1.8, color: '#ffcc00' },
    ],
  },
  {
    id: 3, a: 375, b: 546, light: 'day', bgColor: '#2a2a4a', fogColor: '#4a4a6a', fogNear: 15, fogFar: 60,
    camPos: [-5, 2, 14], camLook: [0, 2, 0], fov: 50,
    chars: [
      { x: 0, y: 0, z: -5, outfit: { jacket: '#E2453C', pants: '#2a2a3a', boots: '#241726', hat: 'beanie', hair: '#8b4513', build: 'kid' }, skinIndex: 0, expr: 'shock', side: false, mirror: false, scale: 1.0, yaw: 0, phase: 0 },
    ],
    props: [
      { kit: 'sphere', x: 0, y: 3, z: -3, sx: 2, sy: 2, sz: 2, color: '#FFDD44' },
      { kit: 'cylinder', x: -2, y: 5, z: -2, sx: 1.5, sy: 1.5, sz: 0.03, color: '#E2453C' },
      { kit: 'cylinder', x: 2, y: 5, z: -2, sx: 1.5, sy: 1.5, sz: 0.04, color: '#4488FF' },
      { kit: 'cylinder', x: 0, y: 7, z: -1, sx: 1, sy: 1, sz: 0.035, color: '#FFDD44' },
    ],
  },
  {
    id: 4, a: 546, b: 599, light: 'day', bgColor: '#87ceeb', fogColor: '#b0c4de', fogNear: 15, fogFar: 60,
    camPos: [0, 5, 18], camLook: [0, 3, 0], fov: 52,
    chars: [
      { x: 0, y: 0, z: -7, outfit: { jacket: '#E2453C', pants: '#2a2a3a', boots: '#241726', hat: 'beanie', hair: '#8b4513', build: 'kid' }, skinIndex: 0, expr: 'dazed', side: false, mirror: false, scale: 1.0, yaw: 0.2, phase: 0 },
    ],
    props: [
      { kit: 'tuning_fork', x: 0, y: 0.2, z: 2, rz: -0.2, sx: 0.5, sy: 1.8, sz: 0.5, color: '#E2453C' },
    ],
  },
  {
    id: 5, a: 599, b: 664, light: 'day', bgColor: '#e9e4ff', fogColor: '#d0d0ff', fogNear: 15, fogFar: 60,
    camPos: [-4, 6, 20], camLook: [0, 3, -5], fov: 50,
    chars: [
      { x: 0, y: 0, z: -6, outfit: { jacket: '#E2453C', pants: '#2a2a3a', boots: '#241726', hat: 'beanie', hair: '#8b4513', build: 'kid' }, skinIndex: 0, expr: 'neutral', side: false, mirror: false, scale: 1.0, yaw: 0, phase: 0 },
    ],
    props: [
      { kit: 'box', x: 0, y: 5, z: -4, sx: 2, sy: 2, sz: 2, color: '#fffbed' },
    ],
  },
  {
    id: 6, a: 664, b: 713, light: 'day', bgColor: '#87ceeb', fogColor: '#b0c4de', fogNear: 15, fogFar: 60,
    camPos: [3, 4, 16], camLook: [2, 1, 0], fov: 48,
    chars: [
      { x: 0, y: 0, z: -5, outfit: { jacket: '#E2453C', pants: '#2a2a3a', boots: '#241726', hat: 'beanie', hair: '#8b4513', build: 'kid' }, skinIndex: 0, expr: 'shock', side: false, mirror: false, scale: 1.0, yaw: -0.3, phase: 0 },
    ],
    props: [
      { kit: 'sphere', x: 0, y: 3, z: -2, sx: 1.2, sy: 1.2, sz: 1.2, color: '#fff' },
    ],
  },
  {
    id: 7, a: 713, b: 826, light: 'day', bgColor: '#87ceeb', fogColor: '#b0c4de', fogNear: 15, fogFar: 60,
    camPos: [2, 5, 20], camLook: [0, 3, 0], fov: 50,
    chars: [
      { x: 0, y: 0, z: -5, outfit: { jacket: '#E2453C', pants: '#2a2a3a', boots: '#241726', hat: 'beanie', hair: '#8b4513', build: 'kid' }, skinIndex: 0, expr: 'nervous', side: true, mirror: true, scale: 1.0, yaw: 0.2, phase: 0 },
    ],
    props: [
      { kit: 'tuning_fork', x: 0, y: 0.2, z: -2, rz: 0.3, sx: 0.5, sy: 1.8, sz: 0.5, color: '#E2453C' },
      { kit: 'sphere', x: -3, y: 5, z: 0, sx: 1.2, sy: 1.2, sz: 1.2, color: '#FF4444' },
      { kit: 'sphere', x: 3, y: 5, z: 2, sx: 1.0, sy: 1.0, sz: 1.0, color: '#4488FF' },
      { kit: 'sphere', x: 0, y: 6, z: 3, sx: 0.9, sy: 0.9, sz: 0.9, color: '#FFDD44' },
    ],
  },
  {
    id: 8, a: 826, b: 899, light: 'golden', bgColor: '#ffd4a0', fogColor: '#ffc080', fogNear: 10, fogFar: 50,
    camPos: [0, 5, 22], camLook: [0, 3, 0], fov: 54,
    chars: [
      { x: 0, y: 0, z: -7, outfit: { jacket: '#E2453C', pants: '#2a2a3a', boots: '#241726', hat: 'beanie', hair: '#8b4513', build: 'kid' }, skinIndex: 0, expr: 'relief_open', side: false, mirror: false, scale: 1.0, yaw: 0, phase: 0.3 },
    ],
    props: [
      { kit: 'sphere', x: 0, y: 4, z: -5, sx: 3, sy: 3, sz: 3, color: '#fff' },
    ],
  },
  {
    id: 9, a: 899, b: 1120, light: 'day', bgColor: '#87ceeb', fogColor: '#b0c4de', fogNear: 15, fogFar: 80,
    camPos: [-2, 0, -5], camLook: [0, 2, 5], fov: 48,
    chars: [
      { x: 0, y: 0, z: -4, outfit: { jacket: '#E2453C', pants: '#2a2a3a', boots: '#241726', hat: 'beanie', hair: '#8b4513', build: 'kid' }, skinIndex: 0, expr: 'relief', side: false, mirror: false, scale: 1.0, yaw: 0, phase: 0 },
    ],
    props: [
      { kit: 'tuning_fork', x: 0, y: 0.2, z: -1, rz: 0.2, sx: 0.5, sy: 2, sz: 0.5, color: '#E2453C' },
    ],
  },
  {
    id: 10, a: 842, b: 867, light: 'day', bgColor: '#87ceeb', fogColor: '#b0c4de', fogNear: 18, fogFar: 70,
    camPos: [-2, 6, 22], camLook: [0, 3, -5], fov: 46,
    chars: [
      { x: 0, y: 0, z: -6, outfit: { jacket: '#E2453C', pants: '#2a2a3a', boots: '#241726', hat: 'beanie', hair: '#8b4513', build: 'adult' }, skinIndex: 1, expr: 'neutral', side: false, mirror: false, scale: 0.9, yaw: 0, phase: 0 },
    ],
    props: [
      { kit: 'sphere', x: 0, y: 5, z: -3, sx: 2, sy: 2, sz: 2, color: '#FF6A5A' },
    ],
  },
  {
    id: 11, a: 898, b: 925, light: 'day', bgColor: '#87ceeb', fogColor: '#b0c4de', fogNear: 15, fogFar: 60,
    camPos: [3, 6, 20], camLook: [2, 1, 0], fov: 50,
    chars: [
      { x: 0, y: 0, z: -4, outfit: { jacket: '#E2453C', pants: '#2a2a3a', boots: '#241726', hat: 'beanie', hair: '#8b4513', build: 'kid' }, skinIndex: 0, expr: 'shock', side: false, mirror: false, scale: 1.0, yaw: -0.3, phase: 0 },
    ],
    props: [
      { kit: 'tuning_fork', x: 0, y: 0.2, z: -1, rz: -0.3, sx: 0.5, sy: 1.8, sz: 0.5, color: '#E2453C' },
    ],
  },
];

// Scene geometry helpers
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

// Character renderer
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
    tilt: 0,
  };

  bodyFront(pen, char.outfit, opts);
  ctx.restore();
}

// Inner scene component
const Inner: React.FC<{ shot: Shot }> = ({ shot }) => {
  const f = useCurrentFrame();
  const { camera, scene: threeScene } = useThree();
  const actorsRef = useRef<Map<string, THREE.Sprite>>(new Map());
  const propsRef = useRef<THREE.Mesh[]>([]);
  const world = useMemo(() => makeWorld(), []);
  const cam = camera as THREE.PerspectiveCamera;

  // Subtle camera breathing
  const breatheX = Math.sin(f * 0.018) * 0.4;
  const breatheY = Math.cos(f * 0.014) * 0.2;

  cam.position.set(shot.camPos[0] + breatheX, shot.camPos[1] + breatheY, shot.camPos[2]);
  cam.lookAt(new THREE.Vector3(...shot.camLook));
  cam.fov = shot.fov + Math.sin(f * 0.025) * 0.6;
  cam.updateProjectionMatrix();

  // Sky + fog
  const skyColor = shot.light === 'golden' ? '#ffd4a0' : shot.bgColor;
  threeScene.background = new THREE.Color(skyColor);
  threeScene.fog = new THREE.Fog(skyColor, shot.fogNear, shot.fogFar);

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

  // Add props for this shot
  if (shot.props && propsRef.current.length === 0) {
    for (const spec of shot.props) {
      const mesh = makeProp(shot, spec);
      if (mesh) {
        threeScene.add(mesh);
        propsRef.current.push(mesh);
      }
    }
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

// Main composition — no post-processing for headless render stability
const ShotView: React.FC<{ shot: Shot; alpha: number }> = ({ shot, alpha }) => (
  <AbsoluteFill style={{ opacity: alpha }}>
    <ThreeCanvas shadows gl={{ antialias: false, stencil: false, powerPreference: 'high-performance', toneMappingExposure: 1.0 }}
      camera={{ fov: shot.fov, near: 0.2, far: 1500 }}>
      <Inner shot={shot} />
    </ThreeCanvas>
  </AbsoluteFill>
);

export const colorSounds: React.FC = () => {
  const f = useCurrentFrame();
  const shot = SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
  return (
    <AbsoluteFill style={{ background: shot.light === 'golden' ? '#ffd4a0' : shot.bgColor }}>
      <ShotView shot={shot} alpha={1} />
    </AbsoluteFill>
  );
};

colorSounds.displayName = 'colorSounds';