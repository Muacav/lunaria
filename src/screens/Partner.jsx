import { useEffect, useMemo, useState } from 'react';
import { Heart, CalendarPlus } from 'lucide-react';
import Dial from '../components/Dial.jsx';
import PhaseArt from '../components/PhaseArt.jsx';
import { Upcoming } from './Today.jsx';
import { analyze } from '../lib/cycle.js';
import { todayISO, fmt } from '../lib/dates.js';
import { makeT, localeFor, relTime, guessLang } from '../lib/i18n.js';
import { buildIcs, downloadFile } from '../lib/ics.js';
import { fetchPartnerView, syncAvailable } from '../lib/sync.js';

// Read-only view for the partner, opened from her link. Predictions are
// recomputed here from the shared dates, so they stay right even on days
// she does not open the app.
export default function Partner({ token }) {
  const cacheKey = 'lunaria:partner:' + token;
  const [view, setView] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(cacheKey));
    } catch {
      return null;
    }
  });
  const [status, setStatus] = useState(view ? 'ok' : 'loading');

  useEffect(() => {
    if (!syncAvailable) return setStatus('missing');
    let alive = true;
    const load = () =>
      fetchPartnerView(token)
        .then((data) => {
          if (!alive) return;
          if (!data) {
            localStorage.removeItem(cacheKey);
            setView(null);
            return setStatus('missing');
          }
          setView(data);
          setStatus('ok');
          try {
            localStorage.setItem(cacheKey, JSON.stringify(data));
          } catch {
            /* ignore */
          }
        })
        .catch(() => alive && setStatus((s) => (s === 'loading' ? 'missing' : 'offline')));
    load();
    const id = setInterval(load, 60000);
    const onFocus = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [token]);

  const snap = view?.snapshot;
  const lang = useMemo(() => {
    try {
      return localStorage.getItem('lunaria:partnerLang') || guessLang();
    } catch {
      return guessLang();
    }
  }, []);
  const t = makeT(lang);
  const locale = localeFor(lang);
  const today = todayISO();

  const analysis = useMemo(
    () => (snap ? analyze(snap.periodDays, { cycleLen: snap.cycleLen, periodLen: snap.periodLen }, today) : null),
    [snap, today]
  );

  if (status === 'loading' && !snap) {
    return (
      <div className="app">
        <p className="muted">{t('p.loading')}</p>
      </div>
    );
  }

  if (!snap || !analysis) {
    return (
      <div className="app lock" data-phase="menstrual">
        <Heart size={28} />
        <p style={{ maxWidth: '30ch' }}>{t('p.missing')}</p>
      </div>
    );
  }

  const phaseKey = analysis.hasData ? (analysis.late > 0 ? 'late' : analysis.phase) : 'luteal';
  const fresh = snap.todayDate === today;
  const moods = fresh && snap.mood?.length ? snap.mood : [];
  const symptoms = fresh && snap.symptoms?.length ? snap.symptoms : [];

  return (
    <div className="app" data-phase={phaseKey} style={{ paddingBottom: 40 }}>
      <header className="today-head">
        <h1 className="partner-title">{t('p.title', { name: snap.name })}</h1>
        <span className="partner-badge">
          <Heart size={14} fill="var(--period)" color="var(--period)" />
        </span>
      </header>
      <p className="tiny" style={{ margin: '4px 0 0' }}>
        {fmt(today, locale, { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>

      <Dial analysis={analysis} t={t} locale={locale} />

      {analysis.hasData && (
        <div className="dial-meta">
          <span className="phase-name">{t('phase.' + phaseKey)}</span>
          <span className="muted"> · {t('today.cycleDay', { n: analysis.cycleDay })}</span>
        </div>
      )}

      <section className="phase-story with-art">
        <h2>{t('p.support')}</h2>
        <PhaseArt phase={phaseKey} size={104} />
        <p>{t('ps.' + phaseKey)}</p>
      </section>

      {(moods.length > 0 || symptoms.length > 0) && (
        <section className="logged-today">
          <h2 className="section-title">{t('p.today')}</h2>
          <div className="chips">
            {moods.map((m) => (
              <span className="chip chip-static" key={m}>
                {t('mood.' + m)}
              </span>
            ))}
            {symptoms.map((s) => (
              <span className="chip chip-static" key={s}>
                {t('sym.' + s)}
              </span>
            ))}
          </div>
        </section>
      )}

      {analysis.hasData && <Upcoming analysis={analysis} t={t} locale={locale} today={today} />}

      {analysis.hasData && (
        <button
          className="btn btn-line btn-block"
          onClick={() => downloadFile('lunaria-partner.ics', buildIcs(analysis, t, { periodTitle: t('ics.herPeriod', { name: snap.name }) }), 'text/calendar')}
        >
          <CalendarPlus size={18} />
          {t('p.addCal')}
        </button>
      )}

      <p className="disclaimer" style={{ marginTop: 18 }}>
        {status === 'offline' ? t('p.offline') : t('p.updated', { time: relTime(new Date(view.updated_at).getTime(), lang) })}
      </p>

      <div className="seg-control" style={{ display: 'flex', width: 'fit-content', margin: '18px auto 0' }}>
        {['en', 'fr', 'it'].map((l) => (
          <button
            key={l}
            aria-pressed={lang === l}
            onClick={() => {
              try {
                localStorage.setItem('lunaria:partnerLang', l);
              } catch {
                /* ignore */
              }
              window.location.reload();
            }}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
