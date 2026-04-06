export type GoalCategory =
  | "health"
  | "career"
  | "personal"
  | "financial"
  | "relationships"
  | "creative";

export type GoalStatus = "active" | "completed" | "paused";

export type TaskStatus = "pending" | "in_progress" | "completed" | "deferred";

export type TaskPriority = 1 | 2 | 3 | 4;

export type EnergyLevel = "low" | "medium" | "high";

export type RecurringType = "daily" | "weekly" | "monthly";

export type TaskType = "goal_task" | "to_do" | "event";

export type BlockCategory =
  | "sleep"
  | "meal"
  | "exercise"
  | "commute"
  | "routine"
  | "work";

export interface ScheduleEntry {
  start: string;
  end: string;
  activity: string;
  type: "block" | "task" | "event" | "buffer";
  taskId?: string;
}

export interface OptimizedSchedule {
  schedule: ScheduleEntry[];
  reasoning: string;
  tasksDeferred: string[];
  suggestions: string[];
}
