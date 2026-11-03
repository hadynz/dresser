// Rules for fitting standard-width sections into the customer's available width.
import { MAX_SECTIONS, MIN_WIDTH, STD_WIDTHS, newId, sectionsWidth, type Design, type Section } from './design';

export type Change = { type: 'narrowed'; n: number; w: number } | { type: 'removed'; n: number };

const leftover = (d: Design) => d.space - sectionsWidth(d);

/** Largest standard width that is ≤ max, or null. */
const largestFitting = (max: number) => [...STD_WIDTHS].reverse().find((w) => w <= max) ?? null;

/**
 * Makes the sections fit inside the available width, keeping as many sections as possible: first removes
 * (from the end) only the sections that could not fit even at the minimum width, then narrows the widest
 * section (right-most on a tie) one standard step at a time until the rest fit.
 */
export function fitToSpace(d: Design): { design: Design; changes: Change[] } {
  const changes: Change[] = [];
  const keep = Math.max(1, Math.min(d.sections.length, Math.floor(d.space / MIN_WIDTH)));
  for (let n = d.sections.length; n > keep; n--) changes.push({ type: 'removed', n });
  const sections = d.sections.slice(0, keep).map((s) => ({ ...s }));
  const total = () => sections.reduce((s, x) => s + x.width, 0);
  while (total() > d.space) {
    let widest = -1;
    sections.forEach((s, i) => {
      if (s.width > MIN_WIDTH && (widest < 0 || s.width >= sections[widest].width)) widest = i;
    });
    if (widest < 0) break; // a single minimum-width section always stays; space has a matching minimum
    const s = sections[widest];
    s.width = STD_WIDTHS[STD_WIDTHS.indexOf(s.width) - 1];
    changes.push({ type: 'narrowed', n: widest + 1, w: s.width });
  }
  return { design: { ...d, sections }, changes: collapse(changes) };
}

// Report each section once, with its final state.
function collapse(changes: Change[]): Change[] {
  const byN = new Map<number, Change>();
  for (const c of changes) byN.set(c.n, c);
  return [...byN.values()].sort((a, b) => a.n - b.n);
}

export const canAddSection = (d: Design) => d.sections.length < MAX_SECTIONS && leftover(d) >= MIN_WIDTH;

/** Copy of `from`, at its width if it fits, otherwise the widest standard width that does. */
export function copySection(d: Design, from: Section): Section | null {
  if (!canAddSection(d)) return null;
  const width = largestFitting(Math.min(from.width, leftover(d)));
  return width ? { ...from, id: newId(), width } : null;
}

/** Standard widths section i could take without exceeding the available width. */
export function allowedWidths(d: Design, i: number): number[] {
  const others = sectionsWidth(d) - d.sections[i].width;
  return STD_WIDTHS.filter((w) => others + w <= d.space);
}

export type Suggestion =
  | { type: 'add' }
  | { type: 'widen'; index: number; to: number }
  | null;

/** A way to use more of the available width, if there is one. */
export function suggest(d: Design): Suggestion {
  if (canAddSection(d)) return { type: 'add' };
  const left = leftover(d);
  let best: { index: number; to: number; gain: number } | null = null;
  d.sections.forEach((s, index) => {
    const to = largestFitting(s.width + left);
    if (to && to > s.width && (!best || to - s.width > best.gain)) best = { index, to, gain: to - s.width };
  });
  return best ? { type: 'widen', index: (best as { index: number }).index, to: (best as { to: number }).to } : null;
}

export { leftover };
