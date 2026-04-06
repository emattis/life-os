"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import type { TaskType, EnergyLevel } from "@/types";

const TYPES: { value: TaskType; label: string; desc: string }[] = [
  { value: "to_do", label: "To-Do", desc: "Standalone action" },
  { value: "goal_task", label: "Goal Task", desc: "Linked to a goal" },
  { value: "event", label: "Event", desc: "Time-specific activity" },
];

const ENERGY_LEVELS: { value: EnergyLevel; label: string; icon: string }[] = [
  { value: "high", label: "High", icon: "🔴" },
  { value: "medium", label: "Medium", icon: "🟡" },
  { value: "low", label: "Low", icon: "🟢" },
];

interface GoalOption {
  id: string;
  title: string;
  category: string;
}

export interface TaskFormData {
  id?: string;
  title: string;
  description: string;
  type: string;
  priority: number;
  estimatedMins: number;
  dueDate: string;
  scheduledDate: string;
  goalId: string;
  recurring: string;
  energyLevel: string;
  tags: string;
}

interface TaskFormProps {
  initial?: TaskFormData;
  onSubmit: (data: TaskFormData) => void;
  onCancel: () => void;
}

const DEFAULT_FORM: TaskFormData = {
  title: "",
  description: "",
  type: "to_do",
  priority: 2,
  estimatedMins: 30,
  dueDate: "",
  scheduledDate: "",
  goalId: "",
  recurring: "",
  energyLevel: "medium",
  tags: "",
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function TaskForm({ initial, onSubmit, onCancel }: TaskFormProps) {
  const [form, setForm] = useState<TaskFormData>(initial ?? DEFAULT_FORM);
  const { data: goals } = useSWR<GoalOption[]>(
    "/api/goals?status=active",
    fetcher
  );

  useEffect(() => {
    if (initial) setForm(initial);
  }, [initial]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title) return;
    if (form.type === "goal_task" && !form.goalId) return;
    onSubmit(form);
  }

  const isEvent = form.type === "event";
  const isGoalTask = form.type === "goal_task";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Type Selector */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Type
        </label>
        <div className="grid grid-cols-3 gap-2">
          {TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() =>
                setForm({
                  ...form,
                  type: t.value,
                  goalId: t.value !== "goal_task" ? "" : form.goalId,
                  scheduledDate: t.value !== "event" ? "" : form.scheduledDate,
                })
              }
              className={`px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                form.type === t.value
                  ? "bg-accent/15 text-accent border border-accent/30"
                  : "bg-background border border-border text-muted hover:text-foreground"
              }`}
            >
              <span className="font-medium block">{t.label}</span>
              <span className="text-[11px] opacity-70">{t.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Title
        </label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder={
            isEvent
              ? "e.g., Jake's birthday party"
              : isGoalTask
                ? "e.g., Draft investor deck"
                : "e.g., Buy groceries"
          }
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
          required
        />
      </div>

      {/* Goal Picker — only for goal_task */}
      {isGoalTask && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Linked Goal
            <span className="text-red-400 ml-0.5">*</span>
          </label>
          {goals && goals.length > 0 ? (
            <select
              value={form.goalId}
              onChange={(e) => setForm({ ...form, goalId: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
              required
            >
              <option value="">Select a goal...</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title} ({g.category})
                </option>
              ))}
            </select>
          ) : (
            <p className="text-xs text-muted">
              No active goals. Create a goal first.
            </p>
          )}
        </div>
      )}

      {/* Scheduled Date/Time — only for events */}
      {isEvent && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Scheduled Date & Time
          </label>
          <input
            type="datetime-local"
            value={form.scheduledDate}
            onChange={(e) =>
              setForm({ ...form, scheduledDate: e.target.value })
            }
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 [color-scheme:dark]"
          />
        </div>
      )}

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Description
          <span className="text-muted font-normal ml-1">(optional)</span>
        </label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={2}
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
        />
      </div>

      {/* Priority & Duration */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Priority
          </label>
          <select
            value={form.priority}
            onChange={(e) =>
              setForm({ ...form, priority: Number(e.target.value) })
            }
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            <option value={1}>1 — Urgent</option>
            <option value={2}>2 — High</option>
            <option value={3}>3 — Medium</option>
            <option value={4}>4 — Low</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Est. Duration (min)
          </label>
          <input
            type="number"
            min={5}
            step={5}
            value={form.estimatedMins}
            onChange={(e) =>
              setForm({ ...form, estimatedMins: Number(e.target.value) })
            }
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>
      </div>

      {/* Energy Level */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Energy Level
        </label>
        <div className="flex gap-2">
          {ENERGY_LEVELS.map((e) => (
            <button
              key={e.value}
              type="button"
              onClick={() => setForm({ ...form, energyLevel: e.value })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                form.energyLevel === e.value
                  ? "bg-accent/15 text-accent border border-accent/30"
                  : "bg-background border border-border text-muted hover:text-foreground"
              }`}
            >
              <span>{e.icon}</span>
              {e.label}
            </button>
          ))}
        </div>
      </div>

      {/* Due Date & Recurring */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Due Date
            <span className="text-muted font-normal ml-1">(optional)</span>
          </label>
          <input
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 [color-scheme:dark]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Recurring
          </label>
          <select
            value={form.recurring}
            onChange={(e) => setForm({ ...form, recurring: e.target.value })}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            <option value="">None</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Tags
          <span className="text-muted font-normal ml-1">
            (comma-separated, optional)
          </span>
        </label>
        <input
          type="text"
          value={form.tags}
          onChange={(e) => setForm({ ...form, tags: e.target.value })}
          placeholder="e.g., deep-work, admin, quick-win"
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="flex-1 bg-accent hover:bg-accent/90 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          {initial?.id ? "Update Task" : "Create Task"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 rounded-lg text-sm font-medium text-muted hover:text-foreground border border-border hover:bg-white/5 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
