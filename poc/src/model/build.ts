// Turns a Design into physical parts. The 3D view, the price and the cut list are all
// derived from this one list, so they always agree.
//
// Coordinates (cm): x = width (0 at centre), y = up from the floor, z = depth (back at -depth/2).
import {
  BACK, DRAWER_H, HAT_GAP, MIN_DOUBLE_HANG, MIN_HANG, MIN_HANG_DEPTH, MIN_SHELF_GAP, PLINTH,
  RAIL_DROP, T, bayInnerWidth, type Design, type DoorFinish,
} from './design';

export type Finish = 'body' | 'back' | 'metal' | 'dark' | 'mirror' | 'glass' | 'frosted';
export type PartKind =
  | 'side' | 'top' | 'bottom' | 'partition' | 'plinth' | 'back' | 'shelf'
  | 'door' | 'doorFrame' | 'mirror' | 'glass'
  | 'drawerFront' | 'drawerSide' | 'drawerBack' | 'drawerBottom'
  | 'rail' | 'handle' | 'track';

export type Vec3 = [number, number, number];

export interface Part {
  kind: PartKind;
  size: Vec3;
  pos: Vec3; // centre
  finish: Finish;
  shape?: 'box' | 'rodX' | 'sphere';
  anim?: string; // key into Build.anims; parts sharing a key move together
  cut: boolean; // appears on the cut list
}

export type Anim =
  | { type: 'hinge'; pivot: Vec3; angle: number; door: true }
  | { type: 'slide'; offset: Vec3; door: boolean };

export interface Garment { pos: Vec3; size: Vec3; color: string }
export interface Warning { key: string; vars: Record<string, number> }

export interface Build {
  parts: Part[];
  anims: Record<string, Anim>;
  garments: Garment[];
  warnings: Warning[];
  leaves: number; // hinged door leaves
}

const GARMENT_COLORS = ['#6d8bb5', '#c9a66b', '#a85d5d', '#8c9c7a', '#d8d2c4', '#4d5a6b', '#b08ea8'];

export function build(d: Design): Build {
  const parts: Part[] = [];
  const anims: Record<string, Anim> = {};
  const garments: Garment[] = [];
  const warnings: Warning[] = [];
  const add = (p: Part) => parts.push(p);

  const { width: W, height: H, depth: D, doorType } = d;
  const n = d.bays.length;
  const frontAllowance = doorType === 'sliding' ? 8 : doorType === 'hinged' ? 2 : 0;
  const carcassDepth = D - frontAllowance;
  const zB = -D / 2;
  const zF = zB + carcassDepth; // carcass front face
  const bodyDepth = carcassDepth - BACK;
  const bodyZ = zF - bodyDepth / 2;
  const inner = bayInnerWidth(W, n);
  const yIn0 = PLINTH + T; // top of the bottom board
  const yIn1 = H - T; // underside of the top board

  // Carcass
  for (const s of [-1, 1]) {
    add({ kind: 'side', size: [T, H, bodyDepth], pos: [s * (W / 2 - T / 2), H / 2, bodyZ], finish: 'body', cut: true });
  }
  add({ kind: 'top', size: [W - 2 * T, T, bodyDepth], pos: [0, H - T / 2, bodyZ], finish: 'body', cut: true });
  add({ kind: 'bottom', size: [W - 2 * T, T, bodyDepth], pos: [0, PLINTH + T / 2, bodyZ], finish: 'body', cut: true });
  add({ kind: 'plinth', size: [W - 2 * T, PLINTH, T], pos: [0, PLINTH / 2, zF - 3 - T / 2], finish: 'body', cut: true });
  add({ kind: 'back', size: [W, H, BACK], pos: [0, H / 2, zB + BACK / 2], finish: 'back', cut: true });
  for (let i = 1; i < n; i++) {
    const x = -W / 2 + i * (inner + T) + T / 2;
    add({ kind: 'partition', size: [T, yIn1 - yIn0, bodyDepth], pos: [x, (yIn0 + yIn1) / 2, bodyZ], finish: 'body', cut: true });
  }

  const hasDoors = doorType !== 'none';
  const shelfD = bodyDepth - 2;
  const shelfZ = zF - 1 - shelfD / 2;

  d.bays.forEach((bay, i) => {
    const cx = -W / 2 + T + i * (inner + T) + inner / 2;
    const shelf = (y: number) =>
      add({ kind: 'shelf', size: [inner, T, shelfD], pos: [cx, y, shelfZ], finish: 'body', cut: true });
    const rail = (y: number) =>
      add({ kind: 'rail', size: [inner, 2.5, 2.5], pos: [cx, y, bodyZ], finish: 'metal', shape: 'rodX', cut: false });
    const clothes = (railY: number, bottom: number, maxLen: number) => {
      const len = Math.min(maxLen, railY - bottom - 6);
      if (len < 20) return;
      const count = Math.max(2, Math.floor(inner / 9));
      for (let g = 0; g < count; g++) {
        garments.push({
          pos: [cx - inner / 2 + (inner * (g + 0.5)) / count, railY - 3 - len / 2, bodyZ],
          size: [3.2, len, Math.min(44, bodyDepth - 6)],
          color: GARMENT_COLORS[(i * 3 + g) % GARMENT_COLORS.length],
        });
      }
    };

    // Drawers (bottom of the section)
    for (let k = 0; k < bay.drawers; k++) {
      const key = `drawer-${i}-${k}`;
      anims[key] = { type: 'slide', offset: [0, 0, Math.min(35, bodyDepth * 0.6)], door: false };
      const y0 = yIn0 + k * DRAWER_H;
      const fw = inner - 0.4;
      add({ kind: 'drawerFront', size: [fw, DRAWER_H - 0.4, T], pos: [cx, y0 + DRAWER_H / 2, zF - T / 2], finish: 'body', anim: key, cut: true });
      const bw = inner - 2.6;
      const bh = DRAWER_H - 6;
      const bd = Math.min(50, bodyDepth - 4);
      const boxZ = zF - T - bd / 2;
      for (const s of [-1, 1]) {
        add({ kind: 'drawerSide', size: [1.2, bh, bd], pos: [cx + s * (bw / 2 - 0.6), y0 + 2 + bh / 2, boxZ], finish: 'body', anim: key, cut: true });
      }
      add({ kind: 'drawerBack', size: [bw - 2.4, bh, 1.2], pos: [cx, y0 + 2 + bh / 2, zF - T - bd + 0.6], finish: 'body', anim: key, cut: true });
      add({ kind: 'drawerBottom', size: [bw, 0.4, bd], pos: [cx, y0 + 2, boxZ], finish: 'back', anim: key, cut: true });
      // Drawers behind doors get a finger slot; open wardrobes get real handles.
      if (hasDoors) {
        add({ kind: 'handle', size: [10, 1.2, 0.3], pos: [cx, y0 + DRAWER_H - 3, zF + 0.05], finish: 'dark', anim: key, cut: false });
      } else if (d.handle === 'bar') {
        add({ kind: 'handle', size: [14, 1.2, 1.4], pos: [cx, y0 + DRAWER_H / 2, zF + 0.7], finish: 'metal', anim: key, cut: false });
      } else {
        add({ kind: 'handle', size: [3, 3, 3], pos: [cx, y0 + DRAWER_H / 2, zF + 1.5], finish: 'metal', shape: 'sphere', anim: key, cut: false });
      }
    }

    let zoneBottom = yIn0;
    if (bay.drawers > 0) {
      const top = yIn0 + bay.drawers * DRAWER_H;
      shelf(top + T / 2);
      zoneBottom = top + T;
    }
    const zoneH = yIn1 - zoneBottom;
    const hatY = yIn1 - HAT_GAP - T / 2; // centre of the top shelf in hanging sections

    if (bay.interior === 'hang') {
      const railY = hatY - T / 2 - RAIL_DROP;
      const clear = railY - zoneBottom;
      if (hatY - T / 2 > zoneBottom + 20) shelf(hatY);
      if (clear > 20) rail(railY);
      clothes(railY, zoneBottom, 110);
      if (clear < MIN_HANG) warnings.push({ key: 'warn.hang', vars: { n: i + 1, h: Math.round(clear), min: MIN_HANG } });
    } else if (bay.interior === 'doubleHang') {
      const rail1 = hatY - T / 2 - RAIL_DROP;
      const midY = zoneBottom + (hatY - T / 2 - zoneBottom) / 2;
      const rail2 = midY - T / 2 - RAIL_DROP;
      shelf(hatY);
      shelf(midY);
      if (rail1 - midY > 20) rail(rail1);
      if (rail2 - zoneBottom > 20) rail(rail2);
      clothes(rail1, midY + T / 2, 75);
      clothes(rail2, zoneBottom, 75);
      const clear = Math.min(rail1 - (midY + T / 2), rail2 - zoneBottom);
      if (clear < MIN_DOUBLE_HANG) warnings.push({ key: 'warn.hang', vars: { n: i + 1, h: Math.round(clear), min: MIN_DOUBLE_HANG } });
    } else {
      for (let j = 1; j <= bay.shelves; j++) shelf(zoneBottom + (zoneH * j) / (bay.shelves + 1));
      const gap = zoneH / (bay.shelves + 1) - T;
      if (gap < MIN_SHELF_GAP) warnings.push({ key: 'warn.shelves', vars: { n: i + 1, h: Math.round(gap) } });
    }
  });

  if (d.bays.some((b) => b.interior !== 'shelves') && carcassDepth < MIN_HANG_DEPTH) {
    warnings.push({ key: 'warn.depth', vars: { min: MIN_HANG_DEPTH } });
  }

  // A door leaf: plain board, or a frame with a mirror/glass insert.
  const leaf = (x0: number, x1: number, y0: number, y1: number, zc: number, th: number, finish: DoorFinish, anim: string) => {
    const w = x1 - x0;
    const h = y1 - y0;
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    if (finish === 'plain') {
      add({ kind: 'door', size: [w, h, th], pos: [cx, cy, zc], finish: 'body', anim, cut: true });
      return;
    }
    const F = 7;
    for (const s of [-1, 1]) {
      add({ kind: 'doorFrame', size: [F, h, th], pos: [cx + s * (w / 2 - F / 2), cy, zc], finish: 'body', anim, cut: true });
      add({ kind: 'doorFrame', size: [w - 2 * F, F, th], pos: [cx, cy + s * (h / 2 - F / 2), zc], finish: 'body', anim, cut: true });
    }
    add({
      kind: finish === 'mirror' ? 'mirror' : 'glass', size: [w - 2 * F, h - 2 * F, 0.6], pos: [cx, cy, zc],
      finish, anim, cut: true,
    });
  };

  let leaves = 0;
  if (doorType === 'hinged') {
    const regionW = W / n;
    const zc = zF + 0.2 + T / 2;
    d.bays.forEach((bay, i) => {
      const rx0 = -W / 2 + i * regionW;
      const count = regionW > 60 ? 2 : 1;
      const lw = regionW / count;
      for (let l = 0; l < count; l++) {
        leaves++;
        const x0 = rx0 + l * lw + 0.15;
        const x1 = rx0 + (l + 1) * lw - 0.15;
        const hingeLeft = count === 2 ? l === 0 : rx0 + regionW / 2 <= 0.01;
        const key = `door-${i}-${l}`;
        anims[key] = { type: 'hinge', pivot: [hingeLeft ? x0 : x1, 0, zF + 0.2], angle: hingeLeft ? -1.9 : 1.9, door: true };
        const y0 = PLINTH + 0.15;
        const y1 = H - 0.15;
        leaf(x0, x1, y0, y1, zc, T, bay.door, key);
        const hx = hingeLeft ? x1 - 4 : x0 + 4;
        const hy = Math.min(110, (y0 + y1) / 2);
        if (d.handle === 'bar') {
          add({ kind: 'handle', size: [1.4, 22, 1.4], pos: [hx, hy, zc + T / 2 + 1.2], finish: 'metal', anim: key, cut: false });
        } else {
          add({ kind: 'handle', size: [3, 3, 3], pos: [hx, hy, zc + T / 2 + 1.5], finish: 'metal', shape: 'sphere', anim: key, cut: false });
        }
      }
    });
  } else if (doorType === 'sliding') {
    const pw = W / n + 2; // panels overlap a little
    const th = 2;
    add({ kind: 'track', size: [W, 3, 8], pos: [0, H - 1.5, zF + 4], finish: 'metal', cut: false });
    add({ kind: 'plinth', size: [W, PLINTH, 8], pos: [0, PLINTH / 2, zF + 4], finish: 'body', cut: true });
    d.bays.forEach((bay, i) => {
      const c = -W / 2 + (i + 0.5) * (W / n);
      const x0 = Math.max(-W / 2, c - pw / 2);
      const x1 = Math.min(W / 2, c + pw / 2);
      const front = i % 2 === 1;
      const zc = zF + (front ? 5.5 : 2.5);
      const key = `slide-${i}`;
      anims[key] = { type: 'slide', offset: [front ? -W / n : 0, 0, 0], door: true };
      leaf(x0, x1, PLINTH, H - 3, zc, th, bay.door, key);
      const px = front ? x0 + 3 : x1 - 3;
      add({ kind: 'handle', size: [1.2, 40, 0.4], pos: [px, (PLINTH + H) / 2, zc + th / 2 + 0.2], finish: 'dark', anim: key, cut: false });
    });
  }

  return { parts, anims, garments, warnings, leaves };
}
