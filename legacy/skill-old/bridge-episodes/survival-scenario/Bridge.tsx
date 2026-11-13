// ============================================================
// Survival Scenario Choice Shorts — "Would You Survive?"
//
// Interactive-choice survival scenario rendered with the
// bridge Three.js pipeline. 30 s, 4 scenes showing different
// survival environments with character reactions.
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

// ─── Scene definitions ─────────────────────────────────────
interface Scene {
  id: number;
  a: number;
  b: number;
  light: 'day' | 'golden' | 'night';
  bgColor: string;
  fogColor: string;
  fogNear: number;
  fogFar: number;
  camPos: [number, number, number];
  camLook: [number, number, number];
  fov: number;
  chars: CharSpec[];
  scenery: SceneryItem[];
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
}

interface SceneryItem {
  type: 'tree' | 'rock' | 'fire' | 'tent' | 'water' | 'snow' | 'desert';
  x: number; y: number; z: number;
  scale: number;
  color?: string;
}

export const FPS = 30;
export const TOTAL = 900; // 30 s at 30 fps

export const SCENES: Scene[] = [
  {
    id: 1, a: 0, b: 225, light: 'day', bgColor: '#87ceeb', fogColor: '#b0c4de', fogNear: 15, fogFar: 60,
    camPos: [0, 5, 15], camLook: [0, 2, -5], fov: 50,
    chars: [
      { x: 0, y: 0, z: -3, outfit: { jacket: '#5a7a3a', pants: '#4a5a2a', boots: '#3a2a1a', hat: 'cowboy', build: 'adult' }, skinIndex: 0, expr: 'stern', side: false, mirror: false, scale: 1.0, yaw: 0 },
    ],
    scenery: [
      { type: 'tree', x: -6, y: 0, z: -8, scale: 1.2, color: '#2d5a1e' },
      { type: 'tree', x: 7, y: 0, z: -10, scale: 1.0, color: '#3a6b2a' },
      { type: 'rock', x: -4, y: 0.3, z: -6, scale: 0.8 },
      { type: 'water', x: 5, y: -0.2, z: -12, scale: 2.0 },
    ],
  },
  {
    id: 2, a: 225, b: 450, light: 'golden', bgColor: '#ffb347', fogColor: '#ffd700', fogNear: 10, fogFar: 50,
    camPos: [-8, 4, 12], camLook: [2, 1, -5], fov: 45,
    chars: [
      { x: 1, y: 0, z: -4, outfit: { jacket: '#8b4513', pants: '#654321', boots: '#3a2a1a', hat: null, hair: '#8b4513', build: 'adult' }, skinIndex: 1, expr: 'nervous', side: true, mirror: false, scale: 1.0, yaw: -0.3 },
      { x: -2, y: 0, z: -5, outfit: { jacket: '#a0522d', pants: '#6b4226', boots: '#3a2a1a', hat: 'bandana', build: 'stout' }, skinIndex: 2, expr: 'grin', side: false, mirror: false, scale: 0.95, yaw: 0.2 },
    ],
    scenery: [
      { type: 'fire', x: 0, y: 0.3, z: -3, scale: 1.5 },
      { type: 'rock', x: -5, y: 0.5, z: -8, scale: 1.0 },
      { type: 'tree', x: 8, y: 0, z: -15, scale: 0.8, color: '#8b6914' },
    ],
  },
  {
    id: 3, a: 450, b: 675, light: 'day', bgColor: '#e0f0ff', fogColor: '#c8e6ff', fogNear: 20, fogFar: 80,
    camPos: [0, 6, 18], camLook: [0, 1, -10], fov: 55,
    chars: [
      { x: -1, y: 0, z: -6, outfit: { jacket: '#1a3a5a', pants: '#2a4a6a', boots: '#1a2a3a', hat: 'hood', build: 'adult' }, skinIndex: 0, expr: 'dazed', side: false, mirror: false, scale: 1.0, yaw: 0 },
    ],
    scenery: [
      { type: 'snow', x: 0, y: -0.1, z: -10, scale: 1.0 },
      { type: 'tree', x: -7, y: 0, z: -12, scale: 1.3, color: '#2a4a2a' },
      { type: 'tree', x: 6, y: 0, z: -14, scale: 1.1, color: '#3a5a3a' },
      { type: 'rock', x: -3, y: 0.4, z: -8, scale: 0.9 },
    ],
  },
  {
    id: 4, a: 675, b: 900, light: 'night', bgColor: '#0a0a1a', fogColor: '#1a1a2e', fogNear: 8, fogFar: 40,
    camPos: [5, 4, 10], camLook: [-2, 2, -8], fov: 40,
    chars: [
      { x: -1, y: 0, z: -5, outfit: { jacket: '#2a2a3a', pants: '#1a1a2a', boots: '#0a0a1a', hat: 'beanie', hair: '#1a1a1a', build: 'adult' }, skinIndex: 3, expr: 'shock', side: true, mirror: true, scale: 1.0, yaw: 0.4 },
      { x: 2, y: 0, z: -6, outfit: { jacket: '#3a3a4a', pants: '#2a2a3a', boots: '#1a1a2a', hat: 'cap', build: 'kid' }, skinIndex: 1, expr: 'dazed', side: false, mirror: false, scale: 0.8, yaw: -0.2 },
    ],
    scenery: [
      { type: 'tent', x: 0, y: 0, z: -10, scale: 1.5 },
      { type: 'fire', x: 3, y: 0.2, z: -8, scale: 1.0 },
      { type: 'tree', x: -8, y: 0, z: -15, scale: 1.4, color: '#0a1a0a' },
      { type: 'tree', x: 9, y: 0, z: -14, scale: 1.2, color: '#0a1a0a' },
    ],
  },
];

// ─── Scene builder ──────────────────────────────────────────
function buildScenery(scene: Scene): THREE.Group {
  const group = new THREE.Group();

  for (const item of scene.scenery) {
    switch (item.type) {
      case 'tree': {
        const trunkMat = lam(`trunk_${item.x}_${item.z}`, () => ({ color: item.color ?? '#5a3a1a' }));
        const leavesMat = lam(`leaves_${item.x}_${item.z}`, () => ({ color: item.color ?? '#2d5a1e' }));
        const trunkGeo = boxGeo(
          new THREE.Vector3(item.x - 0.2, item.y, item.z - 0.2),
          new THREE.Vector3(item.x + 0.2, item.y + 2 * item.scale, item.z + 0.2),
        );
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.castShadow = true;
        group.add(trunk);
        const canopyGeo = boxGeo(
          new THREE.Vector3(item.x - 1.5 * item.scale, item.y + 2 * item.scale, item.z - 1.5 * item.scale),
          new THREE.Vector3(item.x + 1.5 * item.scale, item.y + 4.5 * item.scale, item.z + 1.5 * item.scale),
        );
        const canopy = new THREE.Mesh(canopyGeo, leavesMat);
        canopy.castShadow = true;
        group.add(canopy);
        break;
      }
      case 'rock': {
        const rockMat = lam(`rock_${item.x}_${item.z}`, () => ({ color: '#6a6a6a' }));
        const rockGeo = boxGeo(
          new THREE.Vector3(item.x - item.scale, item.y, item.z - item.scale),
          new THREE.Vector3(item.x + item.scale, item.y + item.scale * 1.5, item.z + item.scale),
        );
        const rock = new THREE.Mesh(rockGeo, rockMat);
        rock.castShadow = true;
        rock.receiveShadow = true;
        group.add(rock);
        break;
      }
      case 'fire': {
        const fireMat = lam(`fire_${item.x}_${item.z}`, () => ({ color: '#ff6600', emissive: '#ff4400', emissiveIntensity: 0.5 }));
        const fireGeo = boxGeo(
          new THREE.Vector3(item.x - item.scale, item.y, item.z - item.scale),
          new THREE.Vector3(item.x + item.scale, item.y + item.scale * 2, item.z + item.scale),
        );
        const fire = new THREE.Mesh(fireGeo, fireMat);
        group.add(fire);
        const fireLight = new THREE.PointLight(0xff6600, 2, 10);
        fireLight.position.set(item.x, item.y + 1, item.z);
        group.add(fireLight);
        break;
      }
      case 'tent': {
        const tentMat = lam(`tent_${item.x}_${item.z}`, () => ({ color: '#8b7355' }));
        const tentGeo = boxGeo(
          new THREE.Vector3(item.x - item.scale, item.y, item.z - item.scale),
          new THREE.Vector3(item.x + item.scale, item.y + item.scale * 1.5, item.z + item.scale * 2),
        );
        const tent = new THREE.Mesh(tentGeo, tentMat);
        tent.castShadow = true;
        group.add(tent);
        break;
      }
      case 'water': {
        const waterMat = lam(`water_${item.x}_${item.z}`, () => ({ color: '#4a90d9', transparent: true, opacity: 0.7 }));
        const waterGeo = boxGeo(
          new THREE.Vector3(item.x - item.scale * 2, item.y - 0.1, item.z - item.scale * 2),
          new THREE.Vector3(item.x + item.scale * 2, item.y + 0.1, item.z + item.scale * 2),
        );
        const water = new THREE.Mesh(waterGeo, waterMat);
        water.receiveShadow = true;
        group.add(water);
        break;
      }
      case 'snow': {
        const snowMat = lam(`snow_${item.x}_${item.z}`, () => ({ color: '#f0f8ff' }));
        const snowGeo = boxGeo(
          new THREE.Vector3(item.x - 5, item.y - 0.1, item.z - 5),
          new THREE.Vector3(item.x + 5, item.y + 0.2, item.z + 5),
        );
        const snow = new THREE.Mesh(snowGeo, snowMat);
        snow.receiveShadow = true;
        group.add(snow);
        break;
      }
      case 'desert': {
        const sandMat = lam(`sand_${item.x}_${item.z}`, () => ({ color: '#e8c87a' }));
        const sandGeo = boxGeo(
          new THREE.Vector3(item.x - 5, item.y - 0.1, item.z - 5),
          new THREE.Vector3(item.x + 5, item.y + 0.3, item.z + 5),
        );
        const sand = new THREE.Mesh(sandGeo, sandMat);
        sand.receiveShadow = true;
        group.add(sand);
        break;
      }
    }
  }

  return group;
}

// ─── Character renderer ─────────────────────────────────────
function renderCharacter(canvas: HTMLCanvasElement, char: CharSpec, lightAngle: number, frame: number): void {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  ctx.save();
  ctx.setTransform(w / 600, 0, 0, h / 1000, 0, 0);

  const opts: Parameters<typeof bodyFront>[2] = {
    expr: char.expr,
    light: lightAngle,
    facing: char.side ? (char.mirror ? -1 : 1) : 0,
    seed: char.x * 100 + char.z * 7 + char.skinIndex * 13,
    phase: frame * 0.02,
    blink: Math.sin(frame * 0.1 + char.x * 50) > 0.97,
    mode: 'stand' as const,
  };

  bodyFront(ctx as unknown as Pen, char.outfit, opts);
  ctx.restore();
}

// ─── Inner scene component ──────────────────────────────────
const Inner: React.FC<{ scene: Scene }> = ({ scene }) => {
  const f = useCurrentFrame();
  const { camera, scene: threeScene } = useThree();
  const sceneryRef = useRef<THREE.Group | null>(null);
  const actorsRef = useRef<Map<string, THREE.Sprite>>(new Map());
  const cam = camera as THREE.PerspectiveCamera;

  // Subtle camera breathing
  const breatheX = Math.sin(f * 0.015) * 0.3;
  const breatheY = Math.cos(f * 0.012) * 0.15;

  cam.position.set(scene.camPos[0] + breatheX, scene.camPos[1] + breatheY, scene.camPos[2]);
  cam.lookAt(new THREE.Vector3(...scene.camLook));
  cam.fov = scene.fov + Math.sin(f * 0.02) * 0.5;
  cam.updateProjectionMatrix();

  // Update scene background/fog
  threeScene.background = new THREE.Color(scene.bgColor);
  threeScene.fog = new THREE.Fog(scene.fogColor, scene.fogNear, scene.fogFar);

  // Update lighting
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

  const lookTarget = new THREE.Vector3(...scene.camLook);
  dirLight.position.copy(lookTarget).add(sunDir.multiplyScalar(200));
  dirLight.target.position.copy(lookTarget);
  dirLight.target.updateMatrixWorld();

  // Light angle for character shading
  const lightAngle = Math.atan2(
    -sunDir.y,
    sunDir.x * cam.matrixWorld.elements[0] + sunDir.z * cam.matrixWorld.elements[2]
  );

  // Manage scenery (only rebuild when scene changes)
  if (!sceneryRef.current || !threeScene.children.includes(sceneryRef.current)) {
    if (sceneryRef.current) threeScene.remove(sceneryRef.current);
    sceneryRef.current = buildScenery(scene);
    threeScene.add(sceneryRef.current);
  }

  // Animate fire flicker
  threeScene.traverse((child) => {
    if (child instanceof THREE.PointLight && child.color.getHex() === 0xff6600) {
      child.intensity = 1.5 + Math.sin(f * 0.3) * 0.5 + Math.sin(f * 0.47) * 0.3;
    }
  });

  // Manage character sprites
  const charKeys = new Set<string>();
  for (const char of scene.chars) {
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

  // Remove sprites no longer in use
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
const PostFX: React.FC<{ scene: Scene }> = ({ scene }) => {
  const f = useCurrentFrame();
  const { camera } = useThree();
  const pc = camera as THREE.PerspectiveCamera;

  const gradeKey = scene.light === 'night' ? ('day' as const) : scene.light;
  const fx = useMemo(() => ({
    lens: new LensBlur({ maxCoC: 15, nearScale: 1.2 }),
    bloom: new BloomEffect({
      blendFunction: BlendFunction.ADD,
      intensity: 0.3,
      luminanceThreshold: 1.0,
      luminanceSmoothing: 0.2,
      mipmapBlur: true,
      levels: 4,
      radius: 0.4,
    }),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(
      GRADES[gradeKey],
      scene.light === 'night' ? 0.6 : GRADE_STRENGTH[gradeKey],
    ),
    grain: new GrainEffect({ amount: 0.015, cellPx: 1.5 }),
  }), [scene]);

  useEffect(() => () => {
    fx.lens.dispose?.();
    fx.bloom.dispose?.();
    fx.tone.dispose?.();
    fx.grade.dispose?.();
    fx.grain.dispose?.();
  }, [fx]);

  const focusPoint = new THREE.Vector3(...scene.camLook);
  const focusDist = pc.position.distanceTo(focusPoint);
  fx.lens.focus = Math.max(0.3, focusDist);
  fx.lens.cInf = scene.id === 2 || scene.id === 4 ? 10 : 0;
  gradeFor(fx.grade, gradeKey);
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
const SceneView: React.FC<{ scene: Scene; alpha: number }> = ({ scene, alpha }) => (
  <AbsoluteFill style={{ opacity: alpha }}>
    <ThreeCanvas shadows gl={{ antialias: false, stencil: false, powerPreference: 'high-performance', toneMappingExposure: 1.0 }}
      camera={{ fov: scene.fov, near: 0.2, far: 1500 }}>
      <Inner scene={scene} />
      <PostFX scene={scene} />
    </ThreeCanvas>
  </AbsoluteFill>
);

export const SurvivalScenario: React.FC = () => {
  const f = useCurrentFrame();
  const scene = SCENES.find((s) => f >= s.a && f < s.b) ?? SCENES[SCENES.length - 1];

  return (
    <AbsoluteFill>
      <SceneView scene={scene} alpha={1} />
    </AbsoluteFill>
  );
};

SurvivalScenario.displayName = 'SurvivalScenario';
