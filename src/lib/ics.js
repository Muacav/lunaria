// Builds an .ics calendar file with predicted periods and fertile windows.
// Opening it on a phone adds the events to the built-in calendar, which also
// gives reminders without any server or push service.

import { fromDay } from './dates.js';

const compact = (iso) => iso.replaceAll('-', '');

function esc(s) {
  return String(s).replace(/[\\;,]/g, (c) => '\\' + c).replace(/\n/g, '\\n');
}

export function buildIcs(analysis, t, { periodTitle, count = 6 } = {}) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Lunaria//Cycle//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  const future = analysis.cycles.filter((c) => c.predicted).slice(0, count);
  for (const c of future) {
    const ps = fromDay(c.start);
    lines.push(
      'BEGIN:VEVENT',
      `UID:lunaria-period-${ps}@lunaria`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(ps)}`,
      `DTEND;VALUE=DATE:${compact(fromDay(c.periodEnd + 1))}`,
      `SUMMARY:${esc(periodTitle || t('ics.period'))}`,
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${esc(periodTitle || t('ics.period'))}`,
      'TRIGGER:-PT39H', // 09:00 two days before
      'END:VALARM',
      'END:VEVENT'
    );
    const fs = fromDay(c.fertileStart);
    lines.push(
      'BEGIN:VEVENT',
      `UID:lunaria-fertile-${fs}@lunaria`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(fs)}`,
      `DTEND;VALUE=DATE:${compact(fromDay(c.fertileEnd + 1))}`,
      `SUMMARY:${esc(t('ics.fertile'))}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT'
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadFile(name, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
