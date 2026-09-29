import { taskService } from './task-service.js';

export const calendarService = {
  getTasks: () => taskService.getAll(),
  pendingDates: tasks => new Set(tasks.filter(t => !t.done).map(t => t.date)),
  tasksOn: (tasks, date) => tasks.filter(t => t.date === date),
};
