// The wardrobe design: everything the customer chooses. All sizes in cm.
// A wardrobe is a row of sections. Each section is its own unit (carcass) in a standard width,
// so the workshop builds from a small set of repeatable modules.

export type MaterialId = 'oak' | 'beech' | 'walnut' | 'white' | 'cream' | 'sage' | 'charcoal';
export type DoorType = 'hinged' | 'none';
export type Front = 'wood' | 'mirror' | 'glass' | 'frosted'; // mirror/glass are accessories on the door
export type Interior = 'hang' | 'doubleHang' | 'shelves';
export type Handle = 'bar' | 'knob';

export interface Section {
  id: string;
  width: number; // one of STD_WIDTHS
  interior: Interior;
  drawers: number; // stacked at the bottom of the section
  shelves: number; // only used when interior = 'shelves'
  light: boolean; // LED profile accessory
  front: Front; // door front accessory
}

export interface Design {
  space: number; // available wall width; the sections must fit inside it
  height: number; // main body
  top: number; // top cabinet height, 0 = none. Same for every section
  depth: number; // overall, including doors
  sections: Section[];
  doorType: DoorType;
  handle: Handle;
  material: MaterialId;
}

export const MATERIALS: MaterialId[] = ['oak', 'beech', 'walnut', 'white', 'cream', 'sage', 'charcoal'];
export const INTERIORS: Interior[] = ['hang', 'doubleHang', 'shelves'];
export const STD_WIDTHS = [40, 50, 60, 80, 100]; // to confirm with the workshop
export const TOP_HEIGHTS = [0, 30, 35, 40, 45];
export const MAX_SECTIONS = 6;
export const MIN_WIDTH = STD_WIDTHS[0];

// Construction constants (cm). To be confirmed with the workshop.
export const T = 1.8; // board thickness
export const BACK = 0.4; // back panel (HDF)
export const PLINTH = 8;
export const DRAWER_H = 20; // fixed drawer height
export const DRAWER_SIDE_GAP = 5; // each side, from the unit's outer edge (Momin: 60 cm unit → 50 cm drawer)
export const HAT_GAP = 30; // space above the top shelf of a hanging section
export const RAIL_DROP = 5; // rail sits this far under its shelf
export const MIN_HANG = 95;
export const MIN_DOUBLE_HANG = 80;
export const MIN_SHELF_GAP = 18;
export const MIN_HANG_DEPTH = 55;
export const SINGLE_DOOR_MAX = 60; // sections up to this width get one door, wider get two

export const LIMITS = {
  space: { min: 40, max: 400, step: 5 },
  height: { min: 180, max: 240, step: 5 }, // Momin: main body never above 2.40 m
  depth: { min: 45, max: 65, step: 1 },
  drawers: { min: 0, max: 4 },
  shelves: { min: 1, max: 6 },
};

let idCounter = 0;
export const newId = () => `s${Date.now().toString(36)}${(idCounter++).toString(36)}`;

export const sectionsWidth = (d: Pick<Design, 'sections'>) => d.sections.reduce((s, x) => s + x.width, 0);

const clamp = (v: number, r: { min: number; max: number }) =>
  Math.min(r.max, Math.max(r.min, Math.round(Number(v) || r.min)));

const snapWidth = (w: number) =>
  STD_WIDTHS.reduce((best, c) => (Math.abs(c - w) < Math.abs(best - w) ? c : best), 60);

export const DEFAULT_SECTION: Omit<Section, 'id'> = {
  width: 60, interior: 'hang', drawers: 0, shelves: 4, light: true, front: 'wood',
};

/** Cleans any design (from the form, a preset or a shared link). Does not fit sections to the space. */
export function sanitize(d: Partial<Design>): Design {
  const seen = new Set<string>();
  const source = d.sections?.length ? d.sections : [{ ...DEFAULT_SECTION, id: newId() }];
  const sections = source.slice(0, MAX_SECTIONS).map((s) => {
    const b = { ...DEFAULT_SECTION, ...s };
    let id = typeof b.id === 'string' && b.id ? b.id : newId();
    if (seen.has(id)) id = newId();
    seen.add(id);
    return {
      id,
      width: snapWidth(b.width),
      interior: INTERIORS.includes(b.interior) ? b.interior : 'hang',
      drawers: clamp(b.drawers, LIMITS.drawers),
      shelves: clamp(b.shelves, LIMITS.shelves),
      light: b.light !== false,
      front: (['wood', 'mirror', 'glass', 'frosted'] as Front[]).includes(b.front) ? b.front : 'wood',
    } satisfies Section;
  });
  return {
    space: clamp(d.space ?? sectionsWidth({ sections }), LIMITS.space),
    height: clamp(d.height ?? 220, LIMITS.height),
    top: TOP_HEIGHTS.includes(Number(d.top)) ? Number(d.top) : 0,
    depth: clamp(d.depth ?? 60, LIMITS.depth),
    sections,
    doorType: d.doorType === 'none' ? 'none' : 'hinged',
    handle: d.handle === 'knob' ? 'knob' : 'bar',
    material: MATERIALS.includes(d.material as MaterialId) ? (d.material as MaterialId) : 'oak',
  };
}

type StarterSection = Partial<Omit<Section, 'id'>>;
const starter = (d: Omit<Design, 'sections'> & { sections: StarterSection[] }): Design =>
  ({ ...d, sections: d.sections.map((s) => ({ ...DEFAULT_SECTION, ...s, id: '' })) }) as Design;

/** Starter designs the customer picks first, then tweaks. Section ids are assigned on load. */
export const STARTERS: { id: string; design: Design }[] = [
  {
    id: 'classic',
    design: starter({
      space: 160, height: 220, top: 0, depth: 60, doorType: 'hinged', handle: 'bar', material: 'oak',
      sections: [
        { width: 80, interior: 'hang', drawers: 2 },
        { width: 80, interior: 'shelves', shelves: 5 },
      ],
    }),
  },
  {
    id: 'mirror',
    design: starter({
      space: 240, height: 220, top: 40, depth: 62, doorType: 'hinged', handle: 'bar', material: 'white',
      sections: [
        { width: 60, interior: 'hang' },
        { width: 60, interior: 'doubleHang', front: 'mirror' },
        { width: 60, interior: 'shelves', drawers: 3, shelves: 3, front: 'mirror' },
        { width: 60, interior: 'hang' },
      ],
    }),
  },
  {
    id: 'boutique',
    design: starter({
      space: 220, height: 210, top: 35, depth: 60, doorType: 'hinged', handle: 'bar', material: 'walnut',
      sections: [
        { width: 50, interior: 'hang' },
        { width: 60, interior: 'shelves', drawers: 2, shelves: 4, front: 'glass' },
        { width: 60, interior: 'shelves', drawers: 2, shelves: 4, front: 'glass' },
        { width: 50, interior: 'hang' },
      ],
    }),
  },
  {
    id: 'open',
    design: starter({
      space: 180, height: 200, top: 0, depth: 55, doorType: 'none', handle: 'knob', material: 'sage',
      sections: [
        { width: 60, interior: 'shelves', drawers: 2, shelves: 3, light: false },
        { width: 60, interior: 'hang', light: false },
        { width: 60, interior: 'shelves', drawers: 2, shelves: 3, light: false },
      ],
    }),
  },
  {
    id: 'kids',
    design: starter({
      space: 120, height: 190, top: 0, depth: 55, doorType: 'hinged', handle: 'knob', material: 'cream',
      sections: [
        { width: 60, interior: 'doubleHang', front: 'frosted' },
        { width: 60, interior: 'shelves', drawers: 2, shelves: 3 },
      ],
    }),
  },
];
