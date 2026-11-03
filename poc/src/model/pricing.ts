// Crude placeholder pricing (EGP). Every number here is a guess to be replaced with real
// workshop costs. Selling price of anything = cost × (1 + labour) × (1 + margin).
import { sectionsWidth, type Design, type MaterialId } from './design';
import type { Build, Part } from './build';

export const RATES = {
  boardPerM2: { oak: 1500, beech: 2200, walnut: 2600, white: 900, cream: 1050, sage: 1050, charcoal: 1050 } as Record<MaterialId, number>,
  backPerM2: 220,
  mirrorPerM2: 1300,
  glassPerM2: 950,
  frostedPerM2: 1150,
  drawerKit: 650, // runners + fixings per drawer
  hinge: 120,
  railPerM: 250,
  handle: 90,
  ledPerM: 250, // LED profile incl. diffuser
  ledDriver: 250, // per lit section (driver + door sensor)
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
export interface Quote {
  customer: PriceLine[]; // what the customer sees
  workshop: PriceLine[]; // full cost breakdown (admin only)
  total: number;
  deposit: number;
}

const round10 = (v: number) => Math.round(v / 10) * 10;

export function quote(d: Design, b: Build): Quote {
  const sum = (f: (p: Part) => boolean) => b.parts.filter(f).reduce((s, p) => s + faceArea(p), 0);
  const count = (f: (p: Part) => boolean) => b.parts.filter(f).length;

  const boards = sum((p) => p.cut && p.finish === 'body') * RATES.boardPerM2[d.material];
  const back = sum((p) => p.finish === 'back') * RATES.backPerM2;
  const mirror = sum((p) => p.finish === 'mirror') * RATES.mirrorPerM2;
  const glass = sum((p) => p.finish === 'glass') * RATES.glassPerM2 + sum((p) => p.finish === 'frosted') * RATES.frostedPerM2;
  const drawers = d.sections.reduce((s, x) => s + x.drawers, 0) * RATES.drawerKit;
  const hinges = b.hinges * RATES.hinge;
  const rails = b.parts.filter((p) => p.kind === 'rail').reduce((s, p) => s + p.size[0] / 100, 0) * RATES.railPerM;
  const handles = count((p) => p.kind === 'handle' && p.finish === 'metal') * RATES.handle;
  const litSections = d.sections.filter((s) => s.light).length;
  const led = b.parts.filter((p) => p.kind === 'led').reduce((s, p) => s + p.size[1] / 100, 0) * RATES.ledPerM + litSections * RATES.ledDriver;

  const sell = (cost: number) => cost * (1 + RATES.labourPct) * (1 + RATES.marginPct);
  const base = boards + back + drawers + hinges + rails + handles;
  const mirrors = d.doorType === 'hinged' ? d.sections.filter((s) => s.front === 'mirror').length : 0;
  const glassDoors = d.doorType === 'hinged' ? d.sections.filter((s) => s.front === 'glass' || s.front === 'frosted').length : 0;

  const customer: PriceLine[] = ([
    { key: 'cust.wardrobe', amount: sell(base), vars: { w: sectionsWidth(d), h: b.totalHeight } },
    { key: 'cust.led', amount: sell(led), vars: { n: litSections } },
    { key: 'cust.mirror', amount: sell(mirror), vars: { n: mirrors } },
    { key: 'cust.glass', amount: sell(glass), vars: { n: glassDoors } },
    { key: 'line.delivery', amount: RATES.delivery },
  ] as PriceLine[]).filter((l) => l.amount > 0).map((l) => ({ ...l, amount: round10(l.amount) }));
  const total = Math.round(customer.reduce((s, l) => s + l.amount, 0) / 50) * 50;

  const materials = boards + back + mirror + glass + drawers + hinges + rails + handles + led;
  const labour = materials * RATES.labourPct;
  const workshop: PriceLine[] = [
    { key: 'line.boards', amount: boards, vars: { area: Math.round(sum((p) => p.cut && p.finish === 'body') * 10) / 10 } },
    { key: 'line.back', amount: back },
    { key: 'line.glass', amount: mirror + glass },
    { key: 'line.drawers', amount: drawers },
    { key: 'line.hinges', amount: hinges },
    { key: 'line.rails', amount: rails },
    { key: 'line.handles', amount: handles },
    { key: 'line.led', amount: led },
    { key: 'line.labour', amount: labour },
    { key: 'line.delivery', amount: RATES.delivery },
    { key: 'line.margin', amount: (materials + labour) * RATES.marginPct },
  ].filter((l) => l.amount > 0).map((l) => ({ ...l, amount: round10(l.amount) }));

  return { customer, workshop, total, deposit: Math.round((total * RATES.depositPct) / 50) * 50 };
}
