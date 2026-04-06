"use client";

import { useState, useEffect } from "react";
import type { GoalCategory, GoalStatus } from "@/types";

const CATEGORIES: { value: GoalCategory; label: string; icon: string }[] = [
  { value: "health", label: "Health", icon: "💪" },
  { value: "career", label: "Career", icon: "💼" },
  { value: "personal", label: "Personal Growth", icon: "🌱" },
  { value: "financial", label: "Financial", icon: "💰" },
  { value: "relationships", label: "Relationships", icon: "🤝" },
  { value: "creative", label: "Creative", icon: "🎨" },
];

const STATUSES: { value: GoalStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
];

export interface GoalFormData {
  id?: string;
  title: string;
  description: string;
  category: string;
  priority: number;
  targetDate: string;
  status: string;
}

interface GoalFormProps {
  initial?: GoalFormData;
  onSubmit: (data: GoalFormData) => void;
  onCancel: () => void;
}

const DEFAULT_FORM: GoalFormData = {
  title: "",
  description: "",
  category: "personal",
  priority: 1,
  targetDate: "",
  status: "active",
};

export function GoalForm({ initial, onSubmit, onCancel }: GoalFormProps) {
  const [form, setForm] = useState<GoalFormData>(initial ?? DEFAULT_FORM);

  useEffect(() => {
    if (initial) setForm(initial);
  }, [initial]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title) return;
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Goal Title
        </label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="e.g., Run a marathon"
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Description
          <span className="text-muted font-normal ml-1">(optional)</span>
        </label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="What does achieving this goal look like?"
          rows={3}
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Category
        </label>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setForm({ ...form, category: cat.value })}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                form.category === cat.value
                  ? "bg-accent/15 text-accent border border-accent/30"
                  : "bg-background border border-border text-muted hover:text-foreground"
              }`}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Priority & Target Date */}
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
            <option value={1}>1 — Highest</option>
            <option value={2}>2 — High</option>
            <option value={3}>3 — Medium</option>
            <option value={4}>4 — Low</option>
            <option value={5}>5 — Lowest</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Target Date
            <span className="text-muted font-normal ml-1">(optional)</span>
          </label>
          <input
            type="date"
            value={form.targetDate}
            onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 [color-scheme:dark]"
          />
        </div>
      </div>

      {/* Status (only show on edit) */}
      {initial?.id && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Status
          </label>
          <div className="flex gap-2">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setForm({ ...form, status: s.value })}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  form.status === s.value
                    ? s.value === "active"
                      ? "bg-green-500/15 text-green-400 border border-green-500/30"
                      : s.value === "paused"
                        ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30"
                        : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                    : "bg-background border border-border text-muted hover:text-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="flex-1 bg-accent hover:bg-accent/90 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          {initial?.id ? "Update Goal" : "Create Goal"}
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
