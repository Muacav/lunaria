import { cycleHistory, dayInfo } from '../lib/cycle.js';
import { fmt } from '../lib/dates.js';

export default function Insights({ t, locale, analysis, state, periodSet }) {
  const history = cycleHistory(analysis);
  const maxLen = Math.max(35, ...history.map((h) => h.length));

  // How often each symptom and mood was logged.
  const counts = {};
  const byPhase = {};
  for (const [day, log] of Object.entries(state.logs)) {
    const phase = dayInfo(analysis, day, periodSet).phase;
    for (const s of log.symptoms || []) counts['sym.' + s] = (counts['sym.' + s] || 0) + 1;
    for (const m of log.mood || []) {
      counts['mood.' + m] = (counts['mood.' + m] || 0) + 1;
      if (phase) {
        byPhase[phase] ??= {};
        byPhase[phase][m] = (byPhase[phase][m] || 0) + 1;
      }
    }
  }
  const top = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const topMax = top[0]?.[1] || 1;
  const phases = ['menstrual', 'follicular', 'fertile', 'luteal'].filter((p) => byPhase[p]);

  const variation = analysis.cycleLengths.length >= 2 ? Math.round(analysis.sd) : null;

  return (
    <div>
      <h1 className="screen-title">{t('ins.title')}</h1>

      <div className="stats">
        <div className="stat">
          <div className="v">
            {analysis.avgCycle}
            <small>{t('ob.days')}</small>
          </div>
          <div className="k">{t('ins.avgCycle')}</div>
        </div>
        <div className="stat">
          <div className="v">
            {analysis.avgPeriod}
            <small>{t('ob.days')}</small>
          </div>
          <div className="k">{t('ins.avgPeriod')}</div>
        </div>
        <div className="stat">
          <div className="v">
            {variation === null ? '–' : `±${variation}`}
            {variation !== null && <small>{t('ob.days')}</small>}
          </div>
          <div className="k">{t('ins.variation')}</div>
        </div>
      </div>
      <p className="note">{t('ins.' + analysis.regularity)}</p>

      <h2 className="section-title">{t('ins.history')}</h2>
      {history.length ? (
        <ul className="history">
          {history.map((h, idx) => (
            <li key={h.start} style={{ '--i': idx }}>
              <div className="row-top">
                <span>{fmt(h.start, locale, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                <span>
                  <strong>{t('ins.cycleRow', { n: h.length })}</strong> · {t('ins.periodPart', { n: h.periodLen })}
                </span>
              </div>
              <div className="bar" style={{ width: `${(h.length / maxLen) * 100}%`, '--i': idx }}>
                <span className="seg" style={{ left: 0, width: `${(h.periodLen / h.length) * 100}%`, background: 'var(--period)' }} />
                <span
                  className="seg"
                  style={{
                    left: `${((h.ovulationDay - 6) / h.length) * 100}%`,
                    width: `${(7 / h.length) * 100}%`,
                    background: 'var(--fertile)',
                    opacity: 0.55,
                  }}
                />
                <span
                  className="seg"
                  style={{ left: `${((h.ovulationDay - 1) / h.length) * 100}%`, width: `${(1 / h.length) * 100}%`, background: 'var(--ovulation)' }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="note">{t('ins.historyEmpty')}</p>
      )}

      <h2 className="section-title">{t('ins.symptoms')}</h2>
      {top.length ? (
        <ul className="freq">
          {top.map(([k, n], idx) => (
            <li key={k} style={{ '--i': idx }}>
              <span>{t(k)}</span>
              <span className="track">
                <span className="fill" style={{ display: 'block', width: `${(n / topMax) * 100}%`, background: k.startsWith('mood') ? 'var(--follicular)' : 'var(--luteal)' }} />
              </span>
              <span className="tiny">{t('ins.times', { n })}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="note">{t('ins.symptomsEmpty')}</p>
      )}

      {phases.length > 0 && (
        <>
          <h2 className="section-title">{t('ins.byPhase')}</h2>
          <div className="by-phase">
            {phases.map((p) => {
              const [mood] = Object.entries(byPhase[p]).sort((a, b) => b[1] - a[1])[0];
              return (
                <div key={p} data-phase={p}>
                  <div className="p">{t('phase.' + p)}</div>
                  <div className="m">{t('mood.' + mood)}</div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
