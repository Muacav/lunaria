import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze, periodsFromDays, dayInfo, pregnancyChance, cycleHistory } from '../src/lib/cycle.js';
import { addDays, weekday } from '../src/lib/dates.js';

const range = (start, n) => Array.from({ length: n }, (_, i) => addDays(start, i));

test('weekday is Monday-based', () => {
  assert.equal(weekday('2026-11-23'), 0); // Monday
  assert.equal(weekday('2026-11-22'), 6); // Sunday
});

test('groups days into periods, merging one-day gaps', () => {
  const p = periodsFromDays(['2026-01-01', '2026-01-02', '2026-01-04', '2026-01-20']);
  assert.equal(p.length, 2);
});

test('no data falls back to onboarding profile', () => {
  const a = analyze([], { cycleLen: 30, periodLen: 4 }, '2026-11-22');
  assert.equal(a.hasData, false);
  assert.equal(a.avgCycle, 30);
  assert.equal(a.avgPeriod, 4);
});

test('single period uses profile lengths for prediction', () => {
  const a = analyze(range('2026-11-01', 5), { cycleLen: 28, periodLen: 5 }, '2026-11-10');
  assert.equal(a.cycleDay, 10);
  assert.equal(a.nextPeriod, '2026-11-29');
  assert.equal(a.daysUntilNext, 19);
  assert.equal(a.ovulation, '2026-11-15'); // day 15 = 28 - 14 + 1
  assert.equal(a.fertileStart, '2026-11-10');
  assert.equal(a.phase, 'fertile');
});

test('averages real cycles, weighted to recent ones', () => {
  const days = [...range('2026-08-01', 5), ...range('2026-08-31', 5), ...range('2026-10-01', 5), ...range('2026-11-01', 5)];
  const a = analyze(days, {}, '2026-11-05');
  // cycles: 30, 31, 31
  assert.equal(a.avgCycle, 31);
  assert.equal(a.inPeriod, true);
  assert.equal(a.periodDayOf, 5);
  assert.equal(a.nextPeriod, '2026-12-02');
  assert.equal(a.regularity, 'regular');
});

test('late period is detected and next prediction moves to tomorrow', () => {
  const a = analyze(range('2026-10-01', 5), { cycleLen: 28 }, '2026-11-01');
  assert.equal(a.late, 4); // expected Oct 29
  assert.equal(a.nextPeriod, '2026-11-02');
});

test('calendar day kinds', () => {
  const days = range('2026-11-01', 5);
  const a = analyze(days, {}, '2026-11-03');
  const set = new Set(days);
  assert.equal(dayInfo(a, '2026-11-02', set).kind, 'period');
  assert.equal(dayInfo(a, '2026-11-15', set).kind, 'ovulation');
  assert.equal(dayInfo(a, '2026-11-12', set).kind, 'fertile');
  assert.equal(dayInfo(a, '2026-11-29', set).kind, 'predicted');
  assert.equal(dayInfo(a, '2026-11-22', set).phase, 'luteal');
  assert.equal(pregnancyChance(a, '2026-11-15'), 'high');
  assert.equal(pregnancyChance(a, '2026-11-11'), 'medium');
  assert.equal(pregnancyChance(a, '2026-11-25'), 'low');
});

test('outlier cycles are ignored in the average', () => {
  const days = [...range('2026-05-01', 4), ...range('2026-05-11', 4), ...range('2026-06-08', 4), ...range('2026-07-06', 4)];
  const a = analyze(days, {}, '2026-07-10');
  // cycles: 10 (outlier), 28, 28
  assert.equal(a.avgCycle, 28);
  assert.equal(cycleHistory(a).length, 3);
});
