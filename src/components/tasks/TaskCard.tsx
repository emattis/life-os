"use client";

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  goal_task: { label: "Goal Task", color: "text-violet-400 bg-violet-400/10" },
  to_do: { label: "To-Do", color: "text-blue-400 bg-blue-400/10" },
  event: { label: "Event", color: "text-pink-400 bg-pink-400/10" },
};

const PRIORITY_CONFIG: Record<number, { label: string; color: string }> = {
  1: { label: "Urgent", color: "text-red-400 bg-red-400/10 border-red-400/20" },
  2: { label: "High", color: "text-orange-400 bg-orange-400/10 border-orange-400/20" },
  3: { label: "Medium", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
  4: { label: "Low", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
};

const STATUS_FLOW: Record<string, { next: string; label: string }> = {
  pending: { next: "in_progress", label: "Start" },
  in_progress: { next: "completed", label: "Complete" },
  completed: { next: "pending", label: "Reopen" },
  deferred: { next: "pending", label: "Resume" },
};

const STATUS_DOTS: Record<string, string> = {
  pending: "bg-gray-400",
  in_progress: "bg-blue-400 animate-pulse",
  completed: "bg-green-400",
  deferred: "bg-yellow-400",
};

const ENERGY_ICONS: Record<string, string> = {
  high: "🔴",
  medium: "🟡",
  low: "🟢",
};

interface TaskGoal {
  id: string;
  title: string;
  category: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  type: string;
  priority: number;
  status: string;
  estimatedMins: number;
  dueDate: string | null;
  scheduledDate: string | null;
  goalId: string | null;
  goal: TaskGoal | null;
  recurring: string | null;
  energyLevel: string;
  tags: string | null;
  completedAt: string | null;
}

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}

export function TaskCard({
  task,
  onEdit,
  onStatusChange,
  onDelete,
}: TaskCardProps) {
  const typeConfig = TYPE_CONFIG[task.type] ?? TYPE_CONFIG.to_do;
  const priorityConfig = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG[3];
  const statusFlow = STATUS_FLOW[task.status] ?? STATUS_FLOW.pending;
  const statusDot = STATUS_DOTS[task.status] ?? STATUS_DOTS.pending;
  const isCompleted = task.status === "completed";

  const dueDateStr = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  const scheduledStr = task.scheduledDate
    ? new Date(task.scheduledDate).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  const isOverdue =
    task.dueDate &&
    task.status !== "completed" &&
    new Date(task.dueDate) < new Date();

  return (
    <div
      className={`bg-card rounded-xl border border-border p-4 group hover:border-border/80 transition-colors ${
        isCompleted ? "opacity-60" : ""
      }`}
    >
      {/* Top row: type + priority + actions */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${typeConfig.color}`}
          >
            {typeConfig.label}
          </span>
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${priorityConfig.color}`}
          >
            {priorityConfig.label}
          </span>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(task)}
            className="p-1.5 rounded-md text-muted hover:text-foreground hover:bg-white/5 transition-colors text-xs"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-1.5 rounded-md text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors text-xs"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Title */}
      <h3
        className={`font-medium text-foreground mb-1 ${
          isCompleted ? "line-through" : ""
        }`}
      >
        {task.title}
      </h3>

      {/* Description */}
      {task.description && (
        <p className="text-sm text-muted line-clamp-2 mb-2">
          {task.description}
        </p>
      )}

      {/* Goal tag */}
      {task.goal && (
        <div className="mb-2">
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-violet-400/10 text-violet-400">
            {task.goal.title}
          </span>
        </div>
      )}

      {/* Meta row: energy, duration, recurring */}
      <div className="flex items-center gap-3 mb-3 text-xs text-muted">
        <span title="Energy level">
          {ENERGY_ICONS[task.energyLevel] ?? "🟡"} {task.energyLevel}
        </span>
        <span className="font-mono">{task.estimatedMins}m</span>
        {task.recurring && (
          <span className="text-accent/70">↻ {task.recurring}</span>
        )}
        {task.tags && (
          <span className="truncate max-w-[120px]" title={task.tags}>
            #{task.tags.split(",")[0].trim()}
          </span>
        )}
      </div>

      {/* Footer: status + dates + action */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
            <span className="text-xs text-muted capitalize">
              {task.status.replace("_", " ")}
            </span>
          </div>
          {scheduledStr && (
            <span className="text-xs font-mono text-pink-400">
              {scheduledStr}
            </span>
          )}
          {dueDateStr && (
            <span
              className={`text-xs font-mono ${
                isOverdue ? "text-red-400" : "text-muted"
              }`}
            >
              {isOverdue ? "Overdue " : "Due "}
              {dueDateStr}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {task.status !== "deferred" && task.status !== "completed" && (
            <button
              onClick={() => onStatusChange(task.id, "deferred")}
              className="px-2 py-1 rounded text-[10px] font-medium text-muted hover:text-yellow-400 hover:bg-yellow-400/10 transition-colors"
            >
              Defer
            </button>
          )}
          <button
            onClick={() => onStatusChange(task.id, statusFlow.next)}
            className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
              statusFlow.next === "completed"
                ? "text-green-400 hover:bg-green-400/10"
                : "text-accent hover:bg-accent/10"
            }`}
          >
            {statusFlow.label}
          </button>
        </div>
      </div>
    </div>
  );
}
