"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { TimelineView } from "@/components/dashboard/TimelineView";
import { GoalSummary } from "@/components/dashboard/GoalSummary";
import { TasksByType } from "@/components/dashboard/TasksByType";
import { MiniCalendar } from "@/components/dashboard/MiniCalendar";
import { UpcomingEvents } from "@/components/dashboard/UpcomingEvents";
import { CalendarEvents } from "@/components/dashboard/CalendarEvents";
import { CommandBar } from "@/components/dashboard/CommandBar";
import { useToast } from "@/components/layout/Toast";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface DashboardData {
  todayBlocks: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    category: string;
    color: string;
    flexible: boolean;
  }[];
  goals: {
    id: string;
    title: string;
    category: string;
    priority: number;
    totalTasks: number;
    completedTasks: number;
    progress: number;
  }[];
  tasks: {
    goalTasks: TaskItem[];
    todos: TaskItem[];
    events: TaskItem[];
  };
  upcomingEvents: {
    id: string;
    title: string;
    scheduledDate: string | null;
    estimatedMins: number;
    status: string;
  }[];
  stats: {
    activeGoals: number;
    pendingTasks: number;
    todayBlocks: number;
    overdue: number;
  };
}

interface TaskItem {
  id: string;
  title: string;
  type: string;
  priority: number;
  status: string;
  estimatedMins: number;
  dueDate: string | null;
  goal: { id: string; title: string; category: string } | null;
  energyLevel: string;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

interface CalendarEventItem {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
}

export default function Dashboard() {
  const { data, mutate } = useSWR<DashboardData>("/api/dashboard", fetcher);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventItem[]>([]);
  const [, setCalendarSyncedAt] = useState<string>("");
  const { toast } = useToast();

  const handleCalendarLoaded = useCallback(
    (events: CalendarEventItem[], syncedAt: string) => {
      setCalendarEvents(events);
      setCalendarSyncedAt(syncedAt);
    },
    []
  );

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

  const handleItemsCreated = useCallback(() => {
    mutate();
  }, [mutate]);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const stats = data?.stats;
  const isLoading = !data;

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-full">
      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">{getGreeting()}</h1>
            <p className="text-muted mt-1 font-mono text-sm">{today}</p>
          </div>
          <Link
            href="/optimize"
            className="bg-accent hover:bg-accent/90 text-white px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 shrink-0"
          >
            <span>✦</span> Optimize My Day
          </Link>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Active Goals"
            value={stats?.activeGoals ?? 0}
            color="text-violet-400"
            loading={isLoading}
            className="animate-card-1"
          />
          <StatCard
            label="Pending Tasks"
            value={stats?.pendingTasks ?? 0}
            color="text-blue-400"
            loading={isLoading}
            className="animate-card-2"
          />
          <StatCard
            label="Today's Blocks"
            value={stats?.todayBlocks ?? 0}
            color="text-cyan-400"
            loading={isLoading}
            className="animate-card-3"
          />
          <StatCard
            label="Overdue"
            value={stats?.overdue ?? 0}
            color={stats?.overdue ? "text-red-400" : "text-muted"}
            alert={!!stats?.overdue}
            loading={isLoading}
            className="animate-card-4"
          />
        </div>

        {/* AI Command Bar */}
        <div className="mb-6">
          <CommandBar onItemsCreated={handleItemsCreated} />
        </div>

        {/* Timeline */}
        <div className="mb-6">
          <TimelineView
            blocks={data?.todayBlocks ?? []}
            calendarEvents={calendarEvents}
          />
        </div>

        {/* Tasks by type */}
        <TasksByType
          goalTasks={data?.tasks.goalTasks ?? []}
          todos={data?.tasks.todos ?? []}
          events={data?.tasks.events ?? []}
          onStatusChange={handleStatusChange}
        />
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-72 shrink-0 space-y-4">
        <MiniCalendar />
        <CalendarEvents onEventsLoaded={handleCalendarLoaded} />
        <GoalSummary goals={data?.goals ?? []} />
        <UpcomingEvents events={data?.upcomingEvents ?? []} />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  alert,
  loading,
  className,
}: {
  label: string;
  value: number;
  color: string;
  alert?: boolean;
  loading?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`bg-card rounded-xl border p-4 ${
        alert ? "border-red-400/30" : "border-border"
      } ${className ?? ""}`}
    >
      <p className="text-xs font-medium text-muted mb-1">{label}</p>
      {loading ? (
        <div className="h-8 bg-border/30 rounded w-8 animate-pulse-subtle" />
      ) : (
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
      )}
    </div>
  );
}
