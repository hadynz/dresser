// The wardrobe design: everything the customer chooses. All sizes in cm.

export type MaterialId = 'oak' | 'beech' | 'walnut' | 'white' | 'cream' | 'sage' | 'charcoal';
export type DoorType = 'none' | 'hinged' | 'sliding';
export type DoorFinish = 'plain' | 'mirror' | 'glass' | 'frosted';
export type Interior = 'hang' | 'doubleHang' | 'shelves';
export type Handle = 'bar' | 'knob';

export interface Bay {
  interior: Interior;
  drawers: number; // stacked at the bottom of the section
  shelves: number; // only used when interior = 'shelves'
  door: DoorFinish; // finish of this section's door(s)
}

export interface Design {
  width: number;
  height: number;
  depth: number; // overall, including doors
  bays: Bay[];
  doorType: DoorType;
  handle: Handle;
  material: MaterialId;
}

export const MATERIALS: MaterialId[] = ['oak', 'beech', 'walnut', 'white', 'cream', 'sage', 'charcoal'];
export const DOOR_FINISHES: DoorFinish[] = ['plain', 'mirror', 'glass', 'frosted'];
export const INTERIORS: Interior[] = ['hang', 'doubleHang', 'shelves'];

// Construction constants (cm). To be confirmed with the workshop.
export const T = 1.8; // board thickness
export const BACK = 0.4; // back panel (HDF)
export const PLINTH = 8;
export const DRAWER_H = 20; // fixed drawer height
export const HAT_GAP = 30; // space above the top shelf of a hanging section
export const RAIL_DROP = 5; // rail sits this far under its shelf
export const MIN_HANG = 95;
export const MIN_DOUBLE_HANG = 80;
export const MIN_SHELF_GAP = 18;
export const MIN_HANG_DEPTH = 55;

export const LIMITS = {
  width: { min: 80, max: 300, step: 5 },
  height: { min: 180, max: 260, step: 5 },
  depth: { min: 45, max: 65, step: 1 },
  bayInner: { min: 35, max: 100 },
  bays: { min: 1, max: 4 },
  drawers: { min: 0, max: 4 },
  shelves: { min: 1, max: 6 },
};

export const bayInnerWidth = (width: number, n: number) => (width - (n + 1) * T) / n;

export function validBayCounts(width: number): number[] {
  return [1, 2, 3, 4].filter((n) => {
    const w = bayInnerWidth(width, n);
    return w >= LIMITS.bayInner.min && w <= LIMITS.bayInner.max;
  });
}

export const DEFAULT_BAY: Bay = { interior: 'hang', drawers: 0, shelves: 4, door: 'plain' };

const clamp = (v: number, r: { min: number; max: number }) =>
  Math.min(r.max, Math.max(r.min, Math.round(Number(v) || r.min)));

/** Forces any design (from the form, a preset or a shared link) into the allowed space. */
export function normalize(d: Design): Design {
  const width = clamp(d.width, LIMITS.width);
  const valid = validBayCounts(width);
  let n = d.bays?.length || 1;
  if (!valid.includes(n)) {
    n = valid.reduce((best, c) => (Math.abs(c - n) < Math.abs(best - n) ? c : best), valid[0]);
  }
  const source = d.bays?.length ? d.bays : [DEFAULT_BAY];
  const bays = Array.from({ length: n }, (_, i) => {
    const b = { ...DEFAULT_BAY, ...(source[i] ?? source[source.length - 1]) };
    return {
      interior: INTERIORS.includes(b.interior) ? b.interior : 'hang',
      drawers: clamp(b.drawers, LIMITS.drawers),
      shelves: clamp(b.shelves, LIMITS.shelves),
      door: DOOR_FINISHES.includes(b.door) ? b.door : 'plain',
    } satisfies Bay;
  });
  let doorType: DoorType = ['none', 'hinged', 'sliding'].includes(d.doorType) ? d.doorType : 'hinged';
  if (doorType === 'sliding' && n < 2) doorType = 'hinged';
  return {
    width,
    height: clamp(d.height, LIMITS.height),
    depth: clamp(d.depth, LIMITS.depth),
    bays,
    doorType,
    handle: d.handle === 'knob' ? 'knob' : 'bar',
    material: MATERIALS.includes(d.material) ? d.material : 'oak',
  };
}

/** Starter designs the customer picks first, then tweaks. */
export const STARTERS: { id: string; design: Design }[] = [
  {
    id: 'classic',
    design: {
      width: 160, height: 220, depth: 60, doorType: 'hinged', handle: 'bar', material: 'oak',
      bays: [
        { interior: 'hang', drawers: 2, shelves: 4, door: 'plain' },
        { interior: 'shelves', drawers: 0, shelves: 5, door: 'plain' },
      ],
    },
  },
  {
    id: 'mirror',
    design: {
      width: 240, height: 240, depth: 65, doorType: 'sliding', handle: 'bar', material: 'white',
      bays: [
        { interior: 'hang', drawers: 0, shelves: 4, door: 'plain' },
        { interior: 'shelves', drawers: 3, shelves: 3, door: 'mirror' },
        { interior: 'doubleHang', drawers: 0, shelves: 4, door: 'plain' },
      ],
    },
  },
  {
    id: 'boutique',
    design: {
      width: 220, height: 235, depth: 60, doorType: 'hinged', handle: 'bar', material: 'walnut',
      bays: [
        { interior: 'hang', drawers: 0, shelves: 4, door: 'plain' },
        { interior: 'shelves', drawers: 2, shelves: 4, door: 'glass' },
        { interior: 'shelves', drawers: 2, shelves: 4, door: 'glass' },
        { interior: 'hang', drawers: 0, shelves: 4, door: 'plain' },
      ],
    },
  },
  {
    id: 'open',
    design: {
      width: 180, height: 200, depth: 55, doorType: 'none', handle: 'knob', material: 'sage',
      bays: [
        { interior: 'shelves', drawers: 2, shelves: 3, door: 'plain' },
        { interior: 'hang', drawers: 0, shelves: 4, door: 'plain' },
        { interior: 'shelves', drawers: 2, shelves: 3, door: 'plain' },
      ],
    },
  },
  {
    id: 'kids',
    design: {
      width: 120, height: 190, depth: 55, doorType: 'hinged', handle: 'knob', material: 'cream',
      bays: [
        { interior: 'doubleHang', drawers: 0, shelves: 4, door: 'frosted' },
        { interior: 'shelves', drawers: 2, shelves: 3, door: 'plain' },
      ],
    },
  },
];
