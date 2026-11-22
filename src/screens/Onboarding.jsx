import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import PhaseArt from '../components/PhaseArt.jsx';
import { LANGS } from '../lib/i18n.js';
import { addDays, todayISO } from '../lib/dates.js';
import { setState } from '../lib/store.js';
import { useCountUp } from '../lib/motion.js';

// Set-up after the account is created, one question per screen:
//   name → last period → period length → cycle length → all set
// Without cloud sync (local mode) it starts with a welcome + language step.
export default function Onboarding({ t, state, withAccount }) {
  const steps = [...(withAccount ? [] : ['intro']), 'name', 'last', 'period', 'cycle', 'done'];
  const [i, setI] = useState(0);
  const [dir, setDir] = useState('next');
  const [name, setName] = useState(state.profile.name || '');
  const [last, setLast] = useState(addDays(todayISO(), -7));
  const [periodLen, setPeriodLen] = useState(state.profile.periodLen || 5);
  const [cycleLen, setCycleLen] = useState(state.profile.cycleLen || 28);
  const step = steps[i];
  const questions = steps.filter((s) => s !== 'intro' && s !== 'done');
  const qIndex = questions.indexOf(step);

  function finish() {
    const days = Array.from({ length: periodLen }, (_, k) => addDays(last, k)).filter((d) => d <= todayISO());
    setState((s) => ({
      ...s,
      onboarded: true,
      lastWelcome: todayISO(),
      profile: { ...s.profile, name: name.trim(), periodLen, cycleLen },
      periodDays: [...new Set([...s.periodDays, ...days])].sort(),
    }));
  }

  const next = () => {
    if (step === 'done') return finish();
    setDir('next');
    setI(i + 1);
  };
  const back = () => {
    setDir('prev');
    setI(i - 1);
  };

  const art = { intro: 'luteal', name: 'follicular', last: 'menstrual', period: 'menstrual', cycle: 'luteal', done: 'ovulation' }[step];
  const canGo = step !== 'name' || name.trim();

  return (
    <div className="onboard" data-phase={art}>
      {qIndex >= 0 && (
        <div className="progress" aria-hidden="true">
          {questions.map((q, k) => (
            <i key={q} data-on={k <= qIndex} />
          ))}
        </div>
      )}

      <div className={`grow ${dir === 'next' ? 'slide-next' : 'slide-prev'}`} key={step}>
        <PhaseArt phase={art} size={step === 'done' || step === 'intro' ? 230 : 150} />

        {step === 'intro' && (
          <div style={{ textAlign: 'center' }}>
            <p className="brand">{t('appName')}</p>
            <p className="muted" style={{ fontSize: 19, margin: '0 auto', maxWidth: '24ch' }}>
              {t('ob.tagline')}
            </p>
            <div className="lang-pick" role="group" aria-label={t('ob.language')} style={{ justifyContent: 'center' }}>
              {LANGS.map((l) => (
                <button
                  key={l.id}
                  className="chip"
                  aria-pressed={state.profile.lang === l.id}
                  onClick={() => setState((s) => ({ ...s, profile: { ...s.profile, lang: l.id } }), { local: true })}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'name' && (
          <>
            <h1>{t('ob.nameQ')}</h1>
            <p className="muted">{t('ob.nameHint')}</p>
            <input
              className="input"
              style={{ marginTop: 8, fontSize: 20, minHeight: 58 }}
              placeholder={t('ob.namePh')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              autoComplete="given-name"
              onKeyDown={(e) => e.key === 'Enter' && canGo && next()}
            />
            {name.trim() && (
              <p className="script" style={{ fontSize: 44, margin: '18px 0 0', color: 'var(--phase)' }} aria-hidden="true">
                {name.trim()}
              </p>
            )}
          </>
        )}

        {step === 'last' && (
          <>
            <h1>{t('ob.lastQ')}</h1>
            <p className="muted">{t('ob.lastHint')}</p>
            <input
              className="input"
              type="date"
              style={{ marginTop: 8, fontSize: 20, minHeight: 58 }}
              max={todayISO()}
              value={last}
              onChange={(e) => e.target.value && setLast(e.target.value)}
            />
          </>
        )}

        {step === 'period' && (
          <>
            <h1>{t('ob.periodQ')}</h1>
            <Stepper value={periodLen} min={1} max={12} onChange={setPeriodLen} unit={t('ob.days')} />
          </>
        )}

        {step === 'cycle' && (
          <>
            <h1>{t('ob.cycleQ')}</h1>
            <p className="muted">{t('ob.cycleHint')}</p>
            <Stepper value={cycleLen} min={18} max={50} onChange={setCycleLen} unit={t('ob.days')} />
            <p className="tiny">{t('ob.privacy')}</p>
          </>
        )}

        {step === 'done' && (
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ marginBottom: 4 }}>{t('ob.allSet', { name: '' }).replace(/,\s*$/, ',')}</h1>
            <p className="script" style={{ fontSize: 64, margin: '0 0 12px', lineHeight: 1.1 }}>
              {name.trim()}
            </p>
            <p className="muted" style={{ maxWidth: '32ch', margin: '0 auto' }}>
              {t('ob.allSetBody')}
            </p>
          </div>
        )}
      </div>

      <div className="foot">
        {i > 0 && step !== 'done' && (
          <button className="btn btn-line" onClick={back}>
            {t('ob.back')}
          </button>
        )}
        <button className="btn btn-primary" onClick={next} disabled={!canGo}>
          {step === 'intro' ? t('ob.start') : step === 'done' ? t('ob.enter') : step === 'cycle' ? t('ob.finish') : t('ob.next')}
        </button>
      </div>
    </div>
  );
}

function Stepper({ value, min, max, onChange, unit }) {
  const shown = useCountUp(value, 260);
  return (
    <div className="stepper">
      <button className="icon-btn" aria-label="−" onClick={() => onChange(Math.max(min, value - 1))}>
        <Minus size={22} />
      </button>
      <div style={{ textAlign: 'center' }}>
        <div className="value" aria-live="polite">
          {shown}
        </div>
        <div className="muted">{unit}</div>
      </div>
      <button className="icon-btn" aria-label="+" onClick={() => onChange(Math.min(max, value + 1))}>
        <Plus size={22} />
      </button>
    </div>
  );
}
