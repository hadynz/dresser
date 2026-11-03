import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface PickerOption<V> { value: V; label: string; hint?: string }

interface Common<V> {
  title: string;
  options: PickerOption<V>[];
  cancelLabel: string;
  onClose: () => void;
}

/**
 * A small select-box style modal: a bottom sheet on phones, a centred dialog on desktop.
 * Single mode picks on tap. Multi mode has an optional "all" row and an Apply button.
 */
export function Picker<V>(
  props: Common<V> & (
    | { mode: 'single'; value: V; onPick: (v: V) => void }
    | { mode: 'multi'; value: V[]; allLabel?: string; applyLabel: string; onApply: (v: V[]) => void }
  ),
) {
  const [chosen, setChosen] = useState<V[]>(props.mode === 'multi' ? props.value : []);
  const sheet = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && props.onClose();
    addEventListener('keydown', onKey);
    sheet.current?.querySelector<HTMLElement>('[aria-checked="true"], button')?.focus();
    return () => removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const all = props.options.map((o) => o.value);
  const allOn = chosen.length === all.length;
  const toggle = (v: V) => setChosen((c) => (c.includes(v) ? c.filter((x) => x !== v) : [...c, v]));

  return createPortal(
    <div className="picker-backdrop" onPointerDown={(e) => e.target === e.currentTarget && props.onClose()}>
      <div ref={sheet} className="picker" role="dialog" aria-modal="true" aria-label={props.title}>
        <h3>{props.title}</h3>
        <div className="picker-options" role={props.mode === 'single' ? 'radiogroup' : 'group'}>
          {props.mode === 'multi' && props.allLabel && (
            <button type="button" role="checkbox" aria-checked={allOn} className="picker-option all" onClick={() => setChosen(allOn ? [] : all)}>
              <span className="check" aria-hidden />
              {props.allLabel}
            </button>
          )}
          {props.options.map((o) => {
            const on = props.mode === 'single' ? o.value === props.value : chosen.includes(o.value);
            return (
              <button
                key={String(o.value)} type="button" role={props.mode === 'single' ? 'radio' : 'checkbox'} aria-checked={on}
                className="picker-option"
                onClick={() => (props.mode === 'single' ? (props.onPick(o.value), props.onClose()) : toggle(o.value))}
              >
                <span className={props.mode === 'single' ? 'radio' : 'check'} aria-hidden />
                <span>{o.label}</span>
                {o.hint && <span className="muted">{o.hint}</span>}
              </button>
            );
          })}
        </div>
        <div className="picker-actions">
          <button type="button" className="secondary" onClick={props.onClose}>{props.cancelLabel}</button>
          {props.mode === 'multi' && (
            <button
              type="button" className="primary" disabled={!chosen.length}
              onClick={() => { props.onApply(all.filter((v) => chosen.includes(v))); props.onClose(); }}
            >
              {props.applyLabel}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
