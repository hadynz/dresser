// Turns a Design into physical parts. The 3D view, the price and the cut list are all
// derived from this one list, so they always agree.
//
// Coordinates (cm): x = width (0 at centre), y = up from the floor, z = depth (back at -depth/2).
// Every section is a separate unit with its own sides, top, bottom and back.
import {
  BACK, DRAWER_H, DRAWER_SIDE_GAP, HAT_GAP, MIN_DOUBLE_HANG, MIN_HANG, MIN_HANG_DEPTH, MIN_SHELF_GAP,
  PLINTH, RAIL_DROP, SINGLE_DOOR_MAX, T, sectionsWidth, type Design, type Front,
} from './design';

export type Finish = 'body' | 'back' | 'metal' | 'dark' | 'mirror' | 'glass' | 'frosted' | 'led';
export type PartKind =
  | 'side' | 'top' | 'bottom' | 'plinth' | 'back' | 'shelf'
  | 'door' | 'doorFrame' | 'mirror' | 'glass'
  | 'drawerFront' | 'drawerSide' | 'drawerBack' | 'drawerBottom' | 'drawerSpacer'
  | 'rail' | 'handle' | 'led';

export type Vec3 = [number, number, number];

export interface Part {
  kind: PartKind;
  size: Vec3;
  pos: Vec3; // centre
  finish: Finish;
  section: number;
  zone: 'main' | 'top';
  shape?: 'box' | 'rodX' | 'sphere';
  anim?: string; // key into Build.anims; parts sharing a key move together
  cut: boolean; // appears on the cut list
}

export type Anim =
  | { type: 'hinge'; pivot: Vec3; angle: number; section: number; door: true }
  | { type: 'slide'; offset: Vec3; section: number; door: false };

export interface Garment { pos: Vec3; size: Vec3; color: string; section: number }
export interface Warning { key: string; vars: Record<string, number> }
export interface SectionBox { x0: number; x1: number }
export interface Light { pos: Vec3; section: number }

export interface Build {
  parts: Part[];
  anims: Record<string, Anim>;
  garments: Garment[];
  warnings: Warning[];
  boxes: SectionBox[]; // x extent of each section
  lights: Light[];
  width: number; // actual wardrobe width (sum of sections)
  totalHeight: number;
  hinges: number;
}

const GARMENT_COLORS = ['#6d8bb5', '#c9a66b', '#a85d5d', '#8c9c7a', '#d8d2c4', '#4d5a6b', '#b08ea8'];

export function build(d: Design): Build {
  const parts: Part[] = [];
  const anims: Record<string, Anim> = {};
  const garments: Garment[] = [];
  const warnings: Warning[] = [];
  const boxes: SectionBox[] = [];
  const lights: Light[] = [];

  const W = sectionsWidth(d);
  const H = d.height;
  const topH = d.top;
  const totalHeight = H + topH;
  const D = d.depth;
  const hasDoors = d.doorType === 'hinged';
  const carcassDepth = D - (hasDoors ? 2 : 0);
  const zB = -D / 2;
  const zF = zB + carcassDepth; // carcass front face
  const bodyDepth = carcassDepth - BACK;
  const bodyZ = zF - bodyDepth / 2;
  const yIn0 = PLINTH + T; // top of the bottom board
  const yIn1 = H - T; // underside of the top board
  const shelfD = bodyDepth - 2;
  const shelfZ = zF - 1 - shelfD / 2;
  let hinges = 0;

  let x0 = -W / 2;
  d.sections.forEach((sec, i) => {
    const w = sec.width;
    const x1 = x0 + w;
    const cx = (x0 + x1) / 2;
    const inner = w - 2 * T;
    boxes.push({ x0, x1 });
    const add = (p: Omit<Part, 'section' | 'zone'> & { zone?: 'main' | 'top' }) =>
      parts.push({ zone: 'main', ...p, section: i });

    // Unit carcass
    for (const s of [-1, 1]) {
      add({ kind: 'side', size: [T, H, bodyDepth], pos: [cx + s * (w / 2 - T / 2), H / 2, bodyZ], finish: 'body', cut: true });
    }
    add({ kind: 'top', size: [inner, T, bodyDepth], pos: [cx, H - T / 2, bodyZ], finish: 'body', cut: true });
    add({ kind: 'bottom', size: [inner, T, bodyDepth], pos: [cx, PLINTH + T / 2, bodyZ], finish: 'body', cut: true });
    add({ kind: 'plinth', size: [inner, PLINTH, T], pos: [cx, PLINTH / 2, zF - 3 - T / 2], finish: 'body', cut: true });
    add({ kind: 'back', size: [w, H, BACK], pos: [cx, H / 2, zB + BACK / 2], finish: 'back', cut: true });

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
          section: i,
        });
      }
    };

    // Drawer unit: narrower than the section so drawers clear the hinges and door.
    if (sec.drawers > 0) {
      // A spacer board against each side carries the runners; front = unit width − 2 × gap.
      const fw = w - 2 * DRAWER_SIDE_GAP;
      const stackH = sec.drawers * DRAWER_H;
      for (const s of [-1, 1]) {
        add({
          kind: 'drawerSpacer', size: [T, stackH, bodyDepth - 2],
          pos: [cx + s * (inner / 2 - T / 2), yIn0 + stackH / 2, zF - 1 - (bodyDepth - 2) / 2], finish: 'body', cut: true,
        });
      }
      for (let k = 0; k < sec.drawers; k++) {
        const key = `drawer-${i}-${k}`;
        anims[key] = { type: 'slide', offset: [0, 0, Math.min(35, bodyDepth * 0.6)], section: i, door: false };
        const y0 = yIn0 + k * DRAWER_H;
        add({ kind: 'drawerFront', size: [fw - 0.4, DRAWER_H - 0.4, T], pos: [cx, y0 + DRAWER_H / 2, zF - T / 2], finish: 'body', anim: key, cut: true });
        const bw = fw - 2.6;
        const bh = DRAWER_H - 6;
        const bd = Math.min(50, bodyDepth - 4);
        const boxZ = zF - T - bd / 2;
        for (const s of [-1, 1]) {
          add({ kind: 'drawerSide', size: [1.2, bh, bd], pos: [cx + s * (bw / 2 - 0.6), y0 + 2 + bh / 2, boxZ], finish: 'body', anim: key, cut: true });
        }
        add({ kind: 'drawerBack', size: [bw - 2.4, bh, 1.2], pos: [cx, y0 + 2 + bh / 2, zF - T - bd + 0.6], finish: 'body', anim: key, cut: true });
        add({ kind: 'drawerBottom', size: [bw, 0.4, bd], pos: [cx, y0 + 2, boxZ], finish: 'back', anim: key, cut: true });
        // Behind doors drawers get a finger slot; open wardrobes get real handles.
        if (hasDoors) {
          add({ kind: 'handle', size: [10, 1.2, 0.3], pos: [cx, y0 + DRAWER_H - 3, zF + 0.05], finish: 'dark', anim: key, cut: false });
        } else if (d.handle === 'bar') {
          add({ kind: 'handle', size: [14, 1.2, 1.4], pos: [cx, y0 + DRAWER_H / 2, zF + 0.7], finish: 'metal', anim: key, cut: false });
        } else {
          add({ kind: 'handle', size: [3, 3, 3], pos: [cx, y0 + DRAWER_H / 2, zF + 1.5], finish: 'metal', shape: 'sphere', anim: key, cut: false });
        }
      }
    }

    let zoneBottom = yIn0;
    if (sec.drawers > 0) {
      const top = yIn0 + sec.drawers * DRAWER_H;
      shelf(top + T / 2);
      zoneBottom = top + T;
    }
    const zoneH = yIn1 - zoneBottom;
    const hatY = yIn1 - HAT_GAP - T / 2; // centre of the top shelf in hanging sections

    if (sec.interior === 'hang') {
      const railY = hatY - T / 2 - RAIL_DROP;
      const clear = railY - zoneBottom;
      if (hatY - T / 2 > zoneBottom + 20) shelf(hatY);
      if (clear > 20) rail(railY);
      clothes(railY, zoneBottom, 110);
      if (clear < MIN_HANG) warnings.push({ key: 'warn.hang', vars: { n: i + 1, h: Math.round(clear), min: MIN_HANG } });
    } else if (sec.interior === 'doubleHang') {
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
      for (let j = 1; j <= sec.shelves; j++) shelf(zoneBottom + (zoneH * j) / (sec.shelves + 1));
      const gap = zoneH / (sec.shelves + 1) - T;
      if (gap < MIN_SHELF_GAP) warnings.push({ key: 'warn.shelves', vars: { n: i + 1, h: Math.round(gap) } });
    }

    // LED profile accessory: vertical strips just behind the hinge line on both sides.
    if (sec.light) {
      for (const s of [-1, 1]) {
        add({ kind: 'led', size: [0.8, yIn1 - yIn0 - 2, 1.6], pos: [cx + s * (inner / 2 - 0.4), (yIn0 + yIn1) / 2, zF - 2.5], finish: 'led', cut: false });
      }
      lights.push({ pos: [cx, H * 0.62, zF - 8], section: i });
    }

    // Top cabinet: its own small unit, same height across the whole wardrobe.
    if (topH > 0) {
      const add2 = (p: Omit<Part, 'section' | 'zone'>) => add({ ...p, zone: 'top' });
      for (const s of [-1, 1]) {
        add2({ kind: 'side', size: [T, topH, bodyDepth], pos: [cx + s * (w / 2 - T / 2), H + topH / 2, bodyZ], finish: 'body', cut: true });
      }
      add2({ kind: 'top', size: [inner, T, bodyDepth], pos: [cx, H + topH - T / 2, bodyZ], finish: 'body', cut: true });
      add2({ kind: 'bottom', size: [inner, T, bodyDepth], pos: [cx, H + T / 2, bodyZ], finish: 'body', cut: true });
      add2({ kind: 'back', size: [w, topH, BACK], pos: [cx, H + topH / 2, zB + BACK / 2], finish: 'back', cut: true });
    }

    // Doors
    if (hasDoors) {
      const count = w <= SINGLE_DOOR_MAX ? 1 : 2;
      const lw = w / count;
      const zc = zF + 0.2 + T / 2;
      const zone = (y0: number, y1: number, zoneName: 'main' | 'top', front: Front, perLeafHinges: number) => {
        for (let l = 0; l < count; l++) {
          hinges += perLeafHinges;
          const lx0 = x0 + l * lw + 0.15;
          const lx1 = x0 + (l + 1) * lw - 0.15;
          const hingeLeft = count === 2 ? l === 0 : cx <= 0.01;
          const key = `${zoneName}-door-${i}-${l}`;
          anims[key] = { type: 'hinge', pivot: [hingeLeft ? lx0 : lx1, 0, zF + 0.2], angle: hingeLeft ? -1.9 : 1.9, section: i, door: true };
          leaf(lx0, lx1, y0, y1, zc, front, key, zoneName);
          const hx = hingeLeft ? lx1 - 4 : lx0 + 4;
          const hy = zoneName === 'top' ? y0 + 7 : Math.min(110, (y0 + y1) / 2);
          const len = zoneName === 'top' ? 10 : 22;
          if (d.handle === 'bar') {
            add({ kind: 'handle', size: [1.4, len, 1.4], pos: [hx, hy, zc + T / 2 + 1.2], finish: 'metal', anim: key, zone: zoneName, cut: false });
          } else {
            add({ kind: 'handle', size: [3, 3, 3], pos: [hx, hy, zc + T / 2 + 1.5], finish: 'metal', shape: 'sphere', anim: key, zone: zoneName, cut: false });
          }
        }
      };
      // A door leaf: plain board, or a frame with a mirror/glass insert.
      const leaf = (lx0: number, lx1: number, y0: number, y1: number, zc: number, front: Front, anim: string, zoneName: 'main' | 'top') => {
        const lwid = lx1 - lx0;
        const h = y1 - y0;
        const lcx = (lx0 + lx1) / 2;
        const cy = (y0 + y1) / 2;
        if (front === 'wood') {
          add({ kind: 'door', size: [lwid, h, T], pos: [lcx, cy, zc], finish: 'body', anim, zone: zoneName, cut: true });
          return;
        }
        const F = 7;
        for (const s of [-1, 1]) {
          add({ kind: 'doorFrame', size: [F, h, T], pos: [lcx + s * (lwid / 2 - F / 2), cy, zc], finish: 'body', anim, zone: zoneName, cut: true });
          add({ kind: 'doorFrame', size: [lwid - 2 * F, F, T], pos: [lcx, cy + s * (h / 2 - F / 2), zc], finish: 'body', anim, zone: zoneName, cut: true });
        }
        add({
          kind: front === 'mirror' ? 'mirror' : 'glass', size: [lwid - 2 * F, h - 2 * F, 0.6], pos: [lcx, cy, zc],
          finish: front, anim, zone: zoneName, cut: true,
        });
      };
      zone(PLINTH + 0.15, H - 0.15, 'main', sec.front, H > 200 ? 4 : 3);
      if (topH > 0) zone(H + 0.15, H + topH - 0.15, 'top', sec.front === 'mirror' ? 'wood' : sec.front, 2);
    }

    x0 = x1;
  });

  if (d.sections.some((s) => s.interior !== 'shelves') && carcassDepth < MIN_HANG_DEPTH) {
    warnings.push({ key: 'warn.depth', vars: { min: MIN_HANG_DEPTH } });
  }

  return { parts, anims, garments, warnings, boxes, lights, width: W, totalHeight, hinges };
}
