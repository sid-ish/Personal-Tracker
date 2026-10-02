import { focus, displaySec, progress as focusProgress } from '../services/focus/focus.js';
import { openModal } from './modal.js';
import { toast } from './toast.js';
import { render } from '../app/router.js';
import { updateFocusPill } from './topbar.js';
import { appState } from '../app/state.js';
import { fmtHMS } from '../utils/formatting.js';
import { fmtDuration } from '../utils/dates.js';
import { esc } from '../utils/escape-html.js';

/** Global handler for finished focus sessions — works on any page, and survives reloads (unsaved sessions resurface). */
export function registerFocusCompletion() {
  let modalOpen = false;
  focus.subscribe(ev => {
    updateFocusPill();
    if (ev.type === 'tick' || ev.type === 'change') { document.title = focus.isActive() ? `${fmtHMS(displaySec())} · ${focus.get().phase === 'break' ? 'Break' : 'Focus'}` : document.title.replace(/^\d\d:\d\d:\d\d · (Focus|Break)/, 'Sidharth OS'); }
    if (ev.type === 'change' && appState.view === 'focus') render();
    if (ev.type !== 'complete' || modalOpen) return;
    const sum = ev.summary;
    if (sum.phase === 'break') { toast.info('Break finished. Ready when you are.'); focus.dismiss(); return; }
    modalOpen = true;
    const canBreak = sum.mode === 'pomodoro' && sum.breakMin > 0;
    const save = async c => { c.setLoading(true); await focus.saveSession(sum); toast.success(`Session saved · ${fmtDuration(sum.durationMin)}`); return true; };
    openModal({ title: 'Focus session completed',
      body: `<div class="col" style="align-items:center;text-align:center;padding:var(--sp-3) 0"><div class="t-numeric" style="font-size:2.6rem">${fmtDuration(sum.durationMin)}</div><div class="secondary">Duration</div><h3 class="mt-3">${esc(sum.title)}</h3></div>`,
      actions: [
        { label: 'Discard', onClick: () => { focus.dismiss(); } },
        ...(canBreak ? [{ label: `Save & start ${sum.breakMin} min break`, onClick: async c => { await save(c); focus.startBreak(sum.breakMin); } }] : []),
        { label: 'Save session', variant: 'primary', onClick: async c => { await save(c); focus.dismiss(); } },
      ],
      onClose: () => { modalOpen = false; if (focus.get().status === 'done') focus.dismiss(); render(); } });
  });
}
export const focusProgressPct = () => Math.round(focusProgress() * 100);
