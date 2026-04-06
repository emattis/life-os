"use client";

import Link from "next/link";

const PRIORITY_DOTS: Record<number, string> = {
  1: "bg-red-400",
  2: "bg-orange-400",
  3: "bg-yellow-400",
  4: "bg-blue-400",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "text-gray-400",
  in_progress: "text-blue-400",
  deferred: "text-yellow-400",
};

interface TaskGoal {
  id: string;
  title: string;
  category: string;
}

interface Task {
  id: string;
  title: string;
  type: string;
  priority: number;
  status: string;
  estimatedMins: number;
  dueDate: string | null;
  goal: TaskGoal | null;
  energyLevel: string;
}

interface TasksByTypeProps {
  goalTasks: Task[];
  todos: Task[];
  events: Task[];
  onStatusChange: (id: string, status: string) => void;
}

function TaskRow({
  task,
  onStatusChange,
}: {
  task: Task;
  onStatusChange: (id: string, status: string) => void;
}) {
  const priorityDot = PRIORITY_DOTS[task.priority] ?? PRIORITY_DOTS[3];
  const isOverdue =
    task.dueDate &&
    task.status !== "completed" &&
    new Date(task.dueDate) < new Date();

  return (
    <div className="flex items-center gap-3 py-2 group">
      {/* Complete checkbox */}
      <button
        onClick={() =>
          onStatusChange(
            task.id,
            task.status === "in_progress" ? "completed" : "in_progress"
          )
        }
        className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors ${
          task.status === "in_progress"
            ? "border-blue-400 bg-blue-400/20"
            : "border-border hover:border-accent"
        }`}
      >
        {task.status === "in_progress" && (
          <span className="text-[8px] text-blue-400">●</span>
        )}
      </button>

      {/* Priority dot */}
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${priorityDot}`} />

      {/* Title & meta */}
      <div className="flex-1 min-w-0">
        <span className="text-sm text-foreground truncate block">
          {task.title}
        </span>
        <div className="flex items-center gap-2 text-[10px]">
          {task.goal && (
            <span className="text-violet-400">{task.goal.title}</span>
          )}
          <span className="font-mono text-muted">{task.estimatedMins}m</span>
          {isOverdue && <span className="text-red-400 font-medium">Overdue</span>}
          <span className={STATUS_STYLES[task.status] ?? "text-muted"}>
            {task.status.replace("_", " ")}
          </span>
        </div>
      </div>
    </div>
  );
}

export function TasksByType({
  goalTasks,
  todos,
  events,
  onStatusChange,
}: TasksByTypeProps) {
  const hasAny = goalTasks.length > 0 || todos.length > 0 || events.length > 0;

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-muted uppercase tracking-wider">
          Active Tasks
        </h2>
        <Link href="/tasks" className="text-xs text-accent hover:underline">
          View all
        </Link>
      </div>

      {!hasAny ? (
        <p className="text-xs text-muted/60 text-center py-4">
          No pending tasks.{" "}
          <Link href="/tasks" className="text-accent hover:underline">
            Add one
          </Link>
        </p>
      ) : (
        <div className="space-y-4">
          {/* Goal Tasks */}
          {goalTasks.length > 0 && (
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-violet-400 mb-1">
                Goal Tasks
              </h3>
              <div className="divide-y divide-border/50">
                {goalTasks.slice(0, 5).map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    onStatusChange={onStatusChange}
                  />
                ))}
              </div>
              {goalTasks.length > 5 && (
                <p className="text-[10px] text-muted mt-1">
                  +{goalTasks.length - 5} more
                </p>
              )}
            </div>
          )}

          {/* Events */}
          {events.length > 0 && (
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-pink-400 mb-1">
                Events
              </h3>
              <div className="divide-y divide-border/50">
                {events.slice(0, 4).map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    onStatusChange={onStatusChange}
                  />
                ))}
              </div>
            </div>
          )}

          {/* To-Dos */}
          {todos.length > 0 && (
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-1">
                To-Dos
              </h3>
              <div className="divide-y divide-border/50">
                {todos.slice(0, 5).map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    onStatusChange={onStatusChange}
                  />
                ))}
              </div>
              {todos.length > 5 && (
                <p className="text-[10px] text-muted mt-1">
                  +{todos.length - 5} more
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
