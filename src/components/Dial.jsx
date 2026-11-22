import { useEffect, useMemo, useRef, useState } from 'react';
import { phaseFor } from '../lib/cycle.js';
import { fromDay, toDay, fmt } from '../lib/dates.js';
import { useCountUp } from '../lib/motion.js';

// The cycle dial: one petal per day of the current cycle, coloured by phase.
// Days already lived are solid, the days ahead are translucent. Drag around
// the ring to preview any day; it springs back to today when released.

const PHASE_VAR = {
  menstrual: 'var(--period)',
  follicular: 'var(--follicular)',
  fertile: 'var(--fertile)',
  ovulation: 'var(--ovulation)',
  luteal: 'var(--luteal)',
};

const C = 150;
const R_IN = 104;

export default function Dial({ analysis, t, locale, onPreview }) {
  const wrap = useRef(null);
  const [sel, setSel] = useState(null);
  const [bloom, setBloom] = useState(true);
  const resetTimer = useRef(null);

  useEffect(() => {
    const id = setTimeout(() => setBloom(false), 1800);
    return () => clearTimeout(id);
  }, []);

  const model = useMemo(() => {
    if (!analysis.hasData) {
      return { n: 28, todayIdx: -1, days: Array.from({ length: 28 }, () => ({ phase: null })) };
    }
    const current = analysis.cycles.filter((c) => !c.predicted).at(-1);
    const n = Math.max(current.length, analysis.cycleDay);
    const t0 = toDay(analysis.today);
    const days = Array.from({ length: n }, (_, i) => {
      const d = current.start + i;
      return { day: d, phase: phaseFor(current, d), past: d <= t0 };
    });
    return { n, todayIdx: analysis.cycleDay - 1, days, start: current.start };
  }, [analysis]);

  const { n, days, todayIdx } = model;
  const step = 360 / n;
  const per = (2 * Math.PI * R_IN) / n;
  const width = Math.min(11, per * 0.6);
  const active = sel ?? todayIdx;

  function idxFromEvent(e) {
    const r = wrap.current.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    const deg = (Math.atan2(y, x) * 180) / Math.PI + 90;
    return Math.round(((deg + 360) % 360) / step) % n;
  }

  function onDown(e) {
    if (!analysis.hasData) return;
    clearTimeout(resetTimer.current);
    wrap.current.setPointerCapture(e.pointerId);
    pick(idxFromEvent(e));
  }
  function onMove(e) {
    if (sel === null || !analysis.hasData) return;
    if (e.buttons === 0 && e.pointerType === 'mouse') return;
    pick(idxFromEvent(e));
  }
  function onUp() {
    clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => {
      setSel(null);
      onPreview?.(null);
    }, 2200);
  }
  function pick(i) {
    setSel(i);
    onPreview?.(days[i]?.phase || null);
  }

  function onKey(e) {
    if (!analysis.hasData) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') pick(((sel ?? todayIdx) + 1) % n);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') pick(((sel ?? todayIdx) - 1 + n) % n);
    else if (e.key === 'Escape') {
      setSel(null);
      onPreview?.(null);
    } else return;
    e.preventDefault();
  }

  const knobAngle = ((active * step - 90) * Math.PI) / 180;
  const knobR = R_IN + 44;

  return (
    <div
      className="dial-wrap"
      ref={wrap}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onKeyDown={onKey}
      tabIndex={analysis.hasData ? 0 : -1}
      role={analysis.hasData ? 'slider' : undefined}
      aria-label={analysis.hasData ? t('today.scrub') : undefined}
      aria-valuemin={1}
      aria-valuemax={n}
      aria-valuenow={active + 1}
    >
      <svg className={`dial ${bloom ? 'bloom' : ''}`} viewBox="0 0 300 300" aria-hidden="true">
        <circle cx={C} cy={C} r={R_IN - 12} fill="none" stroke="var(--line)" strokeWidth="1" />
        {days.map((d, i) => {
          const ang = i * step - 90;
          const isOvu = d.phase === 'ovulation';
          const isPer = d.phase === 'menstrual';
          const len = isOvu ? 34 : isPer ? 28 : d.phase === 'fertile' ? 24 : 18;
          const highlighted = i === active;
          const fill = d.phase ? PHASE_VAR[d.phase] : 'var(--line)';
          const opacity = !d.phase ? 1 : d.past ? 1 : 0.32;
          return (
            <g key={i} transform={`translate(${C} ${C}) rotate(${ang})`}>
              <rect
                className="petal"
                style={{ '--i': i }}
                x={R_IN}
                y={-width / 2}
                width={highlighted ? len + 6 : len}
                height={width}
                rx={width / 2}
                fill={fill}
                opacity={highlighted ? 1 : opacity}
              />
            </g>
          );
        })}
        {analysis.hasData && (
          <g className="knob">
            <circle cx={C + Math.cos(knobAngle) * knobR} cy={C + Math.sin(knobAngle) * knobR} r="8.5" fill="var(--bg)" stroke="var(--ink)" strokeWidth="2" />
            <circle cx={C + Math.cos(knobAngle) * knobR} cy={C + Math.sin(knobAngle) * knobR} r="3.5" fill="var(--ink)" />
          </g>
        )}
      </svg>
      <div className={`dial-center ${bloom ? 'bloom' : ''}`} aria-live="polite">
        {sel !== null && analysis.hasData ? (
          <Preview day={days[sel]} idx={sel} t={t} locale={locale} />
        ) : (
          <Countdown analysis={analysis} t={t} />
        )}
      </div>
    </div>
  );
}

function Preview({ day, idx, t, locale }) {
  return (
    <>
      <span className="lead">{t('today.cycleDay', { n: idx + 1 })}</span>
      <span className="preview-phase">{t('phase.' + day.phase)}</span>
      <span className="lead" style={{ marginTop: 6 }}>
        {fmt(fromDay(day.day), locale, { weekday: 'short', day: 'numeric', month: 'short' })}
      </span>
    </>
  );
}

export function Countdown({ analysis, t }) {
  const target = !analysis.hasData ? 0 : analysis.inPeriod ? analysis.periodDayOf : analysis.late > 0 ? analysis.late : analysis.daysUntilNext;
  const shown = useCountUp(target);
  if (!analysis.hasData) return <span className="empty">{t('today.noData')}</span>;
  let lead;
  let big;
  let unit = '';
  if (analysis.inPeriod) {
    lead = t('today.periodDay');
    big = analysis.periodDayOf;
  } else if (analysis.late > 0) {
    lead = t('today.lateBy');
    big = analysis.late;
    unit = analysis.late === 1 ? t('today.day') : t('today.days');
  } else {
    lead = t('today.periodIn');
    big = analysis.daysUntilNext;
    unit = big === 1 ? t('today.day') : t('today.days');
  }
  return (
    <>
      <span className="lead">{lead}</span>
      <span className="big">{shown}</span>
      {unit && <span className="unit">{unit}</span>}
    </>
  );
}
