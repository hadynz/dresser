import * as THREE from 'three';
import type { MaterialId } from '../model/design';

interface Swatch { color: string; grain?: string }

export const SWATCHES: Record<MaterialId, Swatch> = {
  oak: { color: '#c9a277', grain: '#a07a50' },
  beech: { color: '#e2b993', grain: '#bd8f66' },
  walnut: { color: '#6e4a33', grain: '#43291a' },
  white: { color: '#f3f1ec' },
  cream: { color: '#e8dcc4' },
  sage: { color: '#9caa90' },
  charcoal: { color: '#3d3e42' },
};

// Procedural wood grain, so the POC needs no image assets.
function woodTexture(base: string, grain: string): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 90; i++) {
    const x0 = rnd() * size;
    const amp = 2 + rnd() * 10;
    const freq = 0.004 + rnd() * 0.01;
    const phase = rnd() * 10;
    g.strokeStyle = grain;
    g.globalAlpha = 0.08 + rnd() * 0.22;
    g.lineWidth = 0.6 + rnd() * 2.2;
    g.beginPath();
    for (let y = 0; y <= size; y += 8) {
      const x = x0 + Math.sin(y * freq + phase) * amp;
      if (y === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const cache = new Map<MaterialId, THREE.Material>();

export function bodyMaterial(id: MaterialId): THREE.Material {
  let m = cache.get(id);
  if (!m) {
    const s = SWATCHES[id];
    m = s.grain
      ? new THREE.MeshStandardMaterial({ map: woodTexture(s.color, s.grain), roughness: 0.65 })
      : new THREE.MeshStandardMaterial({ color: s.color, roughness: 0.55 });
    cache.set(id, m);
  }
  return m;
}

export const FIXED_MATERIALS = {
  back: new THREE.MeshStandardMaterial({ color: '#d8ccb6', roughness: 0.9 }),
  metal: new THREE.MeshStandardMaterial({ color: '#b9bec4', metalness: 0.9, roughness: 0.25 }),
  dark: new THREE.MeshStandardMaterial({ color: '#2a2a2a', roughness: 0.6 }),
  mirror: new THREE.MeshStandardMaterial({ color: '#eef4f7', metalness: 1, roughness: 0.02, envMapIntensity: 1.1 }),
  glass: new THREE.MeshPhysicalMaterial({ color: '#cfe6ec', transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.1, depthWrite: false }),
  frosted: new THREE.MeshStandardMaterial({ color: '#f1f5f6', transparent: true, opacity: 0.8, roughness: 0.95 }),
  led: new THREE.MeshStandardMaterial({ color: '#fff4dc', emissive: '#ffe2a8', emissiveIntensity: 2.2, toneMapped: false }),
};
