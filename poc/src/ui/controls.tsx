import type { ReactNode } from 'react';

export function Segmented<V extends string | number>(props: {
  value: V; options: { value: V; label: ReactNode; disabled?: boolean }[]; onChange: (v: V) => void; small?: boolean;
}) {
  return (
    <div className={`segmented${props.small ? ' small' : ''}`} role="radiogroup">
      {props.options.map((o) => (
        <button
          key={String(o.value)} type="button" role="radio" aria-checked={o.value === props.value}
          className={o.value === props.value ? 'on' : ''} disabled={o.disabled} onClick={() => props.onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stepper(props: { label: string; value: number; min: number; max: number; format: (v: number) => string; onChange: (v: number) => void }) {
  const { value, min, max } = props;
  return (
    <div className="stepper">
      <span>{props.label}</span>
      <div>
        <button type="button" disabled={value <= min} onClick={() => props.onChange(value - 1)} aria-label="-">−</button>
        <output>{props.format(value)}</output>
        <button type="button" disabled={value >= max} onClick={() => props.onChange(value + 1)} aria-label="+">+</button>
      </div>
    </div>
  );
}

export function Slider(props: {
  label: string; value: number; min: number; max: number; step: number; display: string; onChange: (v: number) => void;
}) {
  return (
    <label className="slider">
      <span className="slider-head">
        <span>{props.label}</span>
        <output>{props.display}</output>
      </span>
      <input
        type="range" min={props.min} max={props.max} step={props.step} value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </label>
  );
}
