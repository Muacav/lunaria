import { useState } from 'react';
import { Droplet, Minus, Plus, Thermometer, Scale } from 'lucide-react';
import Sheet from './Sheet.jsx';
import { getState, saveLog, addPeriodDays } from '../lib/store.js';
import { fmt } from '../lib/dates.js';
import { celebrate } from './Celebrate.jsx';

export const OPTIONS = {
  flow: ['spotting', 'light', 'medium', 'heavy'],
  symptoms: ['cramps', 'headache', 'bloating', 'breasts', 'acne', 'backache', 'fatigue', 'cravings', 'nausea', 'insomnia'],
  mood: ['calm', 'happy', 'energetic', 'frisky', 'sensitive', 'irritable', 'sad', 'anxious'],
  discharge: ['none', 'sticky', 'creamy', 'eggwhite', 'watery'],
  sex: ['none', 'protected', 'unprotected'],
};

const PREFIX = { flow: 'flow', symptoms: 'sym', mood: 'mood', discharge: 'dis', sex: 'sex' };
const MULTI = { symptoms: true, mood: true };
const DROPS = { spotting: 0, light: 1, medium: 2, heavy: 3 };

export default function LogSheet({ date, t, locale, onClose, phase }) {
  const [entry, setEntry] = useState(() => ({ symptoms: [], mood: [], ...(getState().logs[date] || {}) }));

  function toggle(cat, val) {
    setEntry((e) => {
      if (MULTI[cat]) {
        const list = e[cat] || [];
        return { ...e, [cat]: list.includes(val) ? list.filter((v) => v !== val) : [...list, val] };
      }
      return { ...e, [cat]: e[cat] === val ? null : val };
    });
  }

  function save() {
    saveLog(date, entry);
    // Logging a real flow marks the day as a period day, like in Flo.
    if (entry.flow && entry.flow !== 'spotting') addPeriodDays([date]);
    onClose();
    celebrate(t('log.savedNice'));
  }

  const water = entry.water || 0;

  return (
    <Sheet
      title={t('log.title')}
      sub={fmt(date, locale, { weekday: 'long', day: 'numeric', month: 'long' })}
      onClose={onClose}
      closeLabel={t('log.close')}
      phase={phase}
      footer={
        <button className="btn btn-primary btn-block" onClick={save}>
          {t('log.save')}
        </button>
      }
    >
      {Object.keys(OPTIONS).map((cat) => (
        <div className="log-group" data-cat={cat} key={cat}>
          <h3 className="section-title">{t('log.' + cat)}</h3>
          <div className="chips">
            {OPTIONS[cat].map((val) => {
              const on = MULTI[cat] ? (entry[cat] || []).includes(val) : entry[cat] === val;
              return (
                <button key={val} className="chip" aria-pressed={on} onClick={() => toggle(cat, val)}>
                  {cat === 'flow' && <FlowIcon n={DROPS[val]} />}
                  {t(`${PREFIX[cat]}.${val}`)}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="log-group">
        <h3 className="section-title">{t('log.body')}</h3>
        <div className="body-fields">
          <label className="field">
            <span>
              <Thermometer size={14} style={{ verticalAlign: -2 }} /> {t('log.temp')}
            </span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="34"
              max="42"
              value={entry.temp || ''}
              onChange={(e) => setEntry({ ...entry, temp: e.target.value })}
            />
          </label>
          <label className="field">
            <span>
              <Scale size={14} style={{ verticalAlign: -2 }} /> {t('log.weight')}
            </span>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              min="20"
              max="300"
              value={entry.weight || ''}
              onChange={(e) => setEntry({ ...entry, weight: e.target.value })}
            />
          </label>
        </div>
        <div className="field" style={{ marginTop: 14 }}>
          <span>{t('log.water')}</span>
          <div className="water">
            <button className="icon-btn" aria-label="−" onClick={() => setEntry({ ...entry, water: Math.max(0, water - 1) })}>
              <Minus size={18} />
            </button>
            <span className="count bump" key={water}>
              {t('log.glasses', { n: water })}
            </span>
            <button className="icon-btn" aria-label="+" onClick={() => setEntry({ ...entry, water: water + 1 })}>
              <Plus size={18} />
            </button>
          </div>
        </div>
      </div>

      <label className="field log-group">
        <span>{t('log.notes')}</span>
        <textarea placeholder={t('log.notesPh')} value={entry.notes || ''} onChange={(e) => setEntry({ ...entry, notes: e.target.value })} />
      </label>
    </Sheet>
  );
}

function FlowIcon({ n }) {
  if (n === 0) return <Droplet size={13} strokeWidth={2.4} style={{ opacity: 0.6 }} />;
  return (
    <span style={{ display: 'inline-flex', gap: 1 }}>
      {Array.from({ length: n }, (_, i) => (
        <Droplet key={i} size={13} strokeWidth={2.4} fill="currentColor" />
      ))}
    </span>
  );
}

// Short list of what was logged, for Today and the calendar day sheet.
export function logLabels(log, t) {
  if (!log) return [];
  const out = [];
  if (log.flow) out.push(t('flow.' + log.flow));
  (log.symptoms || []).forEach((s) => out.push(t('sym.' + s)));
  (log.mood || []).forEach((s) => out.push(t('mood.' + s)));
  if (log.discharge) out.push(t('log.discharge') + ': ' + t('dis.' + log.discharge).toLowerCase());
  if (log.sex) out.push(t('sex.' + log.sex));
  if (log.temp) out.push(`${log.temp} °C`);
  if (log.weight) out.push(`${log.weight} kg`);
  if (log.water) out.push(t('log.glasses', { n: log.water }));
  return out;
}
