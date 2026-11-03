// Groups identical parts into a cut list for the workshop.
import type { Build, Finish, PartKind } from './build';

export interface CutRow {
  kind: PartKind;
  zone: 'main' | 'top';
  finish: Finish;
  qty: number;
  length: number; // cm
  width: number; // cm
  thickness: number; // mm
}

const round = (v: number) => Math.round(v * 10) / 10;

export function cutList(b: Build): CutRow[] {
  const rows = new Map<string, CutRow>();
  for (const p of b.parts) {
    if (!p.cut) continue;
    const [l, w, t] = [...p.size].sort((x, y) => y - x).map(round);
    const key = `${p.zone}|${p.kind}|${p.finish}|${l}|${w}|${t}`;
    const row = rows.get(key);
    if (row) row.qty++;
    else rows.set(key, { kind: p.kind, zone: p.zone, finish: p.finish, qty: 1, length: l, width: w, thickness: Math.round(t * 10) });
  }
  return [...rows.values()].sort((a, b) => (a.zone === b.zone ? 0 : a.zone === 'main' ? -1 : 1));
}
