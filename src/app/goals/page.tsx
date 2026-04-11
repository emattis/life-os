"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { GoalForm, type GoalFormData } from "@/components/goals/GoalForm";
import { GoalCard } from "@/components/goals/GoalCard";
import { GoalDetailPanel } from "@/components/goals/GoalDetailPanel";
import { useToast } from "@/components/layout/Toast";

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
  tasks: GoalTask[];
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
  const [selectedGoal, setSelectedGoal] = useState<GoalWithProgress | null>(null);
  const { toast } = useToast();

  const params = new URLSearchParams();
  if (statusFilter) params.set("status", statusFilter);
  if (categoryFilter) params.set("category", categoryFilter);
  const queryStr = params.toString();
  const url = `/api/goals${queryStr ? `?${queryStr}` : ""}`;

  const { data: goals, mutate } = useSWR<GoalWithProgress[]>(url, fetcher);

  const handleSubmit = useCallback(
    async (data: GoalFormData) => {
      try {
        if (data.id) {
          await fetch("/api/goals", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          toast("Goal updated");
        } else {
          await fetch("/api/goals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          toast("Goal created");
        }
        setShowForm(false);
        setEditing(undefined);
        mutate();
      } catch {
        toast("Failed to save goal", "error");
      }
    },
    [mutate, toast]
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
    setSelectedGoal(null);
  }, []);

  const handleArchive = useCallback(
    async (id: string, currentStatus: string) => {
      try {
        const newStatus = currentStatus === "paused" ? "active" : "paused";
        await fetch("/api/goals", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status: newStatus }),
        });
        toast(newStatus === "paused" ? "Goal paused" : "Goal resumed");
        mutate();
      } catch {
        toast("Failed to update goal", "error");
      }
    },
    [mutate, toast]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/goals?id=${id}`, { method: "DELETE" });
        toast("Goal deleted");
        mutate();
        setSelectedGoal(null);
      } catch {
        toast("Failed to delete goal", "error");
      }
    },
    [mutate, toast]
  );

  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditing(undefined);
  }, []);

  const handleGoalClick = useCallback((goal: GoalWithProgress) => {
    setSelectedGoal(goal);
  }, []);

  const handleDetailRefresh = useCallback(() => {
    mutate().then((data) => {
      // Update the selected goal with fresh data
      if (selectedGoal && data) {
        const updated = data.find((g: GoalWithProgress) => g.id === selectedGoal.id);
        if (updated) setSelectedGoal(updated);
      }
    });
  }, [mutate, selectedGoal]);

  const activeCount = goals?.filter((g) => g.status === "active").length ?? 0;
  const totalProgress =
    goals && goals.length > 0
      ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length)
      : 0;

  return (
    <div className="max-w-5xl">
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

      {showForm && (
        <div className="bg-card rounded-xl border border-border p-6 mb-8 animate-fade-in-up">
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

      <div className="flex flex-wrap gap-3 mb-6">
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

      {!goals ? (
        <LoadingSkeleton />
      ) : goals.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center animate-fade-in">
          <div className="text-3xl mb-3">◎</div>
          <p className="text-foreground font-medium mb-1">No goals found</p>
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
              onClick={handleGoalClick}
              onEdit={handleEdit}
              onArchive={handleArchive}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Detail panel */}
      {selectedGoal && (
        <GoalDetailPanel
          goal={selectedGoal}
          onClose={() => setSelectedGoal(null)}
          onRefresh={handleDetailRefresh}
        />
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-card rounded-xl border border-border p-5 animate-pulse-subtle"
        >
          <div className="h-3 bg-border/50 rounded w-1/4 mb-3" />
          <div className="h-4 bg-border/50 rounded w-2/3 mb-2" />
          <div className="h-3 bg-border/30 rounded w-full mb-4" />
          <div className="h-1.5 bg-border/30 rounded-full w-full" />
        </div>
      ))}
    </div>
  );
}
