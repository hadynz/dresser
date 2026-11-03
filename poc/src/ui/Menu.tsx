import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  danger?: boolean;
}

const WIDTH = 220;

/**
 * A "⋯"/"⋮" button with a dropdown. The dropdown is portalled to <body> with fixed positioning so it is
 * never clipped by scrolling containers (like the section strip).
 */
export function Menu(props: { label: string; trigger: ReactNode; items: MenuItem[]; note?: string; className?: string }) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const close = () => setRect(null);

  useEffect(() => {
    if (!rect) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!menu.current?.contains(target) && !btn.current?.contains(target)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    addEventListener('pointerdown', onDown);
    addEventListener('keydown', onKey);
    addEventListener('resize', close);
    addEventListener('scroll', close, true);
    menu.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    return () => {
      removeEventListener('pointerdown', onDown);
      removeEventListener('keydown', onKey);
      removeEventListener('resize', close);
      removeEventListener('scroll', close, true);
    };
  }, [rect]);

  return (
    <>
      <button
        ref={btn} type="button" className={props.className ?? 'icon'} aria-label={props.label} title={props.label}
        aria-haspopup="menu" aria-expanded={!!rect}
        onClick={(e) => { e.stopPropagation(); setRect(rect ? null : btn.current!.getBoundingClientRect()); }}
      >
        {props.trigger}
      </button>
      {rect && createPortal(
        <div
          ref={menu} className="menu" role="menu"
          style={{ top: rect.bottom + 6, left: Math.min(Math.max(8, rect.right - WIDTH), innerWidth - WIDTH - 8), width: WIDTH }}
        >
          {props.note && <p className="menu-note">{props.note}</p>}
          {props.items.map((item) => (
            <button
              key={item.label} type="button" role="menuitem" disabled={item.disabled} className={item.danger ? 'danger' : undefined}
              onClick={() => { close(); item.onSelect(); }}
            >
              <span className="menu-icon" aria-hidden>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
