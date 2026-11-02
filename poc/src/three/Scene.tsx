import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Edges, Environment, Lightformer, OrbitControls } from '@react-three/drei';
import type { Design } from '../model/design';
import type { Anim, Build, Part } from '../model/build';
import { FIXED_MATERIALS, bodyMaterial } from './materials';
import type { T } from '../i18n';

export type ViewMode = 'closed' | 'open' | 'interior';

const M = 0.01; // model is in cm, scene in metres

function PartMesh({ p, body, offset = [0, 0, 0] }: { p: Part; body: THREE.Material; offset?: number[] }) {
  const material = p.finish === 'body' ? body : FIXED_MATERIALS[p.finish];
  const pos: [number, number, number] = [(p.pos[0] - offset[0]) * M, (p.pos[1] - offset[1]) * M, (p.pos[2] - offset[2]) * M];
  const [sx, sy, sz] = p.size.map((v) => v * M);
  if (p.shape === 'rodX') {
    return (
      <mesh position={pos} rotation={[0, 0, Math.PI / 2]} material={material} castShadow>
        <cylinderGeometry args={[sy / 2, sy / 2, sx, 16]} />
      </mesh>
    );
  }
  if (p.shape === 'sphere') {
    return (
      <mesh position={pos} material={material} castShadow>
        <sphereGeometry args={[sx / 2, 16, 12]} />
      </mesh>
    );
  }
  const outline = p.finish !== 'metal' && p.finish !== 'dark';
  return (
    <mesh position={pos} material={material} castShadow receiveShadow>
      <boxGeometry args={[sx, sy, sz]} />
      {outline && <Edges threshold={20} color="#5c4f43" />}
    </mesh>
  );
}

// A set of parts that open together (a door leaf, a drawer, a sliding panel).
function Moving({ anim, parts, body, mode }: { anim: Anim; parts: Part[]; body: THREE.Material; mode: ViewMode }) {
  const ref = useRef<THREE.Group>(null);
  const progress = useRef(0);
  const target = mode === 'open' ? 1 : 0;
  useFrame((_, dt) => {
    progress.current += (target - progress.current) * Math.min(1, dt * 6);
    const g = ref.current;
    if (!g) return;
    const k = progress.current;
    if (anim.type === 'hinge') {
      g.rotation.y = anim.angle * k;
    } else {
      g.position.set(anim.offset[0] * M * k, anim.offset[1] * M * k, anim.offset[2] * M * k);
    }
  });
  if (anim.door && mode === 'interior') return null;
  if (anim.type === 'hinge') {
    const pv = anim.pivot;
    return (
      <group position={[pv[0] * M, 0, pv[2] * M]}>
        <group ref={ref}>
          {parts.map((p, i) => <PartMesh key={i} p={p} body={body} offset={[pv[0], 0, pv[2]]} />)}
        </group>
      </group>
    );
  }
  return <group ref={ref}>{parts.map((p, i) => <PartMesh key={i} p={p} body={body} />)}</group>;
}

function Wardrobe({ design, build, mode, showClothes }: { design: Design; build: Build; mode: ViewMode; showClothes: boolean }) {
  const body = bodyMaterial(design.material);
  const { fixed, groups } = useMemo(() => {
    const fixed: Part[] = [];
    const groups = new Map<string, Part[]>();
    for (const p of build.parts) {
      if (!p.anim) fixed.push(p);
      else groups.set(p.anim, [...(groups.get(p.anim) ?? []), p]);
    }
    return { fixed, groups };
  }, [build]);
  return (
    <group>
      {fixed.map((p, i) => <PartMesh key={i} p={p} body={body} />)}
      {[...groups].map(([key, parts]) => (
        <Moving key={key} anim={build.anims[key]} parts={parts} body={body} mode={mode} />
      ))}
      {showClothes &&
        build.garments.map((g, i) => (
          <mesh key={i} position={g.pos.map((v) => v * M) as [number, number, number]} castShadow>
            <boxGeometry args={g.size.map((v) => v * M) as [number, number, number]} />
            <meshStandardMaterial color={g.color} roughness={1} />
          </mesh>
        ))}
    </group>
  );
}

interface Label { pos: [number, number, number]; text: string }

function dimensionLabels(design: Design, t: T): Label[] {
  const { width: W, height: H, depth: D } = design;
  const cm = (v: number) => `${t.num(v)} ${t.t('cm')}`;
  return [
    { pos: [0, (H + 10) * M, (D / 2) * M], text: `${t.t('width')}: ${cm(W)}` },
    { pos: [(W / 2 + 14) * M, (H / 2) * M, (D / 2) * M], text: `${t.t('height')}: ${cm(H)}` },
    { pos: [(W / 2 + 10) * M, 2 * M, 0], text: `${t.t('depth')}: ${cm(D)}` },
  ];
}

// Projects 3D label anchors to screen space each frame and moves plain DOM labels there.
function LabelTracker({ labels, els }: { labels: Label[]; els: React.RefObject<(HTMLDivElement | null)[]> }) {
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }) => {
    labels.forEach((l, i) => {
      const el = els.current[i];
      if (!el) return;
      v.set(...l.pos).project(camera);
      el.style.transform = `translate(-50%, -50%) translate(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px)`;
      el.style.visibility = v.z < 1 ? 'visible' : 'hidden';
    });
  });
  return null;
}

// Re-frames the camera when a new starter design is loaded (not on every tweak).
function CameraFit({ design, fitKey }: { design: Design; fitKey: number }) {
  const { camera, controls, size } = useThree() as unknown as {
    camera: THREE.PerspectiveCamera; controls: { target: THREE.Vector3; update(): void } | null; size: { width: number; height: number };
  };
  useEffect(() => {
    const W = design.width * M;
    const H = design.height * M;
    const portrait = size.height > size.width;
    const dist = Math.max(W * (portrait ? 1.6 : 1), H) * 2.1 + 0.6;
    camera.position.set(dist * 0.42, H * 0.62, dist);
    controls?.target.set(0, H * 0.48, 0);
    controls?.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, controls]);
  return null;
}

export function Scene(props: {
  design: Design; build: Build; mode: ViewMode; showDims: boolean; showClothes: boolean; fitKey: number; t: T;
}) {
  const { design, build, mode, showDims, showClothes, fitKey, t } = props;
  const wallZ = (-design.depth / 2 - 1) * M;
  const labels = showDims ? dimensionLabels(design, t) : [];
  const labelEls = useRef<(HTMLDivElement | null)[]>([]);
  return (
    <div className="scene">
    <Canvas shadows dpr={[1, 2]} camera={{ fov: 35, near: 0.05, far: 50, position: [2, 1.5, 5] }}>
      <color attach="background" args={['#f3efe8']} />
      <hemisphereLight args={['#ffffff', '#d9cfc0', 0.9]} />
      <directionalLight
        position={[2.5, 4, 3.5]} intensity={1.8} castShadow shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-3} shadow-camera-right={3} shadow-camera-top={3} shadow-camera-bottom={-1} shadow-bias={-0.0004}
      />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2} position={[0, 3, 2]} scale={[6, 2, 1]} />
        <Lightformer form="rect" intensity={1} color="#ffe9cf" position={[-4, 1, 0]} rotation-y={Math.PI / 2} scale={[4, 3, 1]} />
        <Lightformer form="rect" intensity={0.6} color="#cfe3ff" position={[4, 1, 2]} rotation-y={-Math.PI / 2} scale={[4, 3, 1]} />
        <mesh scale={20}><sphereGeometry /><meshBasicMaterial color="#efe9e0" side={THREE.BackSide} /></mesh>
        <mesh position={[0, -1.2, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[40, 40]} /><meshBasicMaterial color="#8c8174" /></mesh>
      </Environment>
      <Wardrobe design={design} build={build} mode={mode} showClothes={showClothes} />
      <LabelTracker labels={labels} els={labelEls} />
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#e2dacd" roughness={0.95} />
      </mesh>
      <mesh position={[0, 1.6, wallZ]} receiveShadow>
        <planeGeometry args={[30, 3.2]} />
        <meshStandardMaterial color="#f1ece4" roughness={1} />
      </mesh>
      <OrbitControls makeDefault enableDamping maxPolarAngle={Math.PI / 2 - 0.04} minDistance={0.8} maxDistance={9} />
      <CameraFit design={design} fitKey={fitKey} />
    </Canvas>
      {labels.map((l, i) => (
        <div key={i} className="dim" ref={(el) => { labelEls.current[i] = el; }}>{l.text}</div>
      ))}
    </div>
  );
}
