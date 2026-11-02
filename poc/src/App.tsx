import { useEffect, useMemo, useState } from 'react';
import {
  DOOR_FINISHES, INTERIORS, LIMITS, MATERIALS, STARTERS, normalize, validBayCounts,
  type Bay, type Design,
} from './model/design';
import { build } from './model/build';
import { quote, RATES } from './model/pricing';
import { cutList } from './model/cutlist';
import { makeT, type Lang } from './i18n';
import { Scene, type ViewMode } from './three/Scene';
import { SWATCHES } from './three/materials';
import { Segmented, Slider, Stepper } from './ui/controls';

// The design lives in the URL hash so any design can be shared as a link.
function readHash(): Design | null {
  try {
    const raw = location.hash.slice(1);
    return raw ? normalize(JSON.parse(decodeURIComponent(atob(raw)))) : null;
  } catch {
    return null;
  }
}
const writeHash = (d: Design) =>
  history.replaceState(null, '', '#' + btoa(encodeURIComponent(JSON.stringify(d))));

export default function App() {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('lang') as Lang) || 'ar');
  const [design, setDesign] = useState<Design>(() => readHash() ?? normalize(STARTERS[0].design));
  const [starter, setStarter] = useState<string | null>(() => (location.hash ? null : STARTERS[0].id));
  const [fitKey, setFitKey] = useState(0);
  const [mode, setMode] = useState<ViewMode>('closed');
  const [showDims, setShowDims] = useState(true);
  const [showClothes, setShowClothes] = useState(true);
  const [copied, setCopied] = useState(false);

  const t = useMemo(() => makeT(lang), [lang]);
  const b = useMemo(() => build(design), [design]);
  const q = useMemo(() => quote(design, b), [design, b]);
  const cuts = useMemo(() => cutList(b), [b]);
  const bayOptions = validBayCounts(design.width);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.title = t.t('title');
    localStorage.setItem('lang', lang);
  }, [lang, t]);
  useEffect(() => writeHash(design), [design]);

  const update = (patch: Partial<Design>) => {
    setStarter(null);
    setDesign((d) => normalize({ ...d, ...patch }));
  };
  const updateBay = (i: number, patch: Partial<Bay>) =>
    update({ bays: design.bays.map((bay, j) => (j === i ? { ...bay, ...patch } : bay)) });
  const setBayCount = (n: number) => {
    const bays = Array.from({ length: n }, (_, i) => design.bays[i] ?? { ...design.bays[design.bays.length - 1] });
    update({ bays });
  };
  const loadStarter = (id: string) => {
    const s = STARTERS.find((x) => x.id === id)!;
    setDesign(normalize(s.design));
    setStarter(id);
    setFitKey((k) => k + 1);
  };
  const copyLink = async () => {
    await navigator.clipboard?.writeText(location.href).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const cm = (v: number) => `${t.num(v)} ${t.t('cm')}`;
  const finishLabel = (f: string) => (f === 'body' ? t.t(`mat.${design.material}`) : t.t(`finishName.${f}`));

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>{t.t('title')}</h1>
          <p className="muted">{t.t('poc')}</p>
        </div>
        <div className="topbar-actions">
          <button type="button" className="ghost" onClick={copyLink}>{copied ? t.t('copied') : t.t('copyLink')}</button>
          <button type="button" className="ghost" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}>{t.t('lang')}</button>
        </div>
      </header>

      <section className="viewer">
        <Scene design={design} build={b} mode={mode} showDims={showDims} showClothes={showClothes} fitKey={fitKey} t={t} />
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

      <main className="panel">
        <section>
          <h2>{t.t('starters')}</h2>
          <div className="starters">
            {STARTERS.map((s) => (
              <button key={s.id} type="button" className={starter === s.id ? 'starter on' : 'starter'} onClick={() => loadStarter(s.id)}>
                <span className="swatch" style={{ background: SWATCHES[s.design.material].color }} />
                {t.t(`starter.${s.id}`)}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2>{t.t('size')}</h2>
          <Slider label={t.t('width')} {...LIMITS.width} value={design.width} display={cm(design.width)} onChange={(width) => update({ width })} />
          <Slider label={t.t('height')} {...LIMITS.height} value={design.height} display={cm(design.height)} onChange={(height) => update({ height })} />
          <Slider label={t.t('depth')} {...LIMITS.depth} value={design.depth} display={cm(design.depth)} onChange={(depth) => update({ depth })} />
        </section>

        <section>
          <h2>{t.t('sections')}</h2>
          <p className="muted">{t.t('sectionsHint')}</p>
          <Segmented<number>
            value={design.bays.length} onChange={setBayCount}
            options={[1, 2, 3, 4].map((n) => ({ value: n, label: t.num(n), disabled: !bayOptions.includes(n) }))}
          />
          <div className="bays">
            {design.bays.map((bay, i) => (
              <div className="bay" key={i}>
                <h3>{t.t('section', { n: i + 1 })}</h3>
                <Segmented
                  small value={bay.interior} onChange={(interior) => updateBay(i, { interior })}
                  options={INTERIORS.map((v) => ({ value: v, label: t.t(`interior.${v}`) }))}
                />
                <Stepper
                  label={t.t('drawers')} value={bay.drawers} {...LIMITS.drawers} format={t.num}
                  onChange={(drawers) => updateBay(i, { drawers })}
                />
                {bay.interior === 'shelves' && (
                  <Stepper
                    label={t.t('shelves')} value={bay.shelves} {...LIMITS.shelves} format={t.num}
                    onChange={(shelves) => updateBay(i, { shelves })}
                  />
                )}
                {design.doorType !== 'none' && (
                  <div className="field">
                    <span>{t.t('doorFinish')}</span>
                    <Segmented
                      small value={bay.door} onChange={(door) => updateBay(i, { door })}
                      options={DOOR_FINISHES.map((v) => ({ value: v, label: t.t(`finish.${v}`) }))}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2>{t.t('doors')}</h2>
          <Segmented
            value={design.doorType} onChange={(doorType) => update({ doorType })}
            options={[
              { value: 'hinged', label: t.t('door.hinged') },
              { value: 'sliding', label: t.t('door.sliding'), disabled: design.bays.length < 2 },
              { value: 'none', label: t.t('door.none') },
            ]}
          />
          {design.bays.length < 2 && <p className="muted">{t.t('slidingNeeds2')}</p>}
          {design.doorType !== 'sliding' && (
            <div className="field">
              <span>{t.t('handle')}</span>
              <Segmented
                small value={design.handle} onChange={(handle) => update({ handle })}
                options={[{ value: 'bar', label: t.t('handle.bar') }, { value: 'knob', label: t.t('handle.knob') }]}
              />
            </div>
          )}
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

        {b.warnings.length > 0 && (
          <section className="warnings">
            <h2>{t.t('warnings')}</h2>
            <ul>{b.warnings.map((w, i) => <li key={i}>{t.t(w.key, w.vars)}</li>)}</ul>
          </section>
        )}

        <section className="quote">
          <h2>{t.t('quote')}</h2>
          <div className="total">{t.money(q.total)}</div>
          <p>{t.t('deposit', { pct: RATES.depositPct * 100 })}: <strong>{t.money(q.deposit)}</strong></p>
          <p className="muted">{t.t('leadTime', { weeks: RATES.leadTimeWeeks })}</p>
          <details>
            <summary>{t.t('breakdown')}</summary>
            <table>
              <tbody>
                {q.lines.map((l) => (
                  <tr key={l.key}><td>{t.t(l.key, l.vars)}</td><td className="num">{t.money(l.amount)}</td></tr>
                ))}
                <tr className="sum"><td>{t.t('total')}</td><td className="num">{t.money(q.total)}</td></tr>
              </tbody>
            </table>
          </details>
        </section>

        <section>
          <details>
            <summary>{t.t('cutList')}</summary>
            <table className="cuts">
              <thead>
                <tr><th>{t.t('col.part')}</th><th>{t.t('col.qty')}</th><th>{t.t('col.size')}</th><th>{t.t('col.material')}</th></tr>
              </thead>
              <tbody>
                {cuts.map((r, i) => (
                  <tr key={i}>
                    <td>{t.t(`part.${r.kind}`)}</td>
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
    </div>
  );
}
