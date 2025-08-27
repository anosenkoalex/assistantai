export function inQuietHours(now: Date, tz: string, startHHmm: string, endHHmm: string): boolean {
  // простой расчёт без либ: сравниваем локальные часы/минуты
  const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false });
  const [{value: hour}, , {value: minute}] = formatter.formatToParts(now).filter(p => p.type === 'hour' || p.type === 'minute');
  const cur = Number(hour) * 60 + Number(minute);

  const [sh, sm] = startHHmm.split(':').map(Number);
  const [eh, em] = endHHmm.split(':').map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;

  // если интервал "переламывает" сутки (21:00..09:00)
  if (start > end) {
    return cur >= start || cur < end;
  } else {
    return cur >= start && cur < end;
  }
}
