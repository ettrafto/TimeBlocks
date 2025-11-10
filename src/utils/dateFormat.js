// src/utils/dateFormat.js

export function parseHourMinute(hhmm) {
  if (!hhmm || typeof hhmm !== 'string') return { hour: 9, minute: 0 };
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10));
  const hour = Number.isFinite(h) ? Math.max(0, Math.min(23, h)) : 9;
  const minute = Number.isFinite(m) ? Math.max(0, Math.min(59, m)) : 0;
  return { hour, minute };
}

export function formatClock(totalMinutes, { startHour = 9, timeFormat = '12h' } = {}) {
  const hour = Math.floor(totalMinutes / 60) + startHour;
  const minute = totalMinutes % 60;
  if (timeFormat === '24h') {
    const h24 = ((hour % 24) + 24) % 24;
    return `${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
}

export function formatDateHeader(date, { dateFormat = 'MDY' } = {}) {
  const d = new Date(date);
  const mm = d.getMonth() + 1;
  const dd = d.getDate();
  const yyyy = d.getFullYear();
  return dateFormat === 'DMY' ? `${dd}/${mm}/${yyyy}` : `${mm}/${dd}/${yyyy}`;
}


