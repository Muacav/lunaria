// Cycle engine: turns logged period days into cycles, averages and
// predictions. Pure functions only, so it runs the same in the app, in the
// partner view and in tests.
//
// Method (the same calendar method Flo and Clue start from before they have
// lots of data):
//   - a period is a run of logged bleeding days (gaps of one day are merged);
//   - cycle length = days between two period starts; implausible values
//     (< 18 or > 50 days) are kept in history but left out of averages;
//   - the average uses the last 6 valid cycles, weighted towards recent ones;
//   - ovulation is estimated 14 days before the next period (luteal phase),
//     the fertile window is the 5 days before ovulation plus the day after.

import { toDay, fromDay, todayISO } from './dates.js';

export const DEFAULTS = { cycleLen: 28, periodLen: 5, lutealLen: 14 };
const MIN_CYCLE = 18;
const MAX_CYCLE = 50;
const HISTORY = 6;
const FUTURE_CYCLES = 8;

// Group period days into periods. `days` is an array of ISO dates.
export function periodsFromDays(days) {
  const nums = [...new Set(days)].map(toDay).sort((a, b) => a - b);
  const out = [];
  for (const n of nums) {
    const last = out[out.length - 1];
    if (last && n - last.end <= 2) last.end = n;
    else out.push({ start: n, end: n });
  }
  return out;
}

function weightedMean(values) {
  let sum = 0;
  let w = 0;
  values.forEach((v, i) => {
    sum += v * (i + 1);
    w += i + 1;
  });
  return sum / w;
}

function stdDev(values) {
  if (values.length < 2) return 0;
  const m = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((a, v) => a + (v - m) ** 2, 0) / (values.length - 1));
}

// Main analysis. `profile` carries her typical lengths from onboarding,
// which are used until enough real cycles are logged.
export function analyze(periodDays, profile = {}, today = todayISO()) {
  const p = { ...DEFAULTS, ...pick(profile) };
  const periods = periodsFromDays(periodDays);
  const t = toDay(today);

  const lengths = [];
  for (let i = 1; i < periods.length; i++) lengths.push(periods[i].start - periods[i - 1].start);
  const valid = lengths.filter((l) => l >= MIN_CYCLE && l <= MAX_CYCLE).slice(-HISTORY);

  // Only finished periods count towards period length (the current one may
  // still be going).
  const finished = periods.filter((pr) => pr.end < t).map((pr) => pr.end - pr.start + 1);
  const validPeriodLens = finished.filter((l) => l >= 1 && l <= 12).slice(-HISTORY);

  const avgCycle = valid.length ? Math.round(weightedMean(valid)) : p.cycleLen;
  const avgPeriod = validPeriodLens.length ? Math.round(weightedMean(validPeriodLens)) : p.periodLen;
  const ovuOffset = Math.max(avgPeriod + 1, avgCycle - p.lutealLen); // 0-based day of ovulation

  const sd = stdDev(valid);
  const range = valid.length ? Math.max(...valid) - Math.min(...valid) : 0;
  const regularity = valid.length < 3 ? 'learning' : range <= 7 ? 'regular' : 'irregular';

  const base = {
    avgCycle,
    avgPeriod,
    ovuOffset,
    lutealLen: p.lutealLen,
    sd,
    regularity,
    cycleLengths: lengths,
    periods: periods.map((pr) => ({ start: fromDay(pr.start), end: fromDay(pr.end) })),
  };

  if (!periods.length) return { ...base, hasData: false, cycles: [] };

  // Build a continuous list of cycles: past (real), current, and predicted.
  const cycles = [];
  for (let i = 0; i < periods.length - 1; i++) {
    const start = periods[i].start;
    const length = periods[i + 1].start - start;
    cycles.push(makeCycle(start, length, periods[i].end, p.lutealLen, avgPeriod, false));
  }

  const last = periods[periods.length - 1];
  const expectedNext = last.start + avgCycle;
  const late = t >= expectedNext && t > last.end ? t - expectedNext + 1 : 0;
  const nextStart = Math.max(expectedNext, t + 1);
  const current = makeCycle(last.start, nextStart - last.start, last.end, p.lutealLen, avgPeriod, false);
  // The current cycle's ovulation is estimated from the average, not from the
  // stretched length when she is late.
  current.ovulation = last.start + ovuOffset;
  current.fertileStart = current.ovulation - 5;
  current.fertileEnd = current.ovulation + 1;
  cycles.push(current);

  for (let k = 0; k < FUTURE_CYCLES; k++) {
    const start = nextStart + k * avgCycle;
    cycles.push(makeCycle(start, avgCycle, start + avgPeriod - 1, p.lutealLen, avgPeriod, true));
  }

  const cycleDay = t - last.start + 1;
  const inPeriod = t >= last.start && t <= last.end;
  const next = cycles.find((c) => c.predicted);

  return {
    ...base,
    hasData: true,
    cycles,
    today: fromDay(t),
    cycleDay,
    inPeriod,
    periodDayOf: inPeriod ? t - last.start + 1 : 0,
    currentStart: fromDay(last.start),
    currentPeriodEnd: fromDay(last.end),
    late,
    nextPeriod: fromDay(next.start),
    nextPeriodEnd: fromDay(next.periodEnd),
    daysUntilNext: next.start - t,
    ovulation: fromDay(current.ovulation),
    fertileStart: fromDay(current.fertileStart),
    fertileEnd: fromDay(current.fertileEnd),
    phase: phaseFor(current, t),
  };
}

function pick(profile) {
  const out = {};
  for (const k of ['cycleLen', 'periodLen', 'lutealLen']) {
    const v = Number(profile[k]);
    if (Number.isFinite(v) && v > 0) out[k] = v;
  }
  return out;
}

function makeCycle(start, length, periodEnd, luteal, avgPeriod, predicted) {
  const periodLen = periodEnd - start + 1;
  const ovulation = start + Math.max(Math.min(periodLen, avgPeriod) + 1, length - luteal);
  return {
    start,
    length,
    periodEnd,
    ovulation,
    fertileStart: ovulation - 5,
    fertileEnd: ovulation + 1,
    predicted,
  };
}

export function phaseFor(cycle, t) {
  if (t <= cycle.periodEnd) return 'menstrual';
  if (t === cycle.ovulation) return 'ovulation';
  if (t >= cycle.fertileStart && t <= cycle.fertileEnd) return 'fertile';
  if (t < cycle.fertileStart) return 'follicular';
  return 'luteal';
}

// Everything the calendar needs to colour one day.
export function dayInfo(analysis, iso, loggedSet) {
  const t = toDay(iso);
  const logged = loggedSet ? loggedSet.has(iso) : false;
  if (!analysis.hasData) return { logged, kind: logged ? 'period' : null };
  const c = analysis.cycles.find((cy) => t >= cy.start && t < cy.start + cy.length);
  if (!c) return { logged, kind: logged ? 'period' : null };
  const phase = phaseFor(c, t);
  const today = toDay(analysis.today);
  let kind = null;
  if (logged) kind = 'period';
  else if (c.predicted && phase === 'menstrual') kind = 'predicted';
  else if (phase === 'ovulation') kind = 'ovulation';
  else if (phase === 'fertile') kind = 'fertile';
  // A past day inside a real (non-predicted) period range that she did not
  // log is just a gap, not a period.
  if (!logged && !c.predicted && phase === 'menstrual') kind = null;
  return {
    logged,
    kind,
    phase,
    cycleDay: t - c.start + 1,
    predicted: c.predicted || t > today,
  };
}

// Rough chance of pregnancy for a day, the way trackers label it.
// Not contraception: the app says so wherever this is shown.
export function pregnancyChance(analysis, iso) {
  const info = dayInfo(analysis, iso);
  if (info.phase === 'ovulation') return 'high';
  if (info.phase === 'fertile') {
    const c = analysis.cycles.find((cy) => toDay(iso) >= cy.start && toDay(iso) < cy.start + cy.length);
    return toDay(iso) >= c.ovulation - 2 ? 'high' : 'medium';
  }
  return 'low';
}

// Completed cycles for the insights screen, newest first.
export function cycleHistory(analysis) {
  if (!analysis.hasData) return [];
  return analysis.cycles
    .filter((c) => !c.predicted)
    .slice(0, -1)
    .map((c) => ({
      start: fromDay(c.start),
      length: c.length,
      periodLen: c.periodEnd - c.start + 1,
      ovulationDay: c.ovulation - c.start + 1,
    }))
    .reverse();
}
