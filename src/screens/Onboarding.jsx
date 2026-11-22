import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { LANGS } from '../lib/i18n.js';
import { addDays, todayISO } from '../lib/dates.js';
import { setState } from '../lib/store.js';

export default function Onboarding({ t, state }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(state.profile.name);
  const [last, setLast] = useState(addDays(todayISO(), -7));
  const [periodLen, setPeriodLen] = useState(5);
  const [cycleLen, setCycleLen] = useState(28);
  const lang = state.profile.lang;
  const total = 4;

  function finish() {
    const days = Array.from({ length: periodLen }, (_, i) => addDays(last, i)).filter((d) => d <= todayISO());
    setState((s) => ({
      ...s,
      onboarded: true,
      profile: { ...s.profile, name: name.trim(), periodLen, cycleLen },
      periodDays: [...new Set([...s.periodDays, ...days])].sort(),
    }));
  }

  const next = () => (step === total ? finish() : setStep(step + 1));

  return (
    <div className="onboard" data-phase="menstrual">
      {step > 0 && (
        <div className="progress" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <i key={i} data-on={i < step} />
          ))}
        </div>
      )}

      <div className="grow">
        {step === 0 && (
          <>
            <RingMark />
            <p className="brand">{t('appName')}</p>
            <p className="muted" style={{ fontSize: 19, maxWidth: '26ch', margin: 0 }}>
              {t('ob.tagline')}
            </p>
            <div className="lang-pick" role="group" aria-label={t('ob.language')}>
              {LANGS.map((l) => (
                <button
                  key={l.id}
                  className="chip"
                  aria-pressed={lang === l.id}
                  onClick={() => setState((s) => ({ ...s, profile: { ...s.profile, lang: l.id } }), { local: true })}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1>{t('ob.nameQ')}</h1>
            <input
              className="input"
              style={{ marginTop: 20, fontSize: 20, minHeight: 58 }}
              placeholder={t('ob.namePh')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && name.trim() && next()}
            />
          </>
        )}

        {step === 2 && (
          <>
            <h1>{t('ob.lastQ')}</h1>
            <p className="muted">{t('ob.lastHint')}</p>
            <input
              className="input"
              type="date"
              style={{ marginTop: 12, fontSize: 20, minHeight: 58 }}
              max={todayISO()}
              value={last}
              onChange={(e) => e.target.value && setLast(e.target.value)}
            />
          </>
        )}

        {step === 3 && (
          <>
            <h1>{t('ob.periodQ')}</h1>
            <Stepper value={periodLen} min={1} max={12} onChange={setPeriodLen} unit={t('ob.days')} />
          </>
        )}

        {step === 4 && (
          <>
            <h1>{t('ob.cycleQ')}</h1>
            <p className="muted">{t('ob.cycleHint')}</p>
            <Stepper value={cycleLen} min={18} max={50} onChange={setCycleLen} unit={t('ob.days')} />
            <p className="tiny">{t('ob.privacy')}</p>
          </>
        )}
      </div>

      <div className="foot">
        {step > 0 && (
          <button className="btn btn-line" onClick={() => setStep(step - 1)}>
            {t('ob.back')}
          </button>
        )}
        <button className="btn btn-primary" onClick={next} disabled={step === 1 && !name.trim()}>
          {step === 0 ? t('ob.start') : step === total ? t('ob.finish') : t('ob.next')}
        </button>
      </div>
    </div>
  );
}

function Stepper({ value, min, max, onChange, unit }) {
  return (
    <div className="stepper">
      <button className="icon-btn" aria-label="−" onClick={() => onChange(Math.max(min, value - 1))}>
        <Minus size={22} />
      </button>
      <div style={{ textAlign: 'center' }}>
        <div className="value" aria-live="polite">
          {value}
        </div>
        <div className="muted">{unit}</div>
      </div>
      <button className="icon-btn" aria-label="+" onClick={() => onChange(Math.min(max, value + 1))}>
        <Plus size={22} />
      </button>
    </div>
  );
}

// A still version of the dial as the welcome mark.
function RingMark() {
  const n = 28;
  const colours = (i) =>
    i < 5 ? 'var(--period)' : i < 8 ? 'var(--follicular)' : i < 14 ? 'var(--fertile)' : i === 13 ? 'var(--ovulation)' : 'var(--luteal)';
  return (
    <svg className="hero-ring" viewBox="0 0 300 300" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => {
        const len = i === 13 ? 34 : i < 5 ? 28 : i >= 8 && i < 14 ? 24 : 18;
        return (
          <g key={i} transform={`translate(150 150) rotate(${(i * 360) / n - 90})`}>
            <rect x="96" y="-5" width={len} height="10" rx="5" fill={i === 13 ? 'var(--ovulation)' : colours(i)} opacity={i < 14 ? 1 : 0.5} />
          </g>
        );
      })}
    </svg>
  );
}
