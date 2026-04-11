"use client";

import { useCallback, useState, useEffect } from "react";
import useSWR from "swr";
import Link from "next/link";
import { GoalSummary } from "@/components/dashboard/GoalSummary";
import { MiniCalendar } from "@/components/dashboard/MiniCalendar";
import { CalendarEvents } from "@/components/dashboard/CalendarEvents";
import { CommandBar } from "@/components/dashboard/CommandBar";
import { FocusCard } from "@/components/dashboard/FocusCard";
import { UpNext } from "@/components/dashboard/UpNext";
import { DayScheduleList } from "@/components/dashboard/DayScheduleList";
import { PomodoroTimer } from "@/components/dashboard/PomodoroTimer";
import { Streaks } from "@/components/dashboard/Streaks";
import { useToast } from "@/components/layout/Toast";
import { toLocalDateString, isSameDay } from "@/lib/utils";

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
  optimizedSchedule: ScheduleItem[] | null;
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

interface ScheduleItem {
  start: string;
  end: string;
  activity: string;
  type: string;
  taskId?: string;
}

interface CalendarEventItem {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <DashboardSkeleton />;
  }

  return <DashboardContent />;
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-full">
      <div className="flex-1 min-w-0">
        <div className="h-9 bg-border/30 rounded w-48 mb-2" />
        <div className="h-4 bg-border/20 rounded w-64 mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-4">
              <div className="h-3 bg-border/30 rounded w-20 mb-2" />
              <div className="h-8 bg-border/20 rounded w-8" />
            </div>
          ))}
        </div>
        <div className="bg-card rounded-xl border border-border p-6 h-40 mb-6" />
        <div className="bg-card rounded-xl border border-border p-5 h-24 mb-6" />
        <div className="bg-card rounded-xl border border-border p-4 h-12" />
      </div>
      <div className="w-full lg:w-80 shrink-0 space-y-4">
        <div className="bg-card rounded-xl border border-border p-4 h-[280px]" />
        <div className="bg-card rounded-xl border border-border p-4 h-64" />
        <div className="bg-card rounded-xl border border-border p-4 h-32" />
      </div>
    </div>
  );
}

function DashboardContent() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventItem[]>([]);
  const [pomodoroTask, setPomodoroTask] = useState<ScheduleItem | null>(null);
  const { toast } = useToast();

  const dateStr = toLocalDateString(selectedDate);
  const isToday = isSameDay(selectedDate, new Date());

  const { data, mutate } = useSWR<DashboardData>(
    `/api/dashboard?date=${dateStr}`,
    fetcher
  );

  const handleCalendarLoaded = useCallback(
    (events: CalendarEventItem[], _syncedAt: string) => {
      setCalendarEvents(events);
    },
    []
  );

  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    setCalendarEvents([]);
  }, []);

  const handleItemsCreated = useCallback(() => {
    mutate();
  }, [mutate]);

  const handleStartPomodoro = useCallback((item: ScheduleItem) => {
    setPomodoroTask(item);
  }, []);

  const handlePomodoroComplete = useCallback(() => {
    toast("Focus session complete!");
    setPomodoroTask(null);
  }, [toast]);

  const greeting = getGreeting();
  const dateLabel = isToday
    ? new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : selectedDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

  const stats = data?.stats;
  const isLoading = !data;
  const schedule = data?.optimizedSchedule ?? null;

  // Estimate pomodoro duration from schedule entry
  const pomodoroMins = pomodoroTask
    ? (() => {
        const [sh, sm] = pomodoroTask.start.split(":").map(Number);
        const [eh, em] = pomodoroTask.end.split(":").map(Number);
        return eh * 60 + em - (sh * 60 + sm);
      })()
    : 30;

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-full">
      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">
              {isToday ? greeting : "Schedule"}
            </h1>
            <p className="text-muted mt-1 font-mono text-sm">{dateLabel}</p>
          </div>
          <Link
            href={`/optimize?date=${dateStr}`}
            className="bg-accent hover:bg-accent/90 text-white px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 shrink-0"
          >
            <span>✦</span> Optimize {isToday ? "My Day" : "This Day"}
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
            label={isToday ? "Today's Blocks" : "Day's Blocks"}
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

        {/* Pomodoro Timer (when active) */}
        {pomodoroTask && (
          <div className="mb-6">
            <PomodoroTimer
              taskName={pomodoroTask.activity}
              estimatedMins={pomodoroMins}
              onComplete={handlePomodoroComplete}
              onClose={() => setPomodoroTask(null)}
            />
          </div>
        )}

        {/* Focus Card */}
        {!pomodoroTask && isToday && (
          <div className="mb-6">
            <FocusCard
              schedule={schedule ?? []}
              onStartPomodoro={handleStartPomodoro}
            />
          </div>
        )}

        {/* Up Next */}
        {isToday && schedule && (
          <div className="mb-6">
            <UpNext schedule={schedule} />
          </div>
        )}

        {/* Streaks */}
        {isToday && (
          <div className="mb-6">
            <Streaks />
          </div>
        )}

        {/* AI Command Bar */}
        <div className="mb-6">
          <CommandBar onItemsCreated={handleItemsCreated} />
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-80 shrink-0 space-y-4">
        <MiniCalendar
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
        />
        <DayScheduleList
          schedule={schedule}
          blocks={data?.todayBlocks ?? []}
        />
        <CalendarEvents
          selectedDate={selectedDate}
          onEventsLoaded={handleCalendarLoaded}
        />
        <GoalSummary goals={data?.goals ?? []} />
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
      className={`bg-card rounded-xl border border-border p-4 ${className ?? ""}`}
      style={alert ? { borderColor: "rgba(248, 113, 113, 0.3)" } : undefined}
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
