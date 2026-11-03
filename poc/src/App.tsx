import { useEffect, useMemo, useRef, useState } from 'react';
import {
  INTERIORS, LIMITS, MATERIALS, STARTERS, STD_WIDTHS, TOP_HEIGHTS, sanitize, sectionsWidth,
  type Design, type Front, type Section,
} from './model/design';
import { allowedWidths, canAddSection, copySection, fitToSpace, leftover, suggest, type Change } from './model/layout';
import { build } from './model/build';
import { quote, RATES } from './model/pricing';
import { cutList } from './model/cutlist';
import { useHistory } from './history';
import { makeT, type Lang, type T } from './i18n';
import { Scene, type ViewMode } from './three/Scene';
import { SWATCHES } from './three/materials';
import { Segmented, Slider, Stepper, Toggle } from './ui/controls';

const fit = (d: Partial<Design>) => fitToSpace(sanitize(d)).design;
const starterDesign = (id: string) => fit(structuredClone(STARTERS.find((s) => s.id === id)!.design));

// The design lives in the URL hash so any design can be shared as a link.
function readHash(): Design | null {
  try {
    const raw = location.hash.slice(1);
    return raw ? fit(JSON.parse(decodeURIComponent(atob(raw)))) : null;
  } catch {
    return null;
  }
}
const writeHash = (d: Design) =>
  history.replaceState(null, '', '#' + btoa(encodeURIComponent(JSON.stringify(d))));

type ThemePref = 'auto' | 'light' | 'dark';
function useDarkMode() {
  const [pref, setPref] = useState<ThemePref>(() => (localStorage.getItem('theme') as ThemePref) || 'auto');
  const query = useMemo(() => matchMedia('(prefers-color-scheme: dark)'), []);
  const [systemDark, setSystemDark] = useState(query.matches);
  useEffect(() => {
    const on = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    query.addEventListener('change', on);
    return () => query.removeEventListener('change', on);
  }, [query]);
  const dark = pref === 'dark' || (pref === 'auto' && systemDark);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem('theme', pref);
  }, [dark, pref]);
  return { dark, toggle: () => setPref(dark ? 'light' : 'dark') };
}

export default function App() {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('lang') as Lang) || 'ar');
  const hist = useHistory<Design>(() => readHash() ?? starterDesign(STARTERS[0].id));
  const design = hist.present;
  const [selectedRaw, setSelected] = useState<number | null>(null);
  const [fitKey, setFitKey] = useState(0);
  const [mode, setMode] = useState<ViewMode>('closed');
  const [showDims, setShowDims] = useState(true);
  const [showClothes, setShowClothes] = useState(true);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<{ changes: Change[]; id: number } | null>(null);
  const { dark, toggle: toggleDark } = useDarkMode();
  const panelRef = useRef<HTMLElement>(null);

  const t = useMemo(() => makeT(lang), [lang]);
  const b = useMemo(() => build(design), [design]);
  const q = useMemo(() => quote(design, b), [design, b]);
  const cuts = useMemo(() => cutList(b), [b]);
  const selected = selectedRaw !== null && selectedRaw < design.sections.length ? selectedRaw : null;

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.title = t.t('title');
    localStorage.setItem('lang', lang);
  }, [lang, t]);
  useEffect(() => writeHash(design), [design]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); hist.undo(); }
      else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); hist.redo(); }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [hist]);

  const notify = (changes: Change[]) => { if (changes.length) setToast({ changes, id: Date.now() }); };
  const commit = (d: Design, group?: string) => hist.commit(d, group);
  const setSections = (sections: Section[]) => commit({ ...design, sections });
  const updateSection = (i: number, patch: Partial<Section>) =>
    setSections(design.sections.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const applyToAll = (i: number, keys: (keyof Section)[]) => {
    const src = design.sections[i];
    setSections(design.sections.map((s) => ({ ...s, ...Object.fromEntries(keys.map((k) => [k, src[k]])) })));
  };

  const setSpace = (space: number) => {
    // Recompute from the state before this drag began, so shrinking then widening restores sections.
    const result = fitToSpace({ ...hist.base('space'), space });
    commit(result.design, 'space');
    notify(result.changes);
  };
  const addSection = (after = design.sections.length - 1) => {
    const copy = copySection(design, design.sections[after]);
    if (!copy) return;
    const sections = [...design.sections];
    sections.splice(after + 1, 0, copy);
    setSections(sections);
    setSelected(after + 1);
  };
  const removeSection = (i: number) => {
    setSections(design.sections.filter((_, j) => j !== i));
    setSelected(null);
    notify([{ type: 'removed', n: i + 1 }]);
  };
  const moveSection = (i: number, dir: -1 | 1) => {
    const sections = [...design.sections];
    [sections[i], sections[i + dir]] = [sections[i + dir], sections[i]];
    setSections(sections);
    setSelected(i + dir);
  };
  const loadStarter = (id: string) => {
    commit(starterDesign(id));
    setSelected(null);
    setFitKey((k) => k + 1);
  };
  const select = (i: number | null, fromScene = false) => {
    setSelected(i);
    if (!fromScene || !panelRef.current) return;
    if (matchMedia('(min-width: 900px)').matches) panelRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    else panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const copyLink = async () => {
    await navigator.clipboard?.writeText(location.href).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const finishLabel = (f: string) => (f === 'body' ? t.t(`mat.${design.material}`) : t.t(`finishName.${f}`));

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>{t.t('title')}</h1>
          <p className="muted">{t.t('poc')}</p>
        </div>
        <div className="topbar-actions">
          <button type="button" className="icon" onClick={hist.undo} disabled={!hist.canUndo} title={t.t('undo')} aria-label={t.t('undo')}>↶</button>
          <button type="button" className="icon" onClick={hist.redo} disabled={!hist.canRedo} title={t.t('redo')} aria-label={t.t('redo')}>↷</button>
          <button type="button" className="icon" onClick={toggleDark} title={dark ? t.t('lightMode') : t.t('darkMode')} aria-label={dark ? t.t('lightMode') : t.t('darkMode')}>{dark ? '☀' : '☾'}</button>
          <button type="button" className="ghost" onClick={copyLink}>{copied ? t.t('copied') : t.t('copyLink')}</button>
          <button type="button" className="ghost" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}>{t.t('lang')}</button>
        </div>
      </header>

      <section className="viewer">
        <Scene
          design={design} build={b} mode={mode} showDims={showDims} showClothes={showClothes} fitKey={fitKey} t={t}
          selected={selected} onSelect={(i) => select(i, true)} dark={dark}
        />
        <div className="viewer-bar">
          <Segmented<ViewMode>
            small value={mode} onChange={setMode}
            options={(['closed', 'open', 'interior'] as ViewMode[]).map((m) => ({ value: m, label: t.t(`view.${m}`) }))}
          />
          <div className="toggles">
            <button type="button" className={showDims ? 'chip on' : 'chip'} onClick={() => setShowDims(!showDims)}>{t.t('dims')}</button>
            <button type="button" className={showClothes ? 'chip on' : 'chip'} onClick={() => setShowClothes(!showClothes)}>{t.t('clothes')}</button>
          </div>
        </div>
        <div className="price-pill">
          <span>{t.t('quote')}</span>
          <strong>{t.money(q.total)}</strong>
        </div>
      </section>

      <main className="panel" ref={panelRef}>
        <nav className="strip" dir="ltr">
          <button type="button" className={selected === null ? 'tab on' : 'tab'} onClick={() => select(null)} dir="auto">
            {t.t('wardrobeTab')}
          </button>
          {design.sections.map((s, i) => (
            <button key={s.id} type="button" className={selected === i ? 'tab on' : 'tab'} onClick={() => select(i)}>
              <bdi><strong>{t.num(i + 1)}</strong></bdi> <bdi className="muted">{t.num(s.width)}</bdi>
            </button>
          ))}
          <button
            type="button" className="tab add" onClick={() => addSection()} disabled={!canAddSection(design)}
            title={t.t('addSection')} aria-label={t.t('addSection')}
          >
            +
          </button>
        </nav>

        {selected === null ? (
          <WardrobeEditor
            design={design} t={t} commit={commit} setSpace={setSpace} loadStarter={loadStarter}
            addSection={() => addSection()} updateSection={updateSection}
          />
        ) : (
          <SectionEditor
            key={design.sections[selected].id} design={design} i={selected} t={t}
            update={(patch) => updateSection(selected, patch)} applyToAll={(keys) => applyToAll(selected, keys)}
            duplicate={() => addSection(selected)} remove={() => removeSection(selected)} move={(dir) => moveSection(selected, dir)}
          />
        )}

        {b.warnings.length > 0 && (
          <section className="warnings">
            <h2>{t.t('warnings')}</h2>
            <ul>{b.warnings.map((w, i) => <li key={i}>{t.t(w.key, w.vars)}</li>)}</ul>
          </section>
        )}

        <section className="quote">
          <h2>{t.t('quote')}</h2>
          <table>
            <tbody>
              {q.customer.map((l) => (
                <tr key={l.key}><td>{t.t(l.key, l.vars)}</td><td className="num">{t.money(l.amount)}</td></tr>
              ))}
            </tbody>
          </table>
          <div className="total-row"><span>{t.t('total')}</span><span className="total">{t.money(q.total)}</span></div>
          <p>{t.t('deposit', { pct: RATES.depositPct * 100 })}: <strong>{t.money(q.deposit)}</strong></p>
          <p className="muted">{t.t('leadTime', { weeks: RATES.leadTimeWeeks })}</p>
        </section>

        <section className="workshop">
          <h2>{t.t('workshop')}</h2>
          <p className="muted">{t.t('workshopNote')}</p>
          <details>
            <summary>{t.t('costBreakdown')}</summary>
            <table>
              <tbody>
                {q.workshop.map((l) => (
                  <tr key={l.key}><td>{t.t(l.key, l.vars)}</td><td className="num">{t.money(l.amount)}</td></tr>
                ))}
                <tr className="sum"><td>{t.t('total')}</td><td className="num">{t.money(q.total)}</td></tr>
              </tbody>
            </table>
          </details>
          <details>
            <summary>{t.t('cutList')}</summary>
            <table className="cuts">
              <thead>
                <tr><th>{t.t('col.part')}</th><th>{t.t('col.qty')}</th><th>{t.t('col.size')}</th><th>{t.t('col.material')}</th></tr>
              </thead>
              <tbody>
                {cuts.map((r, i) => (
                  <tr key={i}>
                    <td>{r.zone === 'top' ? `${t.t('zone.top')} · ` : ''}{t.t(`part.${r.kind}`)}</td>
                    <td className="num">{t.num(r.qty)}</td>
                    <td className="num" dir="ltr">{t.num(r.length)} × {t.num(r.width)}</td>
                    <td>{finishLabel(r.finish)} {t.num(r.thickness)}mm</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </section>
      </main>

      {toast && (
        <div className="toast" key={toast.id} role="status">
          <span>
            {toast.changes.slice(0, 2).map((c, k) => (
              <bdi key={k} className="toast-item">{c.type === 'narrowed' ? t.t('change.narrowed', c) : t.t('change.removed', c)}</bdi>
            ))}
            {toast.changes.length > 2 && <bdi className="toast-item">{t.t('change.more', { n: toast.changes.length - 2 })}</bdi>}
          </span>
          <button type="button" onClick={() => { hist.undo(); setToast(null); }}>{t.t('undo')}</button>
        </div>
      )}
    </div>
  );
}

function WardrobeEditor(props: {
  design: Design; t: T; commit: (d: Design, group?: string) => void;
  setSpace: (v: number) => void; loadStarter: (id: string) => void; addSection: () => void;
  updateSection: (i: number, patch: Partial<Section>) => void;
}) {
  const { design, t, commit, setSpace, loadStarter, addSection, updateSection } = props;
  const cm = (v: number) => `${t.num(v)} ${t.t('cm')}`;
  const left = leftover(design);
  const hint = suggest(design);
  const update = (patch: Partial<Design>, group?: string) => commit({ ...design, ...patch }, group);
  return (
    <>
      <p className="muted hint">{t.t('tapHint')}</p>
      <section>
        <h2>{t.t('starters')}</h2>
        <div className="starters">
          {STARTERS.map((s) => (
            <button key={s.id} type="button" className="starter" onClick={() => loadStarter(s.id)}>
              <span className="swatch" style={{ background: SWATCHES[s.design.material].color }} />
              {t.t(`starter.${s.id}`)}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2>{t.t('size')}</h2>
        <Slider label={t.t('space')} {...LIMITS.space} value={design.space} display={cm(design.space)} onChange={setSpace} />
        <p className="muted">{t.t('spaceHint')}</p>
        <div className="fit">
          <span>{left > 0 ? t.t('fit.summary', { w: sectionsWidth(design), left }) : t.t('fit.full', { w: sectionsWidth(design) })}</span>
          {hint?.type === 'add' && <button type="button" className="link" onClick={addSection}>{t.t('fit.add')}</button>}
          {hint?.type === 'widen' && (
            <button type="button" className="link" onClick={() => updateSection(hint.index, { width: hint.to })}>
              {t.t('fit.widen', { n: hint.index + 1, w: hint.to })}
            </button>
          )}
        </div>
        <Slider label={t.t('height')} {...LIMITS.height} value={design.height} display={cm(design.height)} onChange={(height) => update({ height }, 'height')} />
        <p className="muted">{t.t('heightHint')}</p>
        <Slider label={t.t('depth')} {...LIMITS.depth} value={design.depth} display={cm(design.depth)} onChange={(depth) => update({ depth }, 'depth')} />
      </section>

      <section>
        <h2>{t.t('top')}</h2>
        <Segmented<number>
          value={design.top} onChange={(top) => update({ top })}
          options={TOP_HEIGHTS.map((h) => ({ value: h, label: h ? t.num(h) : t.t('topNone') }))}
        />
        <p className="muted">{t.t('topHint')}</p>
      </section>

      <section>
        <h2>{t.t('doors')}</h2>
        <Segmented
          value={design.doorType} onChange={(doorType) => update({ doorType })}
          options={[{ value: 'hinged', label: t.t('door.hinged') }, { value: 'none', label: t.t('door.none') }]}
        />
        <div className="field">
          <span>{t.t('handle')}</span>
          <Segmented
            small value={design.handle} onChange={(handle) => update({ handle })}
            options={[{ value: 'bar', label: t.t('handle.bar') }, { value: 'knob', label: t.t('handle.knob') }]}
          />
        </div>
      </section>

      <section>
        <h2>{t.t('material')}</h2>
        <div className="materials">
          {MATERIALS.map((m) => (
            <button key={m} type="button" className={design.material === m ? 'material on' : 'material'} onClick={() => update({ material: m })}>
              <span
                className="swatch big"
                style={{
                  background: SWATCHES[m].grain
                    ? `repeating-linear-gradient(95deg, ${SWATCHES[m].color} 0 5px, ${SWATCHES[m].grain} 6px 7px, ${SWATCHES[m].color} 8px 12px)`
                    : SWATCHES[m].color,
                }}
              />
              {t.t(`mat.${m}`)}
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

function SectionEditor(props: {
  design: Design; i: number; t: T; update: (patch: Partial<Section>) => void; applyToAll: (keys: (keyof Section)[]) => void;
  duplicate: () => void; remove: () => void; move: (dir: -1 | 1) => void;
}) {
  const { design, i, t, update, applyToAll, duplicate, remove, move } = props;
  const s = design.sections[i];
  const n = design.sections.length;
  const allowed = allowedWidths(design, i);
  const hasDoors = design.doorType === 'hinged';
  const glass = s.front === 'glass' || s.front === 'frosted';
  const setFront = (front: Front) => update({ front });
  return (
    <>
      <section>
        <div className="section-head">
          <h2>{t.t('section', { n: i + 1 })} <bdi className="sub">{t.num(s.width)} {t.t('cm')}</bdi></h2>
        </div>
        <div className="actions" dir="ltr">
          <button type="button" onClick={() => move(-1)} disabled={i === 0} title={t.t('moveLeft')} aria-label={t.t('moveLeft')}>←</button>
          <button type="button" onClick={() => move(1)} disabled={i === n - 1} title={t.t('moveRight')} aria-label={t.t('moveRight')}>→</button>
          <button type="button" onClick={duplicate} disabled={!canAddSection(design)}>{t.t('duplicate')}</button>
          <button type="button" className="danger" onClick={remove} disabled={n === 1}>{t.t('remove')}</button>
        </div>
        <div className="field">
          <span>{t.t('sectionWidth')}</span>
          <Segmented<number>
            value={s.width} onChange={(width) => update({ width })}
            options={STD_WIDTHS.map((w) => ({ value: w, label: t.num(w), disabled: !allowed.includes(w) }))}
          />
          {allowed.length < STD_WIDTHS.length && <p className="muted">{t.t('widthLocked')}</p>}
        </div>
      </section>

      <section>
        <h2>{t.t('interior')}</h2>
        <Segmented
          small value={s.interior} onChange={(interior) => update({ interior })}
          options={INTERIORS.map((v) => ({ value: v, label: t.t(`interior.${v}`) }))}
        />
        <Stepper label={t.t('drawers')} value={s.drawers} {...LIMITS.drawers} format={t.num} onChange={(drawers) => update({ drawers })} />
        {s.interior === 'shelves' && (
          <Stepper label={t.t('shelves')} value={s.shelves} {...LIMITS.shelves} format={t.num} onChange={(shelves) => update({ shelves })} />
        )}
      </section>

      <section>
        <h2>{t.t('accessories')}</h2>
        <div className="accessory">
          <Toggle label={t.t('acc.light')} checked={s.light} onChange={(light) => update({ light })} />
          {n > 1 && <button type="button" className="link" onClick={() => applyToAll(['light'])}>{t.t('applyAll')}</button>}
        </div>
        <div className="accessory">
          <Toggle label={t.t('acc.mirror')} checked={s.front === 'mirror'} disabled={!hasDoors} onChange={(on) => setFront(on ? 'mirror' : 'wood')} />
          {!hasDoors ? <span className="muted">{t.t('needsDoors')}</span>
            : n > 1 && <button type="button" className="link" onClick={() => applyToAll(['front'])}>{t.t('applyAll')}</button>}
        </div>
        <div className="accessory">
          <Toggle label={t.t('acc.glass')} checked={glass} disabled={!hasDoors} onChange={(on) => setFront(on ? 'glass' : 'wood')} />
          {!hasDoors ? <span className="muted">{t.t('needsDoors')}</span>
            : n > 1 && <button type="button" className="link" onClick={() => applyToAll(['front'])}>{t.t('applyAll')}</button>}
        </div>
        {glass && hasDoors && (
          <Segmented
            small value={s.front} onChange={setFront}
            options={(['glass', 'frosted'] as Front[]).map((v) => ({ value: v, label: t.t(`glass.${v}`) }))}
          />
        )}
      </section>
    </>
  );
}
