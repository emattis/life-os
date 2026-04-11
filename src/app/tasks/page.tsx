"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { TaskForm, type TaskFormData } from "@/components/tasks/TaskForm";
import { TaskCard } from "@/components/tasks/TaskCard";
import { useToast } from "@/components/layout/Toast";

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

interface GoalOption {
  id: string;
  title: string;
  category: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const TYPE_FILTERS = [
  { value: "", label: "All Types" },
  { value: "to_do", label: "To-Do" },
  { value: "goal_task", label: "Goal Tasks" },
  { value: "event", label: "Events" },
];

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "deferred", label: "Deferred" },
];

const PRIORITY_FILTERS = [
  { value: "", label: "Any Priority" },
  { value: "1", label: "Urgent" },
  { value: "2", label: "High" },
  { value: "3", label: "Medium" },
  { value: "4", label: "Low" },
];

export default function TasksPage() {
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [goalFilter, setGoalFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TaskFormData | undefined>();
  const { toast } = useToast();

  const params = new URLSearchParams();
  if (typeFilter) params.set("type", typeFilter);
  if (statusFilter) params.set("status", statusFilter);
  if (priorityFilter) params.set("priority", priorityFilter);
  if (goalFilter) params.set("goalId", goalFilter);
  const queryStr = params.toString();
  const url = `/api/tasks${queryStr ? `?${queryStr}` : ""}`;

  const { data: tasks, mutate } = useSWR<Task[]>(url, fetcher);
  const { data: goals } = useSWR<GoalOption[]>(
    "/api/goals?status=active",
    fetcher
  );

  const handleSubmit = useCallback(
    async (data: TaskFormData) => {
      try {
        const payload = {
          ...data,
          goalId: data.goalId || null,
          recurring: data.recurring || null,
          tags: data.tags || null,
          dueDate: data.dueDate || null,
          scheduledDate: data.scheduledDate || null,
          description: data.description || null,
        };

        if (data.id) {
          await fetch("/api/tasks", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          toast("Task updated");
        } else {
          await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          toast("Task created");
        }
        setShowForm(false);
        setEditing(undefined);
        mutate();
      } catch {
        toast("Failed to save task", "error");
      }
    },
    [mutate, toast]
  );

  const handleEdit = useCallback((task: Task) => {
    setEditing({
      id: task.id,
      title: task.title,
      description: task.description ?? "",
      type: task.type,
      priority: task.priority,
      estimatedMins: task.estimatedMins,
      dueDate: task.dueDate
        ? new Date(task.dueDate).toISOString().split("T")[0]
        : "",
      scheduledDate: task.scheduledDate
        ? new Date(task.scheduledDate).toISOString().slice(0, 16)
        : "",
      goalId: task.goalId ?? "",
      recurring: task.recurring ?? "",
      energyLevel: task.energyLevel,
      tags: task.tags ?? "",
    });
    setShowForm(true);
  }, []);

  const handleStatusChange = useCallback(
    async (id: string, status: string) => {
      try {
        await fetch("/api/tasks", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status }),
        });
        if (status === "completed") toast("Task completed!");
        mutate();
      } catch {
        toast("Failed to update task", "error");
      }
    },
    [mutate, toast]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/tasks?id=${id}`, { method: "DELETE" });
        toast("Task deleted");
        mutate();
      } catch {
        toast("Failed to delete task", "error");
      }
    },
    [mutate, toast]
  );

  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditing(undefined);
  }, []);

  const pending = tasks?.filter((t) => t.status === "pending").length ?? 0;
  const inProgress =
    tasks?.filter((t) => t.status === "in_progress").length ?? 0;
  const overdue =
    tasks?.filter(
      (t) =>
        t.dueDate &&
        t.status !== "completed" &&
        new Date(t.dueDate) < new Date()
    ).length ?? 0;

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-muted text-sm mt-1">
            {pending} pending
            {inProgress > 0 && <span> &middot; {inProgress} in progress</span>}
            {overdue > 0 && (
              <span className="text-red-400">
                {" "}
                &middot; {overdue} overdue
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
            + New Task
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-card rounded-xl border border-border p-6 mb-6 animate-fade-in-up">
          <h2 className="text-lg font-semibold mb-4">
            {editing?.id ? "Edit Task" : "New Task"}
          </h2>
          <TaskForm
            initial={editing}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex gap-1 bg-card rounded-lg border border-border p-1 overflow-x-auto">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
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
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
        >
          {TYPE_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
        >
          {PRIORITY_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        {goals && goals.length > 0 && (
          <select
            value={goalFilter}
            onChange={(e) => setGoalFilter(e.target.value)}
            className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            <option value="">All Goals</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        )}

        {(typeFilter || statusFilter || priorityFilter || goalFilter) && (
          <button
            onClick={() => {
              setTypeFilter("");
              setStatusFilter("");
              setPriorityFilter("");
              setGoalFilter("");
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted hover:text-foreground transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {!tasks ? (
        <LoadingSkeleton />
      ) : tasks.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center animate-fade-in">
          <div className="text-3xl mb-3">☑</div>
          <p className="text-foreground font-medium mb-1">No tasks found</p>
          <p className="text-muted/60 text-xs">
            {typeFilter || statusFilter || priorityFilter || goalFilter
              ? "Try adjusting your filters"
              : "Create your first task to get started"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={handleEdit}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {statusFilter === "completed" && (
        <p className="text-[11px] text-muted/50 text-center mt-4">
          Completed tasks are automatically removed after 30 days.
        </p>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="bg-card rounded-xl border border-border p-4 animate-pulse-subtle"
        >
          <div className="flex gap-2 mb-3">
            <div className="h-3 bg-border/50 rounded w-16" />
            <div className="h-3 bg-border/50 rounded w-12" />
          </div>
          <div className="h-4 bg-border/50 rounded w-2/3 mb-2" />
          <div className="h-3 bg-border/30 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}
