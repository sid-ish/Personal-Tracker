import { settings } from '../services/settings/settings.js';

/**
 * One reusable clock. Markup: clockHtml({ size, date, seconds, hour12, tz }). A single ticker (started once)
 * updates every [data-clock] element, aligned to the second. Defaults come from Settings → Focus → Clock.
 */
export function clockHtml({ size = 'md', date = true, seconds, hour12, tz, id = '' } = {}) {
  const a = [seconds !== undefined ? `data-seconds="${seconds ? 1 : 0}"` : '', hour12 !== undefined ? `data-h12="${hour12 ? 1 : 0}"` : '', tz ? `data-tz="${tz}"` : '', date ? 'data-date="1"' : ''].join(' ');
  const f = formatNow(new Date(), { seconds, hour12, tz });
  return `<div class="clock clock-${size}" data-clock ${a} ${id ? `id="${id}"` : ''} role="timer" aria-label="Current time"><div class="clock-time" data-part="time">${f.time}</div>${date ? `<div class="clock-date" data-part="date"><span>${f.weekday}</span><span>${f.date}</span></div>` : ''}</div>`;
}
export function formatNow(now, { seconds, hour12, tz } = {}) {
  const c = settings.get('clock'); const s = seconds ?? c.seconds, h12 = hour12 ?? c.hour12, zone = (tz || c.timezone) === 'local' ? undefined : (tz || c.timezone);
  const o = { hour: '2-digit', minute: '2-digit', hour12: h12, timeZone: zone, ...(s ? { second: '2-digit' } : {}) };
  let time; try { time = new Intl.DateTimeFormat('en-GB', o).format(now); } catch { time = new Intl.DateTimeFormat('en-GB', { ...o, timeZone: undefined }).format(now); }
  if (h12) time = time.toUpperCase();
  let weekday = '', date = ''; try { weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'long', timeZone: zone }).format(now); date = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'long', year: 'numeric', timeZone: zone }).format(now); } catch { /* invalid zone */ }
  return { time, weekday, date };
}
function tickAll() {
  const now = new Date();
  document.querySelectorAll('[data-clock]').forEach(el => {
    const f = formatNow(now, { seconds: el.dataset.seconds ? el.dataset.seconds === '1' : undefined, hour12: el.dataset.h12 ? el.dataset.h12 === '1' : undefined, tz: el.dataset.tz });
    const t = el.querySelector('[data-part=time]'); if (t && t.textContent !== f.time) t.textContent = f.time;
    const d = el.querySelector('[data-part=date]'); if (d && el.dataset.date) { const html = `<span>${f.weekday}</span><span>${f.date}</span>`; if (d.innerHTML !== html) d.innerHTML = html; }
  });
}
let started = false;
export function startClocks() {
  if (started) return; started = true; tickAll();
  const loop = () => { tickAll(); setTimeout(loop, 1000 - (Date.now() % 1000) + 5); }; loop();
}
export const refreshClocks = tickAll;
