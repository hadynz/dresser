import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Edges, Environment, Lightformer, OrbitControls } from '@react-three/drei';
import type { Design } from '../model/design';
import type { Anim, Build, Part } from '../model/build';
import { FIXED_MATERIALS, bodyMaterial } from './materials';
import type { T } from '../i18n';

export type ViewMode = 'closed' | 'open' | 'interior';

const M = 0.01; // model is in cm, scene in metres
const ACCENT = '#e08a3c';

const THEMES = {
  light: { bg: '#f3efe8', floor: '#e2dacd', wall: '#f1ece4', edge: '#5c4f43', hemi: 0.9, sun: 1.8, env: '#efe9e0' },
  dark: { bg: '#1c1a18', floor: '#2b2824', wall: '#252220', edge: '#14110e', hemi: 0.45, sun: 1.2, env: '#5a544d' },
};

function PartMesh({ p, body, edge, offset = [0, 0, 0] }: { p: Part; body: THREE.Material; edge: string; offset?: number[] }) {
  const material = p.finish === 'body' ? body : FIXED_MATERIALS[p.finish];
  const pos: [number, number, number] = [(p.pos[0] - offset[0]) * M, (p.pos[1] - offset[1]) * M, (p.pos[2] - offset[2]) * M];
  const [sx, sy, sz] = p.size.map((v) => v * M);
  const userData = { section: p.section };
  if (p.shape === 'rodX') {
    return (
      <mesh position={pos} rotation={[0, 0, Math.PI / 2]} material={material} castShadow userData={userData}>
        <cylinderGeometry args={[sy / 2, sy / 2, sx, 16]} />
      </mesh>
    );
  }
  if (p.shape === 'sphere') {
    return (
      <mesh position={pos} material={material} castShadow userData={userData}>
        <sphereGeometry args={[sx / 2, 16, 12]} />
      </mesh>
    );
  }
  const outline = p.finish !== 'metal' && p.finish !== 'dark' && p.finish !== 'led';
  return (
    <mesh position={pos} material={material} castShadow={p.finish !== 'led'} receiveShadow userData={userData}>
      <boxGeometry args={[sx, sy, sz]} />
      {outline && <Edges threshold={20} color={edge} />}
    </mesh>
  );
}

// A set of parts that open together (a door leaf or a drawer).
function Moving(props: { anim: Anim; parts: Part[]; body: THREE.Material; edge: string; mode: ViewMode; selected: number | null }) {
  const { anim, parts, body, edge, mode, selected } = props;
  const ref = useRef<THREE.Group>(null);
  const progress = useRef(0);
  const open = mode === 'open' || (anim.door && anim.section === selected);
  useFrame((_, dt) => {
    progress.current += ((open ? 1 : 0) - progress.current) * Math.min(1, dt * 6);
    const g = ref.current;
    if (!g) return;
    const k = progress.current;
    if (anim.type === 'hinge') g.rotation.y = anim.angle * k;
    else g.position.set(anim.offset[0] * M * k, anim.offset[1] * M * k, anim.offset[2] * M * k);
  });
  if (anim.door && mode === 'interior') return null;
  if (anim.type === 'hinge') {
    const pv = anim.pivot;
    return (
      <group position={[pv[0] * M, 0, pv[2] * M]}>
        <group ref={ref}>
          {parts.map((p, i) => <PartMesh key={i} p={p} body={body} edge={edge} offset={[pv[0], 0, pv[2]]} />)}
        </group>
      </group>
    );
  }
  return <group ref={ref}>{parts.map((p, i) => <PartMesh key={i} p={p} body={body} edge={edge} />)}</group>;
}

function Wardrobe(props: {
  design: Design; build: Build; mode: ViewMode; showClothes: boolean; selected: number | null; edge: string;
  onSelect: (i: number) => void;
}) {
  const { design, build, mode, showClothes, selected, edge, onSelect } = props;
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

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return; // a drag to rotate, not a tap
    const hit = e.intersections.find((x) => typeof x.object.userData.section === 'number');
    if (!hit) return;
    e.stopPropagation();
    onSelect(hit.object.userData.section);
  };

  const sel = selected !== null ? build.boxes[selected] : null;
  return (
    <group onClick={onClick}>
      {fixed.map((p, i) => <PartMesh key={i} p={p} body={body} edge={edge} />)}
      {[...groups].map(([key, parts]) => (
        <Moving key={key} anim={build.anims[key]} parts={parts} body={body} edge={edge} mode={mode} selected={selected} />
      ))}
      {showClothes &&
        build.garments.map((g, i) => (
          <mesh key={i} position={g.pos.map((v) => v * M) as [number, number, number]} castShadow userData={{ section: g.section }}>
            <boxGeometry args={g.size.map((v) => v * M) as [number, number, number]} />
            <meshStandardMaterial color={g.color} roughness={1} />
          </mesh>
        ))}
      {build.lights.map((l, i) => {
        const on = mode !== 'closed' || l.section === selected;
        return <pointLight key={i} position={l.pos.map((v) => v * M) as [number, number, number]} intensity={on ? 1.6 : 0} distance={1.8} decay={2} color="#ffdca8" />;
      })}
      {sel && (
        <mesh position={[((sel.x0 + sel.x1) / 2) * M, (build.totalHeight / 2) * M, 0]} raycast={() => null}>
          <boxGeometry args={[(sel.x1 - sel.x0 + 1) * M, (build.totalHeight + 1) * M, (design.depth + 1) * M]} />
          <meshBasicMaterial color={ACCENT} transparent opacity={0.07} depthWrite={false} />
          <Edges color={ACCENT} />
        </mesh>
      )}
    </group>
  );
}

interface Label { pos: [number, number, number]; text: string; section?: number }

function sceneLabels(design: Design, build: Build, t: T, showDims: boolean): Label[] {
  const W = build.width;
  const H = build.totalHeight;
  const D = design.depth;
  const cm = (v: number) => `${t.num(v)} ${t.t('cm')}`;
  const badges: Label[] = build.boxes.map((b, i) => ({
    pos: [((b.x0 + b.x1) / 2) * M, 4 * M, (D / 2 + 2) * M], text: t.num(i + 1), section: i,
  }));
  if (!showDims) return badges;
  return [
    { pos: [0, (H + 10) * M, (D / 2) * M], text: `${t.t('width')}: ${cm(W)}` },
    { pos: [(W / 2 + 14) * M, (H / 2) * M, (D / 2) * M], text: `${t.t('height')}: ${cm(H)}` },
    { pos: [(W / 2 + 10) * M, 2 * M, 0], text: `${t.t('depth')}: ${cm(D)}` },
    ...badges,
  ];
}

// Projects 3D label anchors to screen space each frame and moves plain DOM labels there.
function LabelTracker({ labels, els }: { labels: Label[]; els: React.RefObject<(HTMLElement | null)[]> }) {
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
function CameraFit({ build, fitKey }: { build: Build; fitKey: number }) {
  const { camera, controls, size } = useThree() as unknown as {
    camera: THREE.PerspectiveCamera; controls: { target: THREE.Vector3; update(): void } | null; size: { width: number; height: number };
  };
  useEffect(() => {
    const W = build.width * M;
    const H = build.totalHeight * M;
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
  selected: number | null; onSelect: (i: number | null) => void; dark: boolean;
}) {
  const { design, build, mode, showDims, showClothes, fitKey, t, selected, onSelect, dark } = props;
  const theme = dark ? THEMES.dark : THEMES.light;
  const wallZ = (-design.depth / 2 - 1) * M;
  const labels = sceneLabels(design, build, t, showDims);
  const labelEls = useRef<(HTMLElement | null)[]>([]);
  const down = useRef<{ x: number; y: number } | null>(null);

  return (
    <div className="scene" onPointerDown={(e) => { down.current = { x: e.clientX, y: e.clientY }; }}>
      <Canvas
        shadows dpr={[1, 2]} camera={{ fov: 35, near: 0.05, far: 50, position: [2, 1.5, 5] }}
        onPointerMissed={(e) => {
          const d = down.current;
          if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) return; // rotated, didn't tap
          onSelect(null);
        }}
      >
        <color attach="background" args={[theme.bg]} />
        <hemisphereLight args={['#ffffff', '#d9cfc0', theme.hemi]} />
        <directionalLight
          position={[2.5, 4, 3.5]} intensity={theme.sun} castShadow shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-3} shadow-camera-right={3} shadow-camera-top={3} shadow-camera-bottom={-1} shadow-bias={-0.0004}
        />
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" intensity={2} position={[0, 3, 2]} scale={[6, 2, 1]} />
          <Lightformer form="rect" intensity={1} color="#ffe9cf" position={[-4, 1, 0]} rotation-y={Math.PI / 2} scale={[4, 3, 1]} />
          <Lightformer form="rect" intensity={0.6} color="#cfe3ff" position={[4, 1, 2]} rotation-y={-Math.PI / 2} scale={[4, 3, 1]} />
          <mesh scale={20}><sphereGeometry /><meshBasicMaterial color={theme.env} side={THREE.BackSide} /></mesh>
          <mesh position={[0, -1.2, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[40, 40]} /><meshBasicMaterial color="#8c8174" /></mesh>
        </Environment>
        <Wardrobe
          design={design} build={build} mode={mode} showClothes={showClothes} selected={selected} edge={theme.edge}
          onSelect={onSelect}
        />
        <mesh rotation-x={-Math.PI / 2} receiveShadow>
          <planeGeometry args={[30, 30]} />
          <meshStandardMaterial color={theme.floor} roughness={0.95} />
        </mesh>
        <mesh position={[0, 1.6, wallZ]} receiveShadow>
          <planeGeometry args={[30, 3.2]} />
          <meshStandardMaterial color={theme.wall} roughness={1} />
        </mesh>
        <OrbitControls makeDefault enableDamping maxPolarAngle={Math.PI / 2 - 0.04} minDistance={0.8} maxDistance={9} />
        <CameraFit build={build} fitKey={fitKey} />
        <LabelTracker labels={labels} els={labelEls} />
      </Canvas>
      {labels.map((l, i) =>
        l.section === undefined ? (
          <div key={i} className="dim" ref={(el) => { labelEls.current[i] = el; }}>{l.text}</div>
        ) : (
          <button
            key={i} type="button" ref={(el) => { labelEls.current[i] = el; }}
            className={selected === l.section ? 'badge on' : 'badge'}
            onClick={() => onSelect(l.section!)} aria-label={t.t('section', { n: l.section + 1 })}
          >
            {l.text}
          </button>
        ),
      )}
    </div>
  );
}
