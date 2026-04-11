"use client";

const CATEGORY_CONFIG: Record<
  string,
  { icon: string; label: string; color: string }
> = {
  health: { icon: "💪", label: "Health", color: "#22c55e" },
  career: { icon: "💼", label: "Career", color: "#3b82f6" },
  personal: { icon: "🌱", label: "Personal Growth", color: "#8b5cf6" },
  financial: { icon: "💰", label: "Financial", color: "#eab308" },
  relationships: { icon: "🤝", label: "Relationships", color: "#ec4899" },
  creative: { icon: "🎨", label: "Creative", color: "#f97316" },
};

const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "P1", color: "text-red-400 bg-red-400/10" },
  2: { label: "P2", color: "text-orange-400 bg-orange-400/10" },
  3: { label: "P3", color: "text-yellow-400 bg-yellow-400/10" },
  4: { label: "P4", color: "text-blue-400 bg-blue-400/10" },
  5: { label: "P5", color: "text-muted bg-white/5" },
};

const STATUS_BADGE: Record<
  string,
  { label: string; dotColor: string }
> = {
  active: { label: "Active", dotColor: "bg-green-400" },
  paused: { label: "Paused", dotColor: "bg-yellow-400" },
  completed: { label: "Completed", dotColor: "bg-blue-400" },
};

interface GoalCardProps {
  goal: {
    id: string;
    title: string;
    description: string | null;
    category: string;
    priority: number;
    targetDate: string | null;
    status: string;
    totalTasks: number;
    completedTasks: number;
    progress: number;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onClick?: (goal: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onEdit: (goal: any) => void;
  onArchive: (id: string, currentStatus: string) => void;
  onDelete: (id: string) => void;
}

export function GoalCard({ goal, onClick, onEdit, onArchive, onDelete }: GoalCardProps) {
  const cat = CATEGORY_CONFIG[goal.category] ?? {
    icon: "🎯",
    label: goal.category,
    color: "#6366f1",
  };
  const priority = PRIORITY_LABELS[goal.priority] ?? PRIORITY_LABELS[3];
  const status = STATUS_BADGE[goal.status] ?? STATUS_BADGE.active;

  const targetStr = goal.targetDate
    ? new Date(goal.targetDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const isOverdue =
    goal.targetDate &&
    goal.status === "active" &&
    new Date(goal.targetDate) < new Date();

  return (
    <div
      className="bg-card rounded-xl border border-border p-5 group hover:border-border/80 transition-colors flex flex-col cursor-pointer"
      onClick={() => onClick?.(goal)}
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: cat.color + "20",
              color: cat.color,
            }}
          >
            {cat.icon} {cat.label}
          </span>
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${priority.color}`}
          >
            {priority.label}
          </span>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(goal)}
            className="p-1.5 rounded-md text-muted hover:text-foreground hover:bg-white/5 transition-colors text-xs"
          >
            Edit
          </button>
          <button
            onClick={() => onArchive(goal.id, goal.status)}
            className="p-1.5 rounded-md text-muted hover:text-yellow-400 hover:bg-yellow-400/10 transition-colors text-xs"
          >
            {goal.status === "paused" ? "Resume" : "Pause"}
          </button>
          <button
            onClick={() => onDelete(goal.id)}
            className="p-1.5 rounded-md text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors text-xs"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Title & Description */}
      <h3 className="font-semibold text-foreground mb-1">{goal.title}</h3>
      {goal.description && (
        <p className="text-sm text-muted line-clamp-2 mb-3">
          {goal.description}
        </p>
      )}

      {/* Spacer to push bottom content down */}
      <div className="flex-1" />

      {/* Progress bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted">
            {goal.completedTasks}/{goal.totalTasks} tasks
          </span>
          <span className="text-xs font-mono text-foreground">
            {goal.progress}%
          </span>
        </div>
        <div className="h-1.5 bg-background rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${goal.progress}%`,
              backgroundColor: cat.color,
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
          <span className="text-xs text-muted">{status.label}</span>
        </div>
        {targetStr && (
          <span
            className={`text-xs font-mono ${
              isOverdue ? "text-red-400" : "text-muted"
            }`}
          >
            {isOverdue ? "Overdue: " : ""}
            {targetStr}
          </span>
        )}
      </div>
    </div>
  );
}
