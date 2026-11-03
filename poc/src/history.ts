import { useCallback, useReducer, useRef } from 'react';

const GROUP_MS = 1000;

/**
 * Undo/redo history. Changes committed with the same `group` key in quick succession (a slider drag)
 * become one undo step, and `base(group)` returns the state from before that step started, so a drag
 * can be recomputed from its starting point (e.g. sections removed while shrinking come back).
 */
export function useHistory<T>(initial: () => T) {
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const h = useRef<{ past: T[]; present: T; future: T[]; group: { key: string; at: number; base: T } | null } | null>(null);
  if (!h.current) h.current = { past: [], present: initial(), future: [], group: null };
  const s = h.current;

  const grouping = (key?: string) => !!key && s.group?.key === key && Date.now() - s.group.at < GROUP_MS;

  const base = useCallback((key?: string) => (grouping(key) ? s.group!.base : s.present), []); // eslint-disable-line react-hooks/exhaustive-deps

  const commit = useCallback((next: T, key?: string) => {
    if (grouping(key)) {
      s.group!.at = Date.now();
    } else {
      s.past = [...s.past, s.present].slice(-100);
      s.group = key ? { key, at: Date.now(), base: s.present } : null;
    }
    s.present = next;
    s.future = [];
    rerender();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const undo = useCallback(() => {
    if (!s.past.length) return;
    s.future = [s.present, ...s.future];
    s.present = s.past[s.past.length - 1];
    s.past = s.past.slice(0, -1);
    s.group = null;
    rerender();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const redo = useCallback(() => {
    if (!s.future.length) return;
    s.past = [...s.past, s.present];
    s.present = s.future[0];
    s.future = s.future.slice(1);
    s.group = null;
    rerender();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { present: s.present, commit, base, undo, redo, canUndo: s.past.length > 0, canRedo: s.future.length > 0 };
}
