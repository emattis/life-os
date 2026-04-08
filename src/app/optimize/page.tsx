"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { formatTime, toLocalDateString } from "@/lib/utils";
import { useToast } from "@/components/layout/Toast";
import { InteractiveTimeline } from "@/components/optimize/InteractiveTimeline";
import type { OptimizedSchedule, ScheduleEntry } from "@/types";

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  block: { bg: "#64748b20", border: "#64748b", text: "text-slate-400" },
  goal_task: { bg: "#8b5cf620", border: "#8b5cf6", text: "text-violet-400" },
  to_do: { bg: "#3b82f620", border: "#3b82f6", text: "text-blue-400" },
  event: { bg: "#ec489920", border: "#ec4899", text: "text-pink-400" },
  calendar: { bg: "#06b6d420", border: "#06b6d4", text: "text-cyan-400" },
  buffer: { bg: "#47556910", border: "#475569", text: "text-muted" },
  suggested: { bg: "#22c55e20", border: "#22c55e", text: "text-green-400" },
};

const TYPE_LABELS: Record<string, string> = {
  block: "Block",
  goal_task: "Goal Task",
  to_do: "To-Do",
  event: "Event",
  calendar: "Calendar",
  buffer: "Buffer",
  suggested: "Suggested",
};

export default function OptimizePage() {
  return (
    <Suspense fallback={<div className="text-muted text-sm">Loading...</div>}>
      <OptimizeContent />
    </Suspense>
  );
}

function OptimizeContent() {
  const searchParams = useSearchParams();
  const [selectedDate, setSelectedDate] = useState(() => {
    const dateParam = searchParams.get("date");
    return dateParam || toLocalDateString(new Date());
  });
  const [schedule, setSchedule] = useState<OptimizedSchedule | null>(null);
  const [editedEntries, setEditedEntries] = useState<ScheduleEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  const dateLabel = mounted
    ? new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const isToday = mounted && selectedDate === toLocalDateString(new Date());

  const handleOptimize = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAccepted(false);
    setSchedule(null);
    setEditedEntries(null);

    try {
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        toast("Optimization failed", "error");
      } else {
        setSchedule(data);
        setEditedEntries(data.schedule);
        toast("Schedule generated!");
      }
    } catch {
      setError("Failed to connect to the optimizer. Please try again.");
      toast("Connection failed", "error");
    } finally {
      setLoading(false);
    }
  }, [toast, selectedDate]);

  const handleAccept = useCallback(async () => {
    if (!schedule || !editedEntries) return;
    setAccepting(true);

    try {
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "accept",
          plan: JSON.stringify(editedEntries),
          reasoning: schedule.reasoning,
          date: selectedDate,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        toast("Failed to accept plan", "error");
      } else {
        setAccepted(true);
        toast("Plan accepted! Events synced to calendar");
      }
    } catch {
      setError("Failed to save the plan.");
      toast("Failed to save plan", "error");
    } finally {
      setAccepting(false);
    }
  }, [schedule, editedEntries, toast, selectedDate]);

  const handleDismiss = useCallback(() => {
    setSchedule(null);
    setEditedEntries(null);
    setAccepted(false);
    setError(null);
  }, []);

  const handleEntriesChange = useCallback((entries: ScheduleEntry[]) => {
    setEditedEntries(entries);
  }, []);

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Optimize My Day</h1>
          <p className="text-muted text-sm mt-1">
            AI-powered scheduling based on your goals, tasks, and routines
          </p>
        </div>
        {!loading && (
          <button
            onClick={handleOptimize}
            className="bg-accent hover:bg-accent/90 text-white px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 shrink-0"
          >
            <span>✦</span>
            {schedule ? "Regenerate" : "Optimize"}
          </button>
        )}
      </div>

      {/* Date picker */}
      <div className="bg-card rounded-xl border border-border p-4 mb-6 flex items-center gap-4">
        <label className="text-sm font-medium text-foreground shrink-0">
          Schedule for:
        </label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => {
            setSelectedDate(e.target.value);
            setSchedule(null);
            setEditedEntries(null);
            setAccepted(false);
            setError(null);
          }}
          min={toLocalDateString(new Date())}
          className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
        />
        <span className="text-sm text-muted">
          {dateLabel}
          {isToday && (
            <span className="ml-1 text-accent font-medium">(today)</span>
          )}
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-400/10 border border-red-400/20 rounded-xl p-4 mb-6">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <div className="inline-block mb-4">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-foreground font-medium">
            Analyzing {isToday ? "your day" : dateLabel}...
          </p>
          <p className="text-sm text-muted mt-1">
            Gathering tasks, goals, blocks, and calendar events
          </p>
        </div>
      )}

      {/* No schedule yet */}
      {!loading && !schedule && (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <div className="text-4xl mb-4">✦</div>
          <p className="text-foreground font-medium mb-1">
            Ready to optimize {isToday ? "your day" : dateLabel}
          </p>
          <p className="text-sm text-muted max-w-md mx-auto">
            The AI will analyze your pending tasks, active goals, daily blocks,
            and calendar events to create an optimized schedule.
          </p>
        </div>
      )}

      {/* Schedule result */}
      {schedule && !loading && (
        <div className="space-y-6 animate-fade-in-up">
          {/* Accepted banner */}
          {accepted && (
            <div className="bg-green-400/10 border border-green-400/20 rounded-xl p-4">
              <p className="text-sm text-green-400 font-medium">
                Plan accepted and saved! Task events have been pushed to your
                Google Calendar.
              </p>
            </div>
          )}

          {/* Action buttons */}
          {!accepted && (
            <div className="flex gap-3">
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="bg-green-500 hover:bg-green-500/90 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
              >
                {accepting ? "Saving..." : "Accept Plan"}
              </button>
              <button
                onClick={handleOptimize}
                className="px-5 py-2.5 rounded-lg font-medium text-muted hover:text-foreground border border-border hover:bg-white/5 transition-colors"
              >
                Regenerate
              </button>
              <button
                onClick={handleDismiss}
                className="px-5 py-2.5 rounded-lg font-medium text-muted hover:text-foreground transition-colors"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Interactive timeline (pre-accept) or static list (post-accept) */}
          <div className="bg-card rounded-xl border border-border p-5">
            <h2 className="text-sm font-medium text-muted uppercase tracking-wider mb-4">
              {accepted ? "Accepted Schedule" : "Proposed Schedule — Drag to Adjust"}
            </h2>

            {!accepted && editedEntries ? (
              <InteractiveTimeline
                entries={editedEntries}
                onChange={handleEntriesChange}
              />
            ) : (
              <div className="space-y-1">
                {(editedEntries ?? schedule.schedule).map((entry, i) => (
                  <ScheduleRow key={i} entry={entry} index={i} />
                ))}
              </div>
            )}
          </div>

          {/* Reasoning */}
          {schedule.reasoning && (
            <div className="bg-card rounded-xl border border-border p-5">
              <h2 className="text-sm font-medium text-muted uppercase tracking-wider mb-3">
                AI Reasoning
              </h2>
              <p className="text-sm text-foreground/80 leading-relaxed">
                {schedule.reasoning}
              </p>
            </div>
          )}

          {/* Deferred tasks */}
          {schedule.tasksDeferred && schedule.tasksDeferred.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-5">
              <h2 className="text-sm font-medium text-muted uppercase tracking-wider mb-3">
                Deferred to Another Day
              </h2>
              <p className="text-sm text-yellow-400">
                {schedule.tasksDeferred.length} task
                {schedule.tasksDeferred.length !== 1 ? "s" : ""} couldn&apos;t
                fit in the schedule.
              </p>
            </div>
          )}

          {/* Suggestions */}
          {schedule.suggestions && schedule.suggestions.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-5">
              <h2 className="text-sm font-medium text-muted uppercase tracking-wider mb-3">
                Productivity Tips
              </h2>
              <ul className="space-y-2">
                {schedule.suggestions.map((tip, i) => (
                  <li
                    key={i}
                    className="text-sm text-foreground/80 flex gap-2"
                  >
                    <span className="text-accent shrink-0">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScheduleRow({ entry, index }: { entry: ScheduleEntry; index: number }) {
  const config = TYPE_COLORS[entry.type] ?? TYPE_COLORS.buffer;
  const label = TYPE_LABELS[entry.type] ?? entry.type;
  const isBuffer = entry.type === "buffer";
  const isSuggested = entry.type === "suggested";

  if (isBuffer) {
    return (
      <div
        className="flex items-center gap-3 py-1 px-3 animate-schedule-row"
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <span className="font-mono text-[10px] text-muted/50 w-28 shrink-0">
          {formatTime(entry.start)}
        </span>
        <div className="flex-1 border-t border-dashed border-border" />
        <span className="text-[10px] text-muted/40 shrink-0">buffer</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3 py-2.5 px-3 rounded-lg animate-schedule-row"
      style={{
        backgroundColor: config.bg,
        animationDelay: `${index * 50}ms`,
        borderLeft: isSuggested ? "2px dashed #22c55e" : undefined,
      }}
    >
      <div className="font-mono text-xs text-muted w-28 shrink-0">
        {formatTime(entry.start)} – {formatTime(entry.end)}
      </div>
      <div
        className="w-1 h-8 rounded-full shrink-0"
        style={{
          backgroundColor: config.border,
          opacity: isSuggested ? 0.6 : 1,
        }}
      />
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate ${
            isSuggested ? "text-foreground/70 italic" : "text-foreground"
          }`}
        >
          {entry.activity}
        </p>
      </div>
      <span
        className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${config.text}`}
        style={{ backgroundColor: config.bg }}
      >
        {label}
      </span>
    </div>
  );
}
