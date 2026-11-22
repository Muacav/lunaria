import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pencil, Check } from 'lucide-react';
import Sheet from '../components/Sheet.jsx';
import { logLabels } from '../components/LogSheet.jsx';
import { dayInfo, pregnancyChance } from '../lib/cycle.js';
import { addMonths, daysInMonth, fmt, startOfMonth, weekday, addDays } from '../lib/dates.js';
import { togglePeriodDay } from '../lib/store.js';

export default function Calendar({ t, locale, analysis, state, today, periodSet, onLog, focusDay, onFocusDay }) {
  const [month, setMonth] = useState(startOfMonth(focusDay || today));
  const [editing, setEditing] = useState(false);
  const [dir, setDir] = useState(null);
  const move = (n) => {
    setDir(n > 0 ? 'slide-next' : 'slide-prev');
    setMonth((m) => addMonths(m, n));
  };
  const touch = useRef(null);

  const first = weekday(month);
  const count = daysInMonth(month);
  const cells = [...Array(first).fill(null), ...Array.from({ length: count }, (_, i) => addDays(month, i))];
  const dows = Array.from({ length: 7 }, (_, i) => fmt(addDays('2026-11-23', i), locale, { weekday: 'narrow' }));

  function onTap(d) {
    if (editing) {
      if (d <= today) togglePeriodDay(d);
    } else onFocusDay(d);
  }

  function onTouchStart(e) {
    touch.current = e.touches[0].clientX;
  }
  function onTouchEnd(e) {
    if (touch.current == null) return;
    const dx = e.changedTouches[0].clientX - touch.current;
    if (Math.abs(dx) > 60) move(dx < 0 ? 1 : -1);
    touch.current = null;
  }

  return (
    <div>
      <div className="cal-head">
        <h1>{fmt(month, locale, { month: 'long', year: 'numeric' })}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="icon-btn" aria-label={t('cal.prev')} onClick={() => move(-1)}>
            <ChevronLeft size={20} />
          </button>
          <button className="icon-btn" aria-label={t('cal.next')} onClick={() => move(1)}>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {editing && <p className="edit-hint">{t('cal.editHint')}</p>}

      <div
        key={month}
        className={`cal-grid ${editing ? 'cal-editing' : ''} ${dir || ''}`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {dows.map((d, i) => (
          <div className="cal-dow" key={i}>
            {d}
          </div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={'b' + i} />;
          const info = dayInfo(analysis, d, periodSet);
          return (
            <button
              key={d}
              className="cal-day"
              data-kind={info.kind || ''}
              data-today={d === today}
              data-future={d > today}
              data-selected={d === focusDay}
              onClick={() => onTap(d)}
              aria-label={fmt(d, locale, { weekday: 'long', day: 'numeric', month: 'long' }) + (info.kind ? ', ' + t('cal.legend.' + info.kind) : '')}
              aria-pressed={editing ? info.logged : undefined}
            >
              <span className="disc">{Number(d.slice(8))}</span>
              {state.logs[d] && <span className="logdot" />}
            </button>
          );
        })}
      </div>

      <div className="legend">
        <span>
          <i style={{ background: 'var(--period)' }} />
          {t('cal.legend.period')}
        </span>
        <span>
          <i style={{ boxShadow: 'inset 0 0 0 1.5px var(--period)' }} />
          {t('cal.legend.predicted')}
        </span>
        <span>
          <i style={{ background: 'var(--fertile-soft)', boxShadow: 'inset 0 0 0 1.5px var(--fertile)' }} />
          {t('cal.legend.fertile')}
        </span>
        <span>
          <i style={{ background: 'var(--fertile-soft)', boxShadow: 'inset 0 0 0 2px var(--ovulation)' }} />
          {t('cal.legend.ovulation')}
        </span>
      </div>

      <div className="cal-tools">
        <button className={`btn ${editing ? 'btn-ink' : 'btn-line'}`} onClick={() => setEditing(!editing)}>
          {editing ? <Check size={18} /> : <Pencil size={16} />}
          {editing ? t('cal.done') : t('cal.edit')}
        </button>
        <button className="btn btn-ghost" onClick={() => setMonth(startOfMonth(today))}>
          {t('cal.today')}
        </button>
      </div>

      {focusDay && !editing && (
        <DaySheet day={focusDay} analysis={analysis} periodSet={periodSet} state={state} t={t} locale={locale} onClose={() => onFocusDay(null)} onLog={onLog} />
      )}
    </div>
  );
}

export function DaySheet({ day, analysis, periodSet, state, t, locale, onClose, onLog }) {
  const info = dayInfo(analysis, day, periodSet);
  const labels = logLabels(state.logs[day], t);
  const parts = [];
  if (info.phase) parts.push(t('phase.' + info.phase));
  if (info.cycleDay) parts.push(t('today.cycleDay', { n: info.cycleDay }));
  if (info.predicted) parts.push(t('cal.predictedDay'));
  return (
    <Sheet
      title={fmt(day, locale, { weekday: 'long', day: 'numeric', month: 'long' })}
      sub={parts.join(' · ')}
      onClose={onClose}
      closeLabel={t('log.close')}
      phase={info.phase}
      footer={
        <button
          className="btn btn-primary btn-block"
          onClick={() => {
            onClose();
            onLog(day);
          }}
        >
          {labels.length ? t('cal.editLog') : t('cal.addLog')}
        </button>
      }
    >
      {analysis.hasData && info.phase && (
        <p className="small muted" style={{ marginTop: 0 }}>
          {t('today.chance', { level: t('today.chance.' + pregnancyChance(analysis, day)) })}
        </p>
      )}
      {labels.length ? (
        <div className="chips">
          {labels.map((l) => (
            <span className="chip chip-static" key={l}>
              {l}
            </span>
          ))}
        </div>
      ) : (
        <p className="muted">{t('cal.noLog')}</p>
      )}
      {state.logs[day]?.notes && <p style={{ whiteSpace: 'pre-wrap' }}>{state.logs[day].notes}</p>}
    </Sheet>
  );
}
