"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { GoalForm, type GoalFormData } from "@/components/goals/GoalForm";
import { GoalCard } from "@/components/goals/GoalCard";

interface GoalWithProgress {
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
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const CATEGORY_FILTERS = [
  { value: "", label: "All Categories" },
  { value: "health", label: "Health" },
  { value: "career", label: "Career" },
  { value: "personal", label: "Personal Growth" },
  { value: "financial", label: "Financial" },
  { value: "relationships", label: "Relationships" },
  { value: "creative", label: "Creative" },
];

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
];

export default function GoalsPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<GoalFormData | undefined>();

  const params = new URLSearchParams();
  if (statusFilter) params.set("status", statusFilter);
  if (categoryFilter) params.set("category", categoryFilter);
  const queryStr = params.toString();
  const url = `/api/goals${queryStr ? `?${queryStr}` : ""}`;

  const { data: goals, mutate } = useSWR<GoalWithProgress[]>(url, fetcher);

  const handleSubmit = useCallback(
    async (data: GoalFormData) => {
      if (data.id) {
        await fetch("/api/goals", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } else {
        await fetch("/api/goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      }
      setShowForm(false);
      setEditing(undefined);
      mutate();
    },
    [mutate]
  );

  const handleEdit = useCallback((goal: GoalWithProgress) => {
    setEditing({
      id: goal.id,
      title: goal.title,
      description: goal.description ?? "",
      category: goal.category,
      priority: goal.priority,
      targetDate: goal.targetDate
        ? new Date(goal.targetDate).toISOString().split("T")[0]
        : "",
      status: goal.status,
    });
    setShowForm(true);
  }, []);

  const handleArchive = useCallback(
    async (id: string, currentStatus: string) => {
      const newStatus = currentStatus === "paused" ? "active" : "paused";
      await fetch("/api/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      mutate();
    },
    [mutate]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await fetch(`/api/goals?id=${id}`, { method: "DELETE" });
      mutate();
    },
    [mutate]
  );

  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditing(undefined);
  }, []);

  // Summary stats
  const activeCount = goals?.filter((g) => g.status === "active").length ?? 0;
  const totalProgress =
    goals && goals.length > 0
      ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length)
      : 0;

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Goals</h1>
          <p className="text-muted text-sm mt-1">
            {activeCount} active goal{activeCount !== 1 ? "s" : ""}
            {goals && goals.length > 0 && (
              <span className="ml-2 font-mono">
                &middot; {totalProgress}% avg progress
              </span>
            )}
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => {
              setEditing(undefined);
              setShowForm(true);
            }}
            className="bg-accent hover:bg-accent/90 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            + New Goal
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-card rounded-xl border border-border p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">
            {editing?.id ? "Edit Goal" : "New Goal"}
          </h2>
          <GoalForm
            initial={editing}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="flex gap-1 bg-card rounded-lg border border-border p-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                statusFilter === f.value
                  ? "bg-accent/15 text-accent"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
        >
          {CATEGORY_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Goal Grid */}
      {!goals ? (
        <div className="text-muted text-sm">Loading goals...</div>
      ) : goals.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <p className="text-muted text-sm mb-1">No goals found</p>
          <p className="text-muted/60 text-xs">
            {statusFilter || categoryFilter
              ? "Try adjusting your filters"
              : "Create your first goal to start tracking progress"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={handleEdit}
              onArchive={handleArchive}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
