"use client";

import { useState, useEffect } from "react";
import type { BlockCategory } from "@/types";

const CATEGORIES: { value: BlockCategory; label: string }[] = [
  { value: "sleep", label: "Sleep" },
  { value: "meal", label: "Meal" },
  { value: "exercise", label: "Exercise" },
  { value: "commute", label: "Commute" },
  { value: "routine", label: "Routine" },
  { value: "work", label: "Work" },
];

const DAYS = [
  { value: "mon", label: "Mon" },
  { value: "tue", label: "Tue" },
  { value: "wed", label: "Wed" },
  { value: "thu", label: "Thu" },
  { value: "fri", label: "Fri" },
  { value: "sat", label: "Sat" },
  { value: "sun", label: "Sun" },
];

const COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#64748b", // slate
];

export interface BlockFormData {
  id?: string;
  name: string;
  startTime: string;
  endTime: string;
  days: string;
  category: string;
  flexible: boolean;
  color: string;
}

interface BlockFormProps {
  initial?: BlockFormData;
  onSubmit: (data: BlockFormData) => void;
  onCancel: () => void;
}

const DEFAULT_FORM: BlockFormData = {
  name: "",
  startTime: "09:00",
  endTime: "10:00",
  days: "mon,tue,wed,thu,fri,sat,sun",
  category: "routine",
  flexible: false,
  color: "#6366f1",
};

export function BlockForm({ initial, onSubmit, onCancel }: BlockFormProps) {
  const [form, setForm] = useState<BlockFormData>(initial ?? DEFAULT_FORM);

  useEffect(() => {
    if (initial) setForm(initial);
  }, [initial]);

  const selectedDays = new Set(form.days.split(",").filter(Boolean));

  function toggleDay(day: string) {
    const next = new Set(selectedDays);
    if (next.has(day)) {
      next.delete(day);
    } else {
      next.add(day);
    }
    setForm({ ...form, days: Array.from(next).join(",") });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.startTime || !form.endTime || selectedDays.size === 0) return;
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Block Name
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g., Morning Workout"
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
          required
        />
      </div>

      {/* Time Range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Start Time
          </label>
          <input
            type="time"
            value={form.startTime}
            onChange={(e) => setForm({ ...form, startTime: e.target.value })}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 [color-scheme:dark]"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            End Time
          </label>
          <input
            type="time"
            value={form.endTime}
            onChange={(e) => setForm({ ...form, endTime: e.target.value })}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 [color-scheme:dark]"
            required
          />
        </div>
      </div>

      {/* Days of Week */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Days
        </label>
        <div className="flex gap-2">
          {DAYS.map((day) => (
            <button
              key={day.value}
              type="button"
              onClick={() => toggleDay(day.value)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                selectedDays.has(day.value)
                  ? "bg-accent text-white"
                  : "bg-background border border-border text-muted hover:text-foreground"
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Category
        </label>
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Color */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Color
        </label>
        <div className="flex gap-2">
          {COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setForm({ ...form, color })}
              className={`w-7 h-7 rounded-full transition-all ${
                form.color === color
                  ? "ring-2 ring-foreground ring-offset-2 ring-offset-card scale-110"
                  : "hover:scale-110"
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      {/* Flexible Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Flexible</p>
          <p className="text-xs text-muted">AI can reschedule this block</p>
        </div>
        <button
          type="button"
          onClick={() => setForm({ ...form, flexible: !form.flexible })}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            form.flexible ? "bg-accent" : "bg-border"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
              form.flexible ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="flex-1 bg-accent hover:bg-accent/90 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          {initial?.id ? "Update Block" : "Add Block"}
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
