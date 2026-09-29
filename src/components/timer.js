import { render } from '../app/router.js';
import { appState, resetTimer } from '../app/state.js';
import { gateService } from '../services/gate-service.js';
import { todayStr } from '../utils/dates.js';
import { $ } from '../utils/dom.js';
import { fmtTime } from '../utils/formatting.js';

export function timerElapsedSec(){ return Math.floor((appState.timer.elapsedBase + (appState.timer.running? Date.now()-appState.timer.startedAt:0))/1000); }

export function timerCardHtml(){
  const sec = timerElapsedSec();
  const logForm = appState.showTimerLogForm ? `<div class="addbar" style="margin-top:8px">
    <select id="sessCat"><option value="gate">GATE</option><option value="academic">Academic</option><option value="project">Project</option><option value="personal">Personal</option><option value="other">Other</option></select>
    <input type="text" id="sessWhat" placeholder="What did you study?">
    <button class="primary" data-act="timer-save">Save session</button>
    <button class="mini" data-act="timer-discard">Discard</button>
  </div>` : '';
  return `<div class="card section">
    <h2 style="margin:0 0 8px">Focus timer</h2>
    <div id="timerDisplay" style="font-size:2rem;font-weight:700;letter-spacing:.02em">${fmtTime(sec)}</div>
    <div class="addbar" style="margin-top:8px">
      ${!appState.timer.running? `<button class="primary" data-act="timer-start">Start</button>` : `<button class="mini" data-act="timer-pause">Pause</button>`}
      <button class="mini" data-act="timer-complete">Complete & log</button>
      <button class="mini" data-act="timer-reset">Reset</button>
    </div>
    ${logForm}
  </div>`;
}

/** Updates the on-screen clock once a second while the timer runs (no re-render). */
export function startTimerTicker() {
  setInterval(() => { const el = document.getElementById('timerDisplay'); if (el && appState.timer.running) el.textContent = fmtTime(timerElapsedSec()); }, 1000);
}

export const timerActions = {
  click: {
    'timer-start': () => { const t = appState.timer; t.running = true; t.startedAt = Date.now(); },
    'timer-pause': () => { const t = appState.timer; t.elapsedBase += Date.now() - t.startedAt; t.running = false; },
    'timer-complete': () => { const t = appState.timer; if (t.running) { t.elapsedBase += Date.now() - t.startedAt; t.running = false; } appState.showTimerLogForm = true; },
    'timer-reset': () => { resetTimer(); appState.showTimerLogForm = false; },
    'timer-discard': () => { appState.showTimerLogForm = false; },
    'timer-save': async () => {
      const durationMin = Math.max(1, Math.round(timerElapsedSec() / 60));
      await gateService.sessions.put({ id: 'ss' + Date.now(), date: todayStr(), category: $('sessCat').value, what: $('sessWhat').value.trim(), durationMin, createdAt: new Date().toISOString() });
      resetTimer(); appState.showTimerLogForm = false;
    },
  },
};
