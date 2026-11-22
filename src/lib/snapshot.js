// What the partner link exposes. Built on her phone, so only what she has
// chosen to share ever leaves the device for the partner view.

import { addDays, todayISO } from './dates.js';

export function buildSnapshot(state, today = todayISO()) {
  const since = addDays(today, -200);
  const log = state.logs[today] || {};
  return {
    v: 1,
    name: state.profile.name,
    lang: state.profile.lang,
    cycleLen: state.profile.cycleLen,
    periodLen: state.profile.periodLen,
    periodDays: state.periodDays.filter((d) => d >= since),
    todayDate: today,
    mood: state.share.mood ? log.mood || [] : null,
    symptoms: state.share.symptoms ? log.symptoms || [] : null,
  };
}
