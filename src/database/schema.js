// IMPORTANT: name and version are unchanged from the original single-file app so existing user data keeps working.
export const DB_NAME = 'sidharthos';
export const DB_VERSION = 7;
// keyPath is 'id' for every store except `meta`, which is keyed by 'key'.
export const STORES = [
  { name: 'tasks', keyPath: 'id' },
  { name: 'gateTopics', keyPath: 'id' },
  { name: 'meta', keyPath: 'key' },
  { name: 'projects', keyPath: 'id' },
  { name: 'mistakes', keyPath: 'id' },
  { name: 'studySessions', keyPath: 'id' },
  { name: 'pyqRecords', keyPath: 'id' },
  { name: 'internships', keyPath: 'id' },
  { name: 'universities', keyPath: 'id' },
  { name: 'skills', keyPath: 'id' },
  { name: 'resumeEntries', keyPath: 'id' },
  { name: 'events', keyPath: 'id' },
  { name: 'resources', keyPath: 'id' },
  { name: 'documents', keyPath: 'id' },
  { name: 'notes', keyPath: 'id' },
  { name: 'achievements', keyPath: 'id' }
];
export const ALL_STORES = STORES.map(s => s.name);
