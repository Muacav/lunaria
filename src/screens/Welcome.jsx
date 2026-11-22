import PhaseArt from '../components/PhaseArt.jsx';
import { greetingKey } from '../lib/i18n.js';
import { fmt } from '../lib/dates.js';

// Shown once a day, the first time she opens Lunaria: a greeting with her
// name, where she is in her cycle, and the illustration of her phase.
export default function Welcome({ t, locale, name, analysis, today, onContinue }) {
  const phase = analysis.hasData ? (analysis.late > 0 ? 'late' : analysis.phase) : 'follicular';

  let day = t('today.noData');
  let next = null;
  if (analysis.hasData) {
    day = t('wel.cycleDay', { n: analysis.cycleDay });
    if (analysis.inPeriod) next = t('wel.periodDay', { n: analysis.periodDayOf });
    else if (analysis.late === 1) next = t('wel.late1');
    else if (analysis.late > 1) next = t('wel.late', { n: analysis.late });
    else if (analysis.daysUntilNext === 1) next = t('wel.periodTomorrow');
    else next = t('wel.periodIn', { n: analysis.daysUntilNext });
  }

  return (
    <div className="welcome stagger" data-phase={phase}>
      <span className="tiny">{fmt(today, locale, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
      <PhaseArt phase={phase} size={240} />
      <p className="greet">{t(greetingKey())},</p>
      <h1 className="name">{name}</h1>
      <p className="day">
        {day} {next}
      </p>
      {analysis.hasData && <p className="tag">{t('tag.' + phase)}</p>}
      <div className="grow" />
      <button className="btn btn-primary" onClick={onContinue} autoFocus>
        {t('wel.open')}
      </button>
    </div>
  );
}
