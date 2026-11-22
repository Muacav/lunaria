import { addDays, fmt } from '../lib/dates.js';
import { dayInfo } from '../lib/cycle.js';

// Seven days around today, each tinted by what the calendar would show.
export default function WeekStrip({ analysis, periodSet, logs, today, locale, onPick }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 3));
  return (
    <div className="week">
      {days.map((d) => {
        const info = dayInfo(analysis, d, periodSet);
        return (
          <button
            key={d}
            data-kind={info.kind || ''}
            data-today={d === today}
            data-logged={Boolean(logs[d])}
            onClick={() => onPick(d)}
            aria-label={fmt(d, locale, { weekday: 'long', day: 'numeric', month: 'long' })}
          >
            <span>{fmt(d, locale, { weekday: 'narrow' })}</span>
            <span className="num">{Number(d.slice(8))}</span>
            <span className="dot" />
          </button>
        );
      })}
    </div>
  );
}
