import { knowledgeService } from '../../services/knowledge-service.js';
import { openModal, confirmModal } from '../../components/modal.js';
import { openKnowledgeForm } from '../../components/entity-forms.js';
import { toast } from '../../components/toast.js';
import { esc } from '../../utils/escape-html.js';
import { render } from '../../app/router.js';
import { fmtDate } from '../../utils/dates.js';

const REPOS = { notes: knowledgeService.notes, resources: knowledgeService.resources, documents: knowledgeService.documents };
export const titleOf = i => i.title || i.name || '';
export const tagsOf = i => i.tags || [];
export async function allKnowledge() {
  const [n, r, d] = await Promise.all([knowledgeService.notes.getAll(), knowledgeService.resources.getAll(), knowledgeService.documents.getAll()]);
  return [...n.map(x => ({ ...x, _store: 'notes', _kind: x.kind || 'note' })), ...r.map(x => ({ ...x, _store: 'resources', _kind: 'resource' })), ...d.map(x => ({ ...x, _store: 'documents', _kind: 'document' }))];
}
/** Items sharing tags rank highest; shared title words break ties. */
export function related(item, all, n = 4) {
  const words = new Set(titleOf(item).toLowerCase().split(/\W+/).filter(w => w.length > 3)), tg = new Set(tagsOf(item));
  return all.filter(o => !(o._store === item._store && o.id === item.id)).map(o => ({ o, s: tagsOf(o).filter(t => tg.has(t)).length * 3 + titleOf(o).toLowerCase().split(/\W+/).filter(w => words.has(w)).length })).filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, n).map(x => x.o);
}
export async function openKnowledgeItem(store, id) {
  const item = await REPOS[store]?.get(id); if (!item) { toast.warning('That item no longer exists.'); return; }
  const all = await allKnowledge(), rel = related({ ...item, _store: store }, all);
  const kind = store === 'notes' ? (item.kind || 'note') : store === 'resources' ? 'resource' : 'document';
  const ctx = openModal({ title: titleOf(item), wide: true,
    body: `<div class="row wrap gap-2 mb-4"><span class="chip primary">${kind}</span>${store === 'resources' ? `<span class="chip">${esc(item.rtype)}</span>` : ''}${store === 'documents' ? `<span class="chip">${esc(item.category)}</span>` : ''}${tagsOf(item).map(t => `<span class="chip">#${esc(t)}</span>`).join('')}${item.updatedAt ? `<span class="t-caption muted">Updated ${fmtDate(item.updatedAt.slice(0, 10))}</span>` : ''}</div>
      ${item.content ? `<div class="secondary" style="white-space:pre-wrap;line-height:1.65">${esc(item.content)}</div>` : ''}${item.url ? `<p class="mt-3"><a class="text-primary" href="${esc(item.url)}" target="_blank" rel="noopener">${esc(item.url)}</a></p>` : ''}
      ${!item.content && !item.url ? '<p class="muted">No additional content.</p>' : ''}
      ${rel.length ? `<div class="divider"></div><div class="t-label mb-2">Related knowledge</div><div class="col gap-1">${rel.map(o => `<button class="list-row clickable" data-rel="${o._store}:${o.id}"><span class="grow t-small">${esc(titleOf(o))}</span><span class="chip">${o._kind}</span></button>`).join('')}</div>` : ''}`,
    actions: [{ label: 'Delete', variant: 'danger', close: false, onClick: async c => { if (!await confirmModal({ title: 'Delete this item?', message: `“${titleOf(item)}” will be removed permanently.`, confirmLabel: 'Delete', danger: true })) return false; await REPOS[store].remove(id); c.close(); toast.success('Knowledge deleted'); await render(); return false; } },
      { label: 'Edit', variant: 'primary', onClick: () => { openKnowledgeForm(item, { store }); } }] });
  ctx.el.addEventListener('click', e => { const b = e.target.closest('[data-rel]'); if (!b) return; const [s, i] = b.dataset.rel.split(':'); ctx.close(); openKnowledgeItem(s, i); });
}
