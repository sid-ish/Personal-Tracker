import { settings } from '../settings/settings.js';
import { gateService } from '../gate-service.js';
import { todayStr } from '../../utils/dates.js';
import { uid } from '../../utils/dom.js';

/**
 * Focus timer engine. Time is derived from timestamps (not tick counts) so it stays correct in background tabs,
 * and the active session is mirrored to localStorage so a reload doesn't lose it.
 */
const KEY = 'sos_focus_session';
const idle = () => ({ status: 'idle', mode: settings.get('focus.mode'), phase: 'focus', title: '', category: 'gate', targetSec: 0, startedAt: null, accMs: 0, breakMin: 0, taskId: null, startedISO: null });
let s = idle();
const subs = new Set();
let timer = null;

const load = () => { try { const j = JSON.parse(localStorage.getItem(KEY) || 'null'); if (j && j.status) s = { ...idle(), ...j }; } catch { /* ignore */ } };
const save = () => { try { s.status === 'idle' ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ } };
const emit = (type, extra = {}) => subs.forEach(fn => fn({ type, ...extra }));

export const elapsedMs = () => s.accMs + (s.status === 'running' ? Date.now() - s.startedAt : 0);
export const elapsedSec = () => Math.floor(elapsedMs() / 1000);
export const remainingSec = () => s.targetSec ? Math.max(0, s.targetSec - elapsedMs() / 1000) : null;
export const progress = () => s.targetSec ? Math.min(1, elapsedMs() / 1000 / s.targetSec) : 0;
/** Seconds to show on the big display: remaining for countdown-style modes, elapsed for count-up. */
export const displaySec = () => { const r = remainingSec(); return r == null ? elapsedSec() : Math.ceil(r); };

function beep() {
  if (!settings.get('focus.sound')) return;
  try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); [0, .22].forEach((t, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = i ? 784 : 659; g.gain.setValueAtTime(.0001, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(.18, ctx.currentTime + t + .02); g.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + t + .4); o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + .45); }); } catch { /* audio unavailable */ }
}
function summary() { return { title: s.title, category: s.category, durationMin: Math.max(1, Math.round(elapsedMs() / 60000)), phase: s.phase, mode: s.mode, breakMin: s.breakMin, taskId: s.taskId }; }

function stopTimer() { clearInterval(timer); timer = null; }
function ensureTimer() { if (!timer) timer = setInterval(tick, 250); }
function tick() {
  if (s.status !== 'running') return;
  if (s.targetSec && elapsedMs() / 1000 >= s.targetSec) return complete();
  emit('tick');
}
function complete() {
  const sum = summary(); s.accMs = Math.min(elapsedMs(), s.targetSec ? s.targetSec * 1000 : Infinity); s.status = 'done'; s.startedAt = null; stopTimer(); save(); beep();
  emit('complete', { summary: sum, auto: true });
}

export const focus = {
  get: () => s,
  subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
  isActive: () => s.status === 'running' || s.status === 'paused',
  init() { load(); if (s.status === 'running') ensureTimer(); if (s.status === 'done') { /* unsaved finished session: surface it again */ queueMicrotask(() => emit('complete', { summary: summary(), auto: false })); } document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); }); },
  start({ mode, title, category, minutes, breakMin = 0, taskId = null }) {
    s = { ...idle(), status: 'running', mode, phase: 'focus', title: (title || '').trim() || 'Focus session', category: category || 'gate', targetSec: mode === 'countup' ? 0 : Math.round(minutes * 60), breakMin: mode === 'pomodoro' ? breakMin : 0, startedAt: Date.now(), startedISO: new Date().toISOString(), taskId };
    save(); ensureTimer(); emit('change');
  },
  pause() { if (s.status !== 'running') return; s.accMs += Date.now() - s.startedAt; s.startedAt = null; s.status = 'paused'; stopTimer(); save(); emit('change'); },
  resume() { if (s.status !== 'paused') return; s.startedAt = Date.now(); s.status = 'running'; ensureTimer(); save(); emit('change'); },
  /** User pressed Finish: stops the timer and raises the completion event. */
  finish() { if (!focus.isActive()) return; const sum = summary(); if (s.status === 'running') { s.accMs += Date.now() - s.startedAt; s.startedAt = null; } s.status = 'done'; stopTimer(); save(); emit('complete', { summary: { ...sum, durationMin: Math.max(1, Math.round(s.accMs / 60000)) }, auto: false }); },
  cancel() { stopTimer(); s = idle(); save(); emit('change'); },
  /** Writes the finished focus phase to studySessions (same record shape the app has always used). */
  async saveSession(sum) {
    if (sum.phase === 'break') return null;
    const rec = { id: 'ss' + uid(''), date: todayStr(), category: sum.category, what: sum.title, durationMin: sum.durationMin, createdAt: new Date().toISOString() };
    await gateService.sessions.put(rec); return rec;
  },
  startBreak(min) { const t = s.title, c = s.category; s = { ...idle(), status: 'running', mode: 'countdown', phase: 'break', title: 'Break', category: c, targetSec: min * 60, startedAt: Date.now(), startedISO: new Date().toISOString() }; s.parentTitle = t; save(); ensureTimer(); emit('change'); },
  /** Clears a finished session after it has been saved or discarded. */
  dismiss() { s = idle(); save(); emit('change'); },
};
