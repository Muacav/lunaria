import { useEffect, useMemo, useState } from 'react';
import { House, CalendarDays, ChartColumn, CircleUser } from 'lucide-react';
import { useStore } from './lib/store.js';
import { analyze } from './lib/cycle.js';
import { todayISO } from './lib/dates.js';
import { makeT, localeFor } from './lib/i18n.js';
import Today from './screens/Today.jsx';
import Calendar, { DaySheet } from './screens/Calendar.jsx';
import Insights from './screens/Insights.jsx';
import Me from './screens/Me.jsx';
import Onboarding from './screens/Onboarding.jsx';
import Lock from './screens/Lock.jsx';
import Partner from './screens/Partner.jsx';
import LogSheet from './components/LogSheet.jsx';
import { Toaster } from './components/toast.jsx';

const TABS = [
  { id: 'today', icon: House },
  { id: 'calendar', icon: CalendarDays },
  { id: 'insights', icon: ChartColumn },
  { id: 'me', icon: CircleUser },
];

function readHash() {
  const h = window.location.hash.replace(/^#\/?/, '');
  if (h.startsWith('p/')) return { partner: h.slice(2) };
  return { tab: TABS.some((t) => t.id === h) ? h : 'today' };
}

// Today's date, refreshed when the app comes back to the foreground after
// midnight.
function useToday() {
  const [today, setToday] = useState(todayISO());
  useEffect(() => {
    const check = () => setToday(todayISO());
    document.addEventListener('visibilitychange', check);
    const id = setInterval(check, 60000);
    return () => {
      document.removeEventListener('visibilitychange', check);
      clearInterval(id);
    };
  }, []);
  return today;
}

export default function App() {
  const [route, setRoute] = useState(readHash);
  useEffect(() => {
    const on = () => setRoute(readHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  if (route.partner) return <Partner token={route.partner} />;
  return <Main tab={route.tab} />;
}

function Main({ tab }) {
  const state = useStore();
  const today = useToday();
  const [unlocked, setUnlocked] = useState(false);
  const [logDay, setLogDay] = useState(null);
  const [focusDay, setFocusDay] = useState(null);

  const t = useMemo(() => makeT(state.profile.lang), [state.profile.lang]);
  const locale = localeFor(state.profile.lang);
  const periodSet = useMemo(() => new Set(state.periodDays), [state.periodDays]);
  const analysis = useMemo(
    () => analyze(state.periodDays, state.profile, today),
    [state.periodDays, state.profile.cycleLen, state.profile.periodLen, today]
  );

  const phase = (analysis.hasData ? (analysis.late > 0 ? 'late' : analysis.phase) : 'menstrual');

  useEffect(() => {
    document.documentElement.lang = state.profile.lang;
    const th = state.profile.theme;
    if (th === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.dataset.theme = th;
  }, [state.profile.lang, state.profile.theme]);

  useEffect(() => {
    document.documentElement.dataset.phase = phase;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  }, [phase, state.profile.theme]);

  useEffect(() => {
    setFocusDay(null);
    window.scrollTo(0, 0);
  }, [tab]);

  if (state.pinHash && !unlocked) return <Lock t={t} onUnlock={() => setUnlocked(true)} />;

  if (!state.onboarded) {
    return (
      <main className="app" style={{ paddingBottom: 32 }}>
        <Onboarding t={t} state={state} />
      </main>
    );
  }

  const common = { t, locale, analysis, state, today, periodSet };
  const logPhase = logDay ? phase : undefined;

  return (
    <>
      <main className="app">
        {tab === 'today' && <Today {...common} onLog={setLogDay} onDay={setFocusDay} />}
        {tab === 'calendar' && <Calendar {...common} onLog={setLogDay} focusDay={focusDay} onFocusDay={setFocusDay} />}
        {tab === 'insights' && <Insights {...common} />}
        {tab === 'me' && <Me t={t} state={state} analysis={analysis} />}
      </main>

      <nav className="nav" aria-label="Lunaria">
        {TABS.map(({ id, icon: Icon }) => (
          <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => (window.location.hash = '/' + id)}>
            <Icon size={21} strokeWidth={tab === id ? 2.3 : 1.9} />
            {t('nav.' + id)}
          </button>
        ))}
      </nav>

      {focusDay && tab === 'today' && (
        <DaySheet day={focusDay} analysis={analysis} periodSet={periodSet} state={state} t={t} locale={locale} onClose={() => setFocusDay(null)} onLog={setLogDay} />
      )}
      {logDay && <LogSheet date={logDay} t={t} locale={locale} onClose={() => setLogDay(null)} phase={logPhase} />}
      <Toaster />
    </>
  );
}
