import { useState } from 'react';
import { Sparkles, NotebookPen } from 'lucide-react';
import Dial from '../components/Dial.jsx';
import WeekStrip from '../components/WeekStrip.jsx';
import { logLabels } from '../components/LogSheet.jsx';
import { toast } from '../components/toast.jsx';
import { pregnancyChance } from '../lib/cycle.js';
import { addDays, diffDays, fmt, fromDay, toDay } from '../lib/dates.js';
import { addPeriodDays, removePeriodDaysAfter } from '../lib/store.js';

export default function Today({ t, locale, analysis, state, today, periodSet, onLog, onDay }) {
  const [preview, setPreview] = useState(null);
  const phaseKey = analysis.hasData ? (analysis.late > 0 ? 'late' : analysis.phase) : 'menstrual';

  function started() {
    const days = Array.from({ length: analysis.avgPeriod }, (_, i) => addDays(today, i));
    addPeriodDays(days);
    toast(t('today.startedToast'));
  }

  function ended() {
    removePeriodDaysAfter(today, analysis.currentPeriodEnd);
    toast(t('today.endedToast'));
  }

  const log = state.logs[today];
  const labels = logLabels(log, t);

  return (
    <div data-phase={phaseKey}>
      <header className="today-head">
        <h1 className="hello">{t('today.hello', { name: state.profile.name || '' })}</h1>
        <span className="tiny">{fmt(today, locale, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
      </header>

      <WeekStrip analysis={analysis} periodSet={periodSet} logs={state.logs} today={today} locale={locale} onPick={onDay} />

      <div data-phase={preview || phaseKey}>
        <Dial analysis={analysis} t={t} locale={locale} onPreview={setPreview} />
      </div>

      {analysis.hasData && (
        <div className="dial-meta">
          <div>
            <span className="phase-name">{t('phase.' + phaseKey)}</span>
            <span className="muted"> · {t('today.cycleDay', { n: analysis.cycleDay })}</span>
          </div>
          <div className="tiny">{t('today.chance', { level: t('today.chance.' + pregnancyChance(analysis, today)) })}</div>
        </div>
      )}

      <div className="actions">
        {analysis.inPeriod ? (
          <button className="btn btn-soft" onClick={ended}>
            {t('today.ended')}
          </button>
        ) : (
          <button className="btn btn-soft" onClick={started} style={{ '--phase-soft': 'var(--period-soft)' }}>
            {t('today.started')}
          </button>
        )}
        <button className="btn btn-primary" onClick={() => onLog(today)}>
          <NotebookPen size={18} />
          {t('today.log')}
        </button>
      </div>

      {analysis.hasData && (
        <section className="phase-story" data-phase={phaseKey}>
          <h2>{t('phase.' + phaseKey)}</h2>
          <p>{t('about.' + phaseKey)}</p>
          <div className="tip">
            <Sparkles size={18} />
            <div>
              <strong>{t('today.tip')}. </strong>
              {t('tip.' + phaseKey)}
            </div>
          </div>
        </section>
      )}

      <section className="logged-today">
        <h2 className="section-title">{t('today.yourLog')}</h2>
        {labels.length ? (
          <button className="chips" onClick={() => onLog(today)} style={{ textAlign: 'left' }}>
            {labels.map((l) => (
              <span className="chip chip-static" key={l}>
                {l}
              </span>
            ))}
          </button>
        ) : (
          <div className="empty-log">
            <span>{t('today.nothing')}</span>
            <button className="btn btn-line" style={{ minHeight: 40 }} onClick={() => onLog(today)}>
              {t('today.log')}
            </button>
          </div>
        )}
      </section>

      {analysis.hasData && <Upcoming analysis={analysis} t={t} locale={locale} today={today} />}

      <p className="disclaimer">{t('today.disclaimer')}</p>
    </div>
  );
}

export function Upcoming({ analysis, t, locale, today }) {
  const tday = toDay(today);
  const nextFertile = analysis.cycles.find((c) => c.fertileEnd >= tday);
  const nextOvu = analysis.cycles.find((c) => c.ovulation >= tday);
  const short = { day: 'numeric', month: 'short' };
  const rel = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const inDays = (iso) => rel.format(diffDays(iso, today), 'day');

  return (
    <section>
      <h2 className="section-title">{t('today.coming')}</h2>
      <ul className="upcoming">
        <li>
          <span className="swatch" style={{ background: 'var(--period)' }} />
          <span>
            {t('today.nextPeriod')}
            <br />
            <span className="tiny">{inDays(analysis.nextPeriod)}</span>
          </span>
          <span className="when">{fmt(analysis.nextPeriod, locale, { weekday: 'short', ...short })}</span>
        </li>
        {nextFertile && (
          <li>
            <span className="swatch" style={{ background: 'var(--fertile)' }} />
            <span>{t('today.fertile')}</span>
            <span className="when">
              {fmt(fromDay(nextFertile.fertileStart), locale, short)} – {fmt(fromDay(nextFertile.fertileEnd), locale, short)}
            </span>
          </li>
        )}
        {nextOvu && (
          <li>
            <span className="swatch" style={{ background: 'var(--ovulation)' }} />
            <span>{t('today.ovulation')}</span>
            <span className="when">{fmt(fromDay(nextOvu.ovulation), locale, { weekday: 'short', ...short })}</span>
          </li>
        )}
      </ul>
    </section>
  );
}
