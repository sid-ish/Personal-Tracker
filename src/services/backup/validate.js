import { isValidDate } from '../../utils/validation.js';

/**
 * Lightweight record validation for backup imports. Only fields the app actually reads are checked, and optional
 * fields may be absent or null. Rules: s = string, n = finite number, b = boolean, a = array, o = plain object,
 * d = date (YYYY-MM-DD, or empty). A trailing "!" marks a required field.
 */
const SCHEMAS = {
  tasks: { id: 's!', text: 's!', date: 'd', priority: 's', category: 's', done: 'b', projectId: 's', estimatedMinutes: 'n' },
  gateTopics: { id: 's!', paper: 's', subject: 's', topic: 's!', subtopics: 'a', notes: 's', nextRevision: 'd', lastStudied: 'd' },
  meta: { key: 's!' },
  projects: { id: 's!', name: 's!', status: 's', targetDate: 'd', description: 's', notes: 's', milestones: 'a', changelog: 'a', resources: 'a' },
  mistakes: { id: 's!', paper: 's', subject: 's', what: 's', correct: 's', date: 'd', resolved: 'b' },
  studySessions: { id: 's!', date: 'd', category: 's', what: 's', durationMin: 'n' },
  pyqRecords: { id: 's!', paper: 's', subject: 's', topic: 's', attempted: 'n', correct: 'n', date: 'd' },
  internships: { id: 's!', company: 's!', role: 's', status: 's', type: 's', location: 's', startDate: 'd', deadline: 'd', interviewDate: 'd', nextAction: 's', notes: 's' },
  universities: { id: 's!', name: 's!', country: 's', program: 's', deadline: 'd', checklist: 'o' },
  skills: { id: 's!', name: 's!', category: 's', level: 'n', evidence: 's' },
  resumeEntries: { id: 's!', section: 's', title: 's!', organization: 's', date: 's', description: 's' },
  events: { id: 's!', title: 's!', etype: 's', date: 'd', time: 's', location: 's', notes: 's' },
  resources: { id: 's!', title: 's', rtype: 's', url: 's', status: 's', tags: 'a' },
  documents: { id: 's!', name: 's', category: 's', url: 's', tags: 'a' },
  notes: { id: 's!', title: 's', content: 's', kind: 's', url: 's', tags: 'a' },
  achievements: { id: 's!', title: 's!', atype: 's', date: 's', organization: 's', description: 's' },
};
const isPlain = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const TESTS = {
  s: v => typeof v === 'string', n: v => typeof v === 'number' && Number.isFinite(v), b: v => typeof v === 'boolean',
  a: v => Array.isArray(v), o: isPlain, d: v => typeof v === 'string' && (v === '' || isValidDate(v)),
};
const NAMES = { s: 'text', n: 'a number', b: 'true/false', a: 'a list', o: 'an object', d: 'a date (YYYY-MM-DD)' };

/** Returns a list of problems for one record (empty when it is fine). */
function checkFields(record, schema) {
  const problems = [];
  for (const [field, rule] of Object.entries(schema)) {
    const required = rule.endsWith('!'), kind = rule[0], v = record[field];
    if (v === undefined || v === null) { if (required) problems.push(`“${field}” is missing`); continue; }
    if (!TESTS[kind](v)) problems.push(`“${field}” should be ${NAMES[kind]}`);
    else if (required && kind === 's' && !v.trim()) problems.push(`“${field}” is empty`);
  }
  return problems;
}
/** Validates a record from `store`. The primary key must be a non-empty string or finite number. */
export function validateRecord(store, record, keyPath) {
  if (!isPlain(record)) return ['is not an object'];
  const key = record[keyPath];
  const problems = (typeof key === 'number' ? Number.isFinite(key) : typeof key === 'string' && key !== '') ? [] : [`“${keyPath}” is missing or invalid`];
  const schema = { ...(SCHEMAS[store] || {}) }; delete schema[keyPath];
  problems.push(...checkFields(record, schema));
  if (store === 'meta' && record.key === 'settings') problems.push(...checkSettings(record.value));
  return problems;
}
/** The background section drives rendering, so a malformed one could break every page. */
function checkSettings(v) {
  if (!isPlain(v)) return ['the saved settings are not an object'];
  const bg = v.background; if (bg === undefined) return [];
  if (!isPlain(bg)) return ['“background” settings should be an object'];
  const out = [];
  if (bg.perPage !== undefined && typeof bg.perPage !== 'boolean') out.push('“background.perPage” should be true/false');
  if (bg.global !== undefined && !isPlain(bg.global)) out.push('“background.global” should be an object');
  if (bg.pages !== undefined && !isPlain(bg.pages)) out.push('“background.pages” should be an object');
  else for (const [page, cfg] of Object.entries(bg.pages || {})) if (!isPlain(cfg)) out.push(`“background.pages.${page}” should be an object`);
  return out;
}
/** Validates one serialized custom background from a backup file. */
export function validateBackground(b) {
  if (!isPlain(b)) return ['is not an object'];
  const out = [];
  if (typeof b.id !== 'string' || !b.id) out.push('“id” is missing');
  if (typeof b.dataUrl !== 'string' || !/^data:image\/(jpeg|png|webp);/.test(b.dataUrl)) out.push('“dataUrl” is not a JPG, PNG or WebP image');
  if (b.thumbUrl != null && (typeof b.thumbUrl !== 'string' || !/^data:image\/(jpeg|png|webp);/.test(b.thumbUrl))) out.push('“thumbUrl” is not an image');
  if (b.name !== undefined && typeof b.name !== 'string') out.push('“name” should be text');
  return out;
}
