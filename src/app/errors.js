import { exportRecovery } from '../services/backup/backup.js';
import { toast } from '../components/toast.js';

// Full details go to the console only. Users see a short, non-technical message.
const seen = new Set();
export function handleError(err) {
  console.error('[Sidharth OS]', err);
  const key = String(err?.message || err).slice(0, 80);
  if (seen.has(key)) return; seen.add(key); setTimeout(() => seen.delete(key), 4000);
  try { toast.error('Something went wrong. Your data is safe.'); } catch { /* UI not ready */ }
}
export const registerGlobalErrorHandlers = () => {
  window.addEventListener('error', e => { if (e.target !== window) return; handleError(e.error || e.message); });
  window.addEventListener('unhandledrejection', e => handleError(e.reason));
};
/** Full-page recovery screen for failures that stop the app from starting. Local data is never touched. */
export function showRecovery(err) {
  console.error('[Sidharth OS] fatal', err);
  document.getElementById('app').innerHTML = `<div class="recovery" role="alert"><div class="card">
    <h1 class="mb-2">Something went wrong</h1>
    <p class="secondary">Your local data has not been deleted. Reloading usually fixes this. If it keeps happening, export your data first.</p>
    <div class="row end mt-6" style="justify-content:center"><button class="btn primary" id="rcReload">Reload</button><button class="btn" id="rcExport">Export recovery data</button></div>
    <p class="t-caption muted mt-4" id="rcMsg"></p></div></div>`;
  document.getElementById('rcReload').onclick = () => location.reload();
  document.getElementById('rcExport').onclick = async () => { try { await exportRecovery(); document.getElementById('rcMsg').textContent = 'Recovery file downloaded.'; } catch { document.getElementById('rcMsg').textContent = 'Could not export. Try reloading first.'; } };
}
