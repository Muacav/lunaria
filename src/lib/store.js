// App state, saved in this browser's localStorage. Every change bumps
// `updatedAt` so cloud sync can tell which copy is newer.

import { useSyncExternalStore } from 'react';
import { guessLang } from './i18n.js';

const KEY = 'lunaria:v1';

export function initialState() {
  return {
    version: 1,
    onboarded: false,
    profile: { name: '', lang: guessLang(), cycleLen: 28, periodLen: 5, theme: 'system' },
    periodDays: [],
    logs: {},
    share: { token: null, mood: true, symptoms: false },
    pinHash: null,
    ownerId: null,
    lastWelcome: null,
    updatedAt: 0,
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initialState();
    const s = JSON.parse(raw);
    const base = initialState();
    return { ...base, ...s, profile: { ...base.profile, ...s.profile }, share: { ...base.share, ...s.share } };
  } catch {
    return initialState();
  }
}

let state = load();
const listeners = new Set();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked: the app keeps working for this session.
  }
}

export function getState() {
  return state;
}

// `meta.local` marks changes that should not count as data edits (theme,
// PIN, values pulled from the cloud), so they do not trigger an upload.
export function setState(updater, meta = {}) {
  const next = typeof updater === 'function' ? updater(state) : { ...state, ...updater };
  if (next === state) return;
  state = meta.local ? next : { ...next, updatedAt: Date.now() };
  save();
  listeners.forEach((l) => l(state, meta));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useStore(selector = (s) => s) {
  return useSyncExternalStore(
    (cb) => subscribe(cb),
    () => selector(state)
  );
}

// Clears everything on this phone. Language and theme are kept, since they
// belong to the phone more than to the account.
export function resetAll() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  const { lang, theme } = state.profile;
  state = initialState();
  state = { ...state, profile: { ...state.profile, lang, theme } };
  save();
  listeners.forEach((l) => l(state, { local: true, reset: true }));
}

// ---- data helpers -------------------------------------------------------

export function togglePeriodDay(iso) {
  setState((s) => {
    const set = new Set(s.periodDays);
    if (set.has(iso)) set.delete(iso);
    else set.add(iso);
    return { ...s, periodDays: [...set].sort() };
  });
}

export function addPeriodDays(days) {
  setState((s) => ({ ...s, periodDays: [...new Set([...s.periodDays, ...days])].sort() }));
}

export function removePeriodDaysAfter(iso, until) {
  setState((s) => ({ ...s, periodDays: s.periodDays.filter((d) => d <= iso || d > until) }));
}

export function saveLog(iso, entry) {
  setState((s) => {
    const logs = { ...s.logs };
    const clean = cleanLog(entry);
    if (clean) logs[iso] = clean;
    else delete logs[iso];
    return { ...s, logs };
  });
}

export function cleanLog(e) {
  const out = {};
  if (e.flow) out.flow = e.flow;
  if (e.symptoms?.length) out.symptoms = e.symptoms;
  if (e.mood?.length) out.mood = e.mood;
  if (e.discharge) out.discharge = e.discharge;
  if (e.sex) out.sex = e.sex;
  if (e.temp) out.temp = e.temp;
  if (e.weight) out.weight = e.weight;
  if (e.water) out.water = e.water;
  if (e.notes?.trim()) out.notes = e.notes.trim();
  return Object.keys(out).length ? out : null;
}

export function exportData() {
  const { pinHash, ...rest } = state;
  return JSON.stringify({ app: 'lunaria', exportedAt: new Date().toISOString(), data: rest }, null, 2);
}

export function importData(text) {
  const parsed = JSON.parse(text);
  if (parsed?.app !== 'lunaria' || !parsed.data?.profile) throw new Error('not a backup');
  setState((s) => ({ ...initialState(), ...parsed.data, pinHash: s.pinHash, onboarded: true }));
}
