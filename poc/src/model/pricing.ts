// Crude placeholder pricing (EGP). Every number here is a guess to be replaced with real
// workshop costs. Price = materials + hardware + labour % + delivery, then a margin.
import type { Design, MaterialId } from './design';
import type { Build, Part } from './build';

export const RATES = {
  boardPerM2: { oak: 1500, beech: 2200, walnut: 2600, white: 900, cream: 1050, sage: 1050, charcoal: 1050 } as Record<MaterialId, number>,
  backPerM2: 220,
  mirrorPerM2: 1300,
  glassPerM2: 950,
  frostedPerM2: 1150,
  drawerKit: 650, // runners + fixings per drawer
  hinge: 120,
  slidingTrackPerM: 1800,
  railPerM: 250,
  handle: 90,
  labourPct: 0.4,
  delivery: 1500,
  marginPct: 0.25,
  depositPct: 0.3,
  leadTimeWeeks: 4,
};

/** Face area (m²) of a board: the two largest dimensions. */
export const faceArea = (p: Part) => {
  const [a, b] = [...p.size].sort((x, y) => y - x);
  return (a * b) / 10000;
};

export interface PriceLine { key: string; amount: number; vars?: Record<string, number> }
export interface Quote { lines: PriceLine[]; total: number; deposit: number }

export function quote(d: Design, b: Build): Quote {
  const sum = (f: (p: Part) => boolean) => b.parts.filter(f).reduce((s, p) => s + faceArea(p), 0);
  const boardArea = sum((p) => p.cut && p.finish === 'body');
  const backArea = sum((p) => p.finish === 'back');
  const glassCost =
    sum((p) => p.finish === 'mirror') * RATES.mirrorPerM2 +
    sum((p) => p.finish === 'glass') * RATES.glassPerM2 +
    sum((p) => p.finish === 'frosted') * RATES.frostedPerM2;
  const drawers = d.bays.reduce((s, bay) => s + bay.drawers, 0);
  const hingesPerLeaf = d.height > 200 ? 4 : 3;
  const railM = b.parts.filter((p) => p.kind === 'rail').reduce((s, p) => s + p.size[0] / 100, 0);
  const handles = b.parts.filter((p) => p.kind === 'handle' && p.finish === 'metal').length;

  const materials: PriceLine[] = [
    { key: 'line.boards', amount: boardArea * RATES.boardPerM2[d.material], vars: { area: Math.round(boardArea * 10) / 10 } },
    { key: 'line.back', amount: backArea * RATES.backPerM2 },
    { key: 'line.glass', amount: glassCost },
    { key: 'line.drawers', amount: drawers * RATES.drawerKit },
    { key: 'line.hinges', amount: b.leaves * hingesPerLeaf * RATES.hinge },
    { key: 'line.sliding', amount: d.doorType === 'sliding' ? (d.width / 100) * RATES.slidingTrackPerM : 0 },
    { key: 'line.rails', amount: railM * RATES.railPerM },
    { key: 'line.handles', amount: handles * RATES.handle },
  ].filter((l) => l.amount > 0);

  const materialsTotal = materials.reduce((s, l) => s + l.amount, 0);
  const labour = materialsTotal * RATES.labourPct;
  const cost = materialsTotal + labour + RATES.delivery;
  const margin = cost * RATES.marginPct;
  const lines = [
    ...materials,
    { key: 'line.labour', amount: labour },
    { key: 'line.delivery', amount: RATES.delivery },
    { key: 'line.margin', amount: margin },
  ].map((l) => ({ ...l, amount: Math.round(l.amount / 10) * 10 }));
  const total = Math.round((cost + margin) / 50) * 50;
  return { lines, total, deposit: Math.round((total * RATES.depositPct) / 50) * 50 };
}
