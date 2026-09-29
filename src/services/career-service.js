import { createRepository } from '../database/queries.js';

export const careerService = {
  internships: createRepository('internships'),
  universities: createRepository('universities'),
  skills: createRepository('skills'),
  resume: createRepository('resumeEntries'),
};
