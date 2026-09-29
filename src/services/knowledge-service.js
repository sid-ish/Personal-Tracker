import { createRepository } from '../database/queries.js';

export const knowledgeService = {
  events: createRepository('events'),
  resources: createRepository('resources'),
  documents: createRepository('documents'),
  notes: createRepository('notes'),
  achievements: createRepository('achievements'),
};
