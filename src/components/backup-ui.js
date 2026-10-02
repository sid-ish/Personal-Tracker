import { openModal } from './modal.js';
import { toast } from './toast.js';
import { exportBackup, readBackupFile, importBackup } from '../services/backup/backup.js';
import { applyAppearance } from '../services/theme/theme.js';
import { reapply } from '../services/background/background.js';
import { render } from '../app/router.js';
import { esc } from '../utils/escape-html.js';
import { fmtDate } from '../utils/dates.js';

export async function runExport() {
  try { const r = await exportBackup(); toast.success(`Backup exported · ${r.records} records`); return r; } catch (e) { console.error(e); toast.error('Export failed. Nothing was changed.'); }
}
/** File picker -> validation -> summary -> choose merge/replace -> confirm. Never writes before the user confirms. */
export function startImport() {
  const input = document.createElement('input'); input.type = 'file'; input.accept = 'application/json,.json'; input.hidden = true; document.body.appendChild(input);
  input.onchange = async () => { const f = input.files[0]; input.remove(); if (f) showImportDialog(await readBackupFile(f)); };
  input.addEventListener('cancel', () => input.remove()); input.click();
}
function showImportDialog(res) {
  if (!res.ok) { openModal({ title: 'This backup can’t be imported', body: `<p class="secondary">${res.errors.map(esc).join('<br>')}</p><p class="t-small muted mt-3">Nothing was changed.</p>`, actions: [{ label: 'Close', variant: 'primary' }] }); return; }
  const rows = Object.entries(res.counts).filter(([, n]) => n).map(([k, n]) => `<div class="row between t-small"><span class="secondary">${esc(k)}</span><span class="tnum">${n}</span></div>`).join('');
  const ctx = openModal({ title: 'Import backup', wide: false,
    body: `<p class="secondary mb-4">${res.total} records${res.backgrounds ? ` and ${res.backgrounds} custom background${res.backgrounds === 1 ? '' : 's'}` : ''} found${res.exportedAt ? ` (exported ${fmtDate(res.exportedAt.slice(0, 10))})` : ''}${res.legacy ? ' · original format' : ''}.</p>
      <div class="card flat tight mb-4" style="max-height:160px;overflow:auto">${rows}</div>
      ${res.warnings.length ? `<div class="chip yellow mb-4" style="height:auto;padding:6px 10px;white-space:normal">${res.warnings.map(esc).join(' ')}</div>` : ''}
      <fieldset class="col gap-2" style="border:0;padding:0;margin:0"><legend class="label mb-2">How should it be applied?</legend>
        <label class="row top"><input type="radio" name="mode" value="merge" checked><span><strong>Merge</strong><br><span class="t-small muted">Adds records and overwrites ones with the same ID. Nothing is deleted.</span></span></label>
        <label class="row top"><input type="radio" name="mode" value="replace"><span><strong>Replace everything</strong><br><span class="t-small muted">Swaps all current data for this backup. A safety copy of your current data downloads first.</span></span></label></fieldset>
      <label class="row mt-4" id="ackRow" hidden><input type="checkbox" id="ack"><span class="t-small">I understand this replaces all current data.</span></label>`,
    actions: [{ label: 'Cancel' }, { label: 'Import', variant: 'primary', id: 'doImport', close: false, onClick: async c => {
      const mode = c.el.querySelector('[name=mode]:checked').value;
      if (mode === 'replace' && !c.el.querySelector('#ack').checked) { c.setError('Tick the box to confirm replacing your data.'); return false; }
      c.setLoading(true);
      try { if (mode === 'replace') await exportBackup({ label: 'pre-import' }); await importBackup(res, mode); applyAppearance(); await reapply(); toast.success(mode === 'replace' ? 'Backup restored' : 'Backup merged'); c.close(); await render(); }
      catch (e) { console.error(e); c.setLoading(false); c.setError('Import failed and no data was changed. ' + (e.message || '')); }
      return false; } }] });
  const sync = () => { ctx.el.querySelector('#ackRow').hidden = ctx.el.querySelector('[name=mode]:checked').value !== 'replace'; };
  ctx.el.addEventListener('change', sync);
}
