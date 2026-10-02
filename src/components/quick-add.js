import { openMenu } from './dropdown.js';
import { openNew } from './entity-forms.js';

export const QUICK_ITEMS = [
  { label: 'New task', icon: 'ListChecks', kbd: 'N', kind: 'task' }, { label: 'New event', icon: 'CalendarPlus', kind: 'event' }, { label: 'New project', icon: 'FolderKanban', kind: 'project' },
  { label: 'New study session', icon: 'Timer', kind: 'session' }, { label: 'New knowledge', icon: 'BookOpen', kind: 'knowledge' }, { label: 'New career entry', icon: 'Briefcase', kind: 'career' }, { label: 'New note', icon: 'StickyNote', kind: 'note' },
];
export const openQuickAdd = anchor => openMenu(anchor, QUICK_ITEMS.map(i => ({ ...i, onClick: () => openNew(i.kind) })), { align: 'right' });
