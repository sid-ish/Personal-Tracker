import { createRepository } from '../database/queries.js';
import { taskService } from './task-service.js';

const repo = createRepository('projects');
export const projectService = {
  ...repo,
  /** Unlinks tasks from the project, then deletes it (same behaviour as the original del-proj handler). */
  async deleteProject(id) {
    const tasks = await taskService.getAll();
    for (const t of tasks) { if (t.projectId === id) { t.projectId = null; await taskService.put(t); } }
    await repo.remove(id);
  },
};
