import { focus, displaySec, progress, elapsedSec } from '../../services/focus/focus.js';
import { settings } from '../../services/settings/settings.js';
import { getCalendarItems, groupByDate, itemsOn } from '../../services/calendar-service.js';
import { taskService } from '../../services/task-service.js';
import { appState } from '../../app/state.js';
import { navigate } from '../../app/router.js';
import { icon } from '../../components/icons.js';
import { clockHtml } from '../../components/clock.js';
import { calendarHtml, calendarLegend } from '../../components/calendar.js';
import { timelineHtml } from '../../components/timeline.js';
import { progressBar } from '../../components/progress.js';
import { toast } from '../../components/toast.js';
import { confirmModal } from '../../components/modal.js';
import { fmtHMS } from '../../utils/formatting.js';
import { fmtDateLong, fmtDuration, todayStr } from '../../utils/dates.js';
import { esc } from '../../utils/escape-html.js';
import { TASK_CATEGORIES } from '../../app/constants.js';

let ticker = null;
const MODES = [['pomodoro', 'Pomodoro'], ['countdown', 'Countdown'], ['countup', 'Count-up']];
const setup = () => { const s = appState.focusSetup, f = settings.get('focus'); s.mode = s.mode || f.mode; s.presetId = s.presetId || f.presetId; return s; };

function setupHtml(tasks) {
  const s = setup(), f = settings.get('focus'), presets = [...f.presets, { id: 'custom', label: 'Custom' }];
  const cur = presets.find(p => p.id === s.presetId) || presets[0];
  return `<div class="col gap-4"><div class="field"><label for="fTitle">What are you working on?</label><input class="input" id="fTitle" data-act="fs-title" list="fTasks" value="${esc(s.title)}" placeholder="e.g. Heat Transfer: transient conduction" autocomplete="off"><datalist id="fTasks">${tasks.filter(t => !t.done).slice(0, 12).map(t => `<option value="${esc(t.text)}">`).join('')}</datalist></div>
    <div class="field"><label for="fCat">Category</label><select class="select" id="fCat" data-act="fs-cat">${TASK_CATEGORIES.map(([v, l]) => `<option value="${v}" ${s.category === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="field"><span class="label">Timer type</span><div class="segmented" role="group" aria-label="Timer type">${MODES.map(([m, l]) => `<button data-act="fs-mode" data-m="${m}" aria-pressed="${s.mode === m}">${l}</button>`).join('')}</div></div>
    ${s.mode === 'pomodoro' ? `<div class="field"><span class="label">Preset</span><div class="segmented" role="group" aria-label="Pomodoro preset">${presets.map(p => `<button data-act="fs-preset" data-p="${p.id}" aria-pressed="${cur.id === p.id}">${esc(p.label)}</button>`).join('')}</div></div>
      ${cur.id === 'custom' ? `<div class="form-grid"><div class="field"><label for="fCustom">Focus (min)</label><input class="input" id="fCustom" type="number" min="1" max="600" value="${s.custom}" data-act="fs-custom"></div><div class="field"><label for="fBrk">Break (min)</label><input class="input" id="fBrk" type="number" min="1" max="120" value="${s.customBreak || f.breakMin || 5}" data-act="fs-brk"></div></div>` : ''}`
      : s.mode === 'countdown' ? `<div class="field"><label for="fCustom">Minutes</label><input class="input" id="fCustom" type="number" min="1" max="720" value="${s.custom}" data-act="fs-custom"></div>` : '<p class="t-small muted">Counts up until you finish. Nothing is cut short.</p>'}</div>`;
}
function infoHtml() {
  const st = focus.get(), mins = st.targetSec ? Math.round(st.targetSec / 60) : 0;
  return `<div class="col gap-4"><div><div class="t-label">${st.phase === 'break' ? 'Break' : 'Current session'}</div><h2 class="t-h1 mt-1 clamp-2">${esc(st.title)}</h2><div class="row wrap gap-2 mt-2"><span class="chip">${esc(st.category)}</span><span class="chip primary">${st.mode === 'pomodoro' ? 'Pomodoro' : st.mode === 'countdown' ? 'Countdown' : 'Count-up'}</span>${mins ? `<span class="chip">${fmtDuration(mins)}</span>` : ''}</div></div>
    <div><div class="row between t-caption muted mb-2"><span>Elapsed <span class="tnum" id="fElapsed">${fmtHMS(elapsedSec())}</span></span><span class="tnum" id="fPct">${st.targetSec ? Math.round(progress() * 100) + '%' : ''}</span></div>${st.targetSec ? `<div id="fBar">${progressBar(progress() * 100, 'thick')}</div>` : '<div class="t-caption muted">No target — open-ended session</div>'}</div></div>`;
}
export async function render() {
  const [items, tasks] = await Promise.all([getCalendarItems(), taskService.getAll()]);
  const st = focus.get(), active = focus.isActive(), by = groupByDate(items), sel = appState.cals.focus.selected, paused = st.status === 'paused';
  const big = active ? fmtHMS(displaySec()) : null;
  const label = active ? (st.phase === 'break' ? 'BREAK' : paused ? 'PAUSED' : st.mode === 'countup' ? 'ELAPSED' : 'REMAINING') : 'FOCUS MODE';
  const dayItems = itemsOn(items, sel);
  return `<div class="focus-page"><div class="focus-top"><button class="btn ghost" data-act="focus-exit" aria-label="Leave focus mode">${icon('ArrowLeft')}Exit focus mode</button><button class="btn icon ghost" data-act="focus-fullscreen" aria-label="Toggle full screen" data-tip="Full screen">${icon('Maximize2')}</button></div>
    <div class="focus-grid">
      <section class="focus-side card" aria-label="Session">${active ? infoHtml() : setupHtml(tasks)}</section>
      <section class="focus-clock" aria-label="${active ? 'Timer' : 'Clock'}"><div class="t-label focus-label ${paused ? 'text-yellow' : ''}">${label}</div>
        ${active ? `<div class="focus-time ${paused ? 'paused' : ''}" id="fTime" role="timer" aria-live="off">${big}</div><div class="focus-sub">${clockHtml({ size: 'sm', date: true, seconds: false })}</div>` : `<div class="focus-time">${clockHtml({ size: 'xl', date: true })}</div>`}</section>
      <div class="focus-controls">${active ? `${paused ? `<button class="btn primary lg" data-act="f-resume">${icon('Play')}Resume</button>` : `<button class="btn lg" data-act="f-pause">${icon('Pause')}Pause</button>`}<button class="btn primary lg" data-act="f-finish">${icon('Check')}Finish</button><button class="btn ghost lg" data-act="f-cancel">${icon('X')}Cancel</button>` : `<button class="btn primary lg" data-act="f-start">${icon('Play')}Start session</button>`}</div>
      <aside class="focus-cal card" aria-label="Calendar and schedule">${calendarHtml('focus', by, { compact: true })}<div class="mt-3">${calendarLegend(['task', 'session', 'event', 'deadline'])}</div><div class="divider"></div><div class="t-label mb-2">${sel === todayStr() ? 'Today' : fmtDateLong(sel)}</div>${timelineHtml(dayItems.slice(0, 6), { empty: { title: 'Nothing scheduled' } })}</aside>
    </div></div>`;
}
export function mount() {
  clearInterval(ticker);
  ticker = setInterval(() => {
    const t = document.getElementById('fTime'); if (!t) { if (!document.querySelector('.focus-page')) clearInterval(ticker); return; }
    if (!focus.isActive()) return; t.textContent = fmtHMS(displaySec());
    const e = document.getElementById('fElapsed'); if (e) e.textContent = fmtHMS(elapsedSec());
    const p = document.getElementById('fPct'); if (p && focus.get().targetSec) p.textContent = Math.round(progress() * 100) + '%';
    const b = document.querySelector('#fBar .progress'); if (b) { b.firstElementChild.style.setProperty('--pct', progress() * 100 + '%'); b.setAttribute('aria-valuenow', Math.round(progress() * 100)); }
  }, 250);
}
const grab = () => { const s = setup(), t = document.getElementById('fTitle'); if (t) s.title = t.value; return s; };
export const actions = {
  click: {
    'focus-exit': () => { navigate(appState.lastView && appState.lastView !== 'focus' ? appState.lastView : 'dashboard'); return false; },
    'focus-fullscreen': () => { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.().catch(() => toast.info('Full screen is not available here.')); return false; },
    'fs-mode': el => { grab(); appState.focusSetup.mode = el.dataset.m; if (el.dataset.m === 'countdown' && !appState.focusSetup.custom) appState.focusSetup.custom = settings.get('focus.countdownMin'); },
    'fs-preset': el => { const s = grab(); s.presetId = el.dataset.p; const p = settings.get('focus.presets').find(x => x.id === el.dataset.p); if (p) { s.custom = p.focus; s.customBreak = p.brk; } },
    'f-start': () => {
      const s = grab(), f = settings.get('focus'); let minutes = 0, brk = 0;
      if (s.mode === 'pomodoro') { const p = f.presets.find(x => x.id === s.presetId); if (p) { minutes = p.focus; brk = p.brk; } else { minutes = +s.custom || f.focusMin; brk = +s.customBreak || f.breakMin; } }
      else if (s.mode === 'countdown') minutes = +s.custom || f.countdownMin;
      if (s.mode !== 'countup' && !(minutes >= 1 && minutes <= 720)) { toast.warning('Enter a duration between 1 and 720 minutes.'); return false; }
      focus.start({ mode: s.mode, title: s.title, category: s.category, minutes, breakMin: brk }); toast.info('Focus session started'); return false;
    },
    'f-pause': () => { focus.pause(); return false; }, 'f-resume': () => { focus.resume(); return false; }, 'f-finish': () => { focus.finish(); return false; },
    'f-cancel': async () => { if (elapsedSec() > 60 && !await confirmModal({ title: 'Cancel this session?', message: 'The time you have logged so far will not be saved.', confirmLabel: 'Cancel session', cancelLabel: 'Keep going', danger: true })) return false; focus.cancel(); toast.info('Session cancelled'); return false; },
  },
  input: { 'fs-title': el => { appState.focusSetup.title = el.value; return false; }, 'fs-custom': el => { appState.focusSetup.custom = +el.value; return false; }, 'fs-brk': el => { appState.focusSetup.customBreak = +el.value; return false; } },
  change: { 'fs-cat': el => { grab(); appState.focusSetup.category = el.value; return false; } },
};
