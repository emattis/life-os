"use client";

import { useState, useCallback } from "react";
import { useToast } from "@/components/layout/Toast";

const CATEGORY_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  health: { icon: "💪", label: "Health", color: "#22c55e" },
  career: { icon: "💼", label: "Career", color: "#3b82f6" },
  personal: { icon: "🌱", label: "Personal Growth", color: "#8b5cf6" },
  financial: { icon: "💰", label: "Financial", color: "#eab308" },
  relationships: { icon: "🤝", label: "Relationships", color: "#ec4899" },
  creative: { icon: "🎨", label: "Creative", color: "#f97316" },
};

const PRIORITY_LABELS: Record<number, string> = {
  1: "Urgent",
  2: "High",
  3: "Medium",
  4: "Low",
  5: "Lowest",
};

const ENERGY_ICONS: Record<string, string> = {
  high: "🔴",
  medium: "🟡",
  low: "🟢",
};

interface GoalTask {
  id: string;
  title: string;
  type: string;
  priority: number;
  status: string;
  estimatedMins: number;
  dueDate: string | null;
  energyLevel: string;
  completedAt: string | null;
}

interface GoalDetail {
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
  tasks: GoalTask[];
}

interface GoalDetailPanelProps {
  goal: GoalDetail;
  onClose: () => void;
  onRefresh: () => void;
}

export function GoalDetailPanel({ goal, onClose, onRefresh }: GoalDetailPanelProps) {
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTask, setEditingTask] = useState<GoalTask | null>(null);
  const { toast } = useToast();

  const cat = CATEGORY_CONFIG[goal.category] ?? {
    icon: "🎯",
    label: goal.category,
    color: "#6366f1",
  };

  const targetStr = goal.targetDate
    ? new Date(goal.targetDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const pendingTasks = goal.tasks.filter((t) => t.status !== "completed");
  const completedTasks = goal.tasks.filter((t) => t.status === "completed");

  const handleStatusChange = useCallback(
    async (taskId: string, status: string) => {
      try {
        await fetch("/api/tasks", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: taskId, status }),
        });
        if (status === "completed") toast("Task completed!");
        onRefresh();
      } catch {
        toast("Failed to update task", "error");
      }
    },
    [toast, onRefresh]
  );

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      try {
        await fetch(`/api/tasks?id=${taskId}`, { method: "DELETE" });
        toast("Task deleted");
        onRefresh();
      } catch {
        toast("Failed to delete task", "error");
      }
    },
    [toast, onRefresh]
  );

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-card border-l border-border z-50 overflow-y-auto animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-5 z-10">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: cat.color + "20", color: cat.color }}
                >
                  {cat.icon} {cat.label}
                </span>
                <span className="text-[10px] font-bold text-muted">
                  P{goal.priority}
                </span>
              </div>
              <h2 className="text-xl font-bold text-foreground">{goal.title}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-muted hover:text-foreground transition-colors shrink-0"
            >
              ✕
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted">
                {goal.completedTasks}/{goal.totalTasks} tasks completed
              </span>
              <span className="text-xs font-mono text-foreground">
                {goal.progress}%
              </span>
            </div>
            <div className="h-2 bg-background rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${goal.progress}%`, backgroundColor: cat.color }}
              />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-6">
          {/* Description & meta */}
          {(goal.description || targetStr) && (
            <div>
              {goal.description && (
                <p className="text-sm text-foreground/80 mb-2">
                  {goal.description}
                </p>
              )}
              {targetStr && (
                <p className="text-xs text-muted font-mono">
                  Target: {targetStr}
                </p>
              )}
            </div>
          )}

          {/* Add task button */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted uppercase tracking-wider">
              Tasks ({goal.tasks.length})
            </h3>
            <button
              onClick={() => {
                setShowAddTask(true);
                setEditingTask(null);
              }}
              className="text-xs text-accent hover:text-accent/80 transition-colors font-medium"
            >
              + Add Task
            </button>
          </div>

          {/* Inline task form */}
          {(showAddTask || editingTask) && (
            <InlineTaskForm
              goalId={goal.id}
              editing={editingTask}
              onSave={() => {
                setShowAddTask(false);
                setEditingTask(null);
                onRefresh();
              }}
              onCancel={() => {
                setShowAddTask(false);
                setEditingTask(null);
              }}
            />
          )}

          {/* Pending tasks */}
          {pendingTasks.length > 0 && (
            <div className="space-y-1">
              {pendingTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onStatusChange={handleStatusChange}
                  onEdit={setEditingTask}
                  onDelete={handleDeleteTask}
                />
              ))}
            </div>
          )}

          {/* Completed tasks */}
          {completedTasks.length > 0 && (
            <div>
              <p className="text-[10px] text-muted uppercase tracking-wider mb-2">
                Completed
              </p>
              <div className="space-y-1 opacity-50">
                {completedTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    completed
                    onStatusChange={handleStatusChange}
                    onEdit={setEditingTask}
                    onDelete={handleDeleteTask}
                  />
                ))}
              </div>
            </div>
          )}

          {goal.tasks.length === 0 && !showAddTask && (
            <p className="text-xs text-muted/60 text-center py-4">
              No tasks linked to this goal yet.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

function TaskRow({
  task,
  completed,
  onStatusChange,
  onEdit,
  onDelete,
}: {
  task: GoalTask;
  completed?: boolean;
  onStatusChange: (id: string, status: string) => void;
  onEdit: (task: GoalTask) => void;
  onDelete: (id: string) => void;
}) {
  const isActive = task.status === "in_progress";
  const dueDateStr = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-background/50 group transition-colors">
      {/* Checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onStatusChange(
            task.id,
            completed
              ? "pending"
              : isActive
                ? "completed"
                : "in_progress"
          );
        }}
        className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors ${
          completed
            ? "bg-green-400/20 border-green-400 text-green-400"
            : isActive
              ? "border-blue-400 bg-blue-400/20"
              : "border-border hover:border-accent"
        }`}
      >
        {completed && <span className="text-[8px]">✓</span>}
        {isActive && <span className="text-[8px] text-blue-400">●</span>}
      </button>

      {/* Content (clickable to edit) */}
      <button
        onClick={() => onEdit(task)}
        className="flex-1 min-w-0 text-left"
      >
        <span
          className={`text-sm block truncate ${
            completed
              ? "line-through text-muted"
              : "text-foreground"
          }`}
        >
          {task.title}
        </span>
        <span className="text-[10px] text-muted flex items-center gap-2">
          <span>{ENERGY_ICONS[task.energyLevel] ?? "🟡"}</span>
          <span className="font-mono">{task.estimatedMins}m</span>
          <span>{PRIORITY_LABELS[task.priority] ?? "P" + task.priority}</span>
          {dueDateStr && <span>Due {dueDateStr}</span>}
        </span>
      </button>

      {/* Delete */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(task.id);
        }}
        className="p-1 text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-xs"
      >
        ✕
      </button>
    </div>
  );
}

function InlineTaskForm({
  goalId,
  editing,
  onSave,
  onCancel,
}: {
  goalId: string;
  editing: GoalTask | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [priority, setPriority] = useState(editing?.priority ?? 2);
  const [estimatedMins, setEstimatedMins] = useState(editing?.estimatedMins ?? 30);
  const [energyLevel, setEnergyLevel] = useState(editing?.energyLevel ?? "medium");
  const [dueDate, setDueDate] = useState(
    editing?.dueDate
      ? new Date(editing.dueDate).toISOString().split("T")[0]
      : ""
  );
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);

    try {
      if (editing) {
        await fetch("/api/tasks", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editing.id,
            title,
            priority,
            estimatedMins,
            energyLevel,
            dueDate: dueDate || null,
          }),
        });
        toast("Task updated");
      } else {
        await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            type: "goal_task",
            goalId,
            priority,
            estimatedMins,
            energyLevel,
            dueDate: dueDate || null,
          }),
        });
        toast("Task created");
      }
      onSave();
    } catch {
      toast("Failed to save task", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-background rounded-lg border border-border p-4 space-y-3 animate-fade-in-up"
    >
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title..."
        autoFocus
        className="w-full bg-transparent border-b border-border pb-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
        required
      />
      <div className="flex flex-wrap gap-3 text-xs">
        <select
          value={priority}
          onChange={(e) => setPriority(Number(e.target.value))}
          className="bg-card border border-border rounded px-2 py-1 text-foreground"
        >
          <option value={1}>Urgent</option>
          <option value={2}>High</option>
          <option value={3}>Medium</option>
          <option value={4}>Low</option>
        </select>
        <input
          type="number"
          min={5}
          step={5}
          value={estimatedMins}
          onChange={(e) => setEstimatedMins(Number(e.target.value))}
          className="w-16 bg-card border border-border rounded px-2 py-1 text-foreground"
          title="Estimated minutes"
        />
        <select
          value={energyLevel}
          onChange={(e) => setEnergyLevel(e.target.value)}
          className="bg-card border border-border rounded px-2 py-1 text-foreground"
        >
          <option value="high">🔴 High</option>
          <option value="medium">🟡 Medium</option>
          <option value="low">🟢 Low</option>
        </select>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="bg-card border border-border rounded px-2 py-1 text-foreground"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-accent hover:bg-accent/90 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
        >
          {saving ? "Saving..." : editing ? "Update" : "Add Task"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-xs text-muted hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
