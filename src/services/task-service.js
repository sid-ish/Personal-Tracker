import { createRepository } from '../database/queries.js';
import { getBacklog, getTodayTasks, getUpcoming, pickFocus } from '../utils/calculations.js';

const repo = createRepository('tasks');
export const taskService = {
  ...repo,
  getTodayTasks: async () => getTodayTasks(await repo.getAll()),
  getBacklog: async () => getBacklog(await repo.getAll()),
  getUpcoming: async (days = 7) => getUpcoming(await repo.getAll(), days),
  getFocus: async () => pickFocus(await repo.getAll()),
};
