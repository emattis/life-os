"use client";

import { useState, useEffect } from "react";
import { formatTime } from "@/lib/utils";

interface ScheduleItem {
  start: string;
  end: string;
  activity: string;
  type: string;
  taskId?: string;
}

const TYPE_COLORS: Record<string, string> = {
  block: "#64748b",
  goal_task: "#8b5cf6",
  to_do: "#3b82f6",
  event: "#ec4899",
  calendar: "#06b6d4",
  suggested: "#22c55e",
};

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

interface FocusCardProps {
  schedule: ScheduleItem[];
  onStartPomodoro: (item: ScheduleItem) => void;
}

export function FocusCard({ schedule, onStartPomodoro }: FocusCardProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Find the current active item (non-buffer)
  const activeItem = schedule.find((item) => {
    if (item.type === "buffer") return false;
    const start = timeToMinutes(item.start);
    const end = timeToMinutes(item.end);
    return currentMinutes >= start && currentMinutes < end;
  });

  // Time remaining in current block
  const minutesLeft = activeItem
    ? timeToMinutes(activeItem.end) - currentMinutes
    : 0;

  const color = activeItem
    ? TYPE_COLORS[activeItem.type] ?? "#6366f1"
    : "#6366f1";

  const canPomodoro = activeItem && ["goal_task", "to_do", "suggested"].includes(activeItem.type);

  if (!activeItem) {
    // Find next item
    const nextItem = schedule.find((item) => {
      if (item.type === "buffer") return false;
      return timeToMinutes(item.start) > currentMinutes;
    });

    return (
      <div className="bg-card rounded-xl border border-border p-6 animate-fade-in-up">
        <h2 className="text-sm font-medium text-muted uppercase tracking-wider mb-3">
          Focus
        </h2>
        {nextItem ? (
          <div>
            <p className="text-muted text-sm mb-1">No active task right now</p>
            <p className="text-foreground text-sm">
              Next up:{" "}
              <span className="font-medium">{nextItem.activity}</span> at{" "}
              <span className="font-mono">{formatTime(nextItem.start)}</span>
            </p>
          </div>
        ) : schedule.length > 0 ? (
          <p className="text-muted text-sm">All done for today!</p>
        ) : (
          <p className="text-muted text-sm">
            No optimized schedule yet. Click &quot;Optimize&quot; to plan your
            day.
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className="bg-card rounded-xl border-2 p-6 animate-fade-in-up"
      style={{ borderColor: color + "60" }}
    >
      <div className="flex items-start justify-between mb-2">
        <h2 className="text-sm font-medium text-muted uppercase tracking-wider">
          Now Focused On
        </h2>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded"
          style={{ color, backgroundColor: color + "20" }}
        >
          {activeItem.type === "goal_task"
            ? "Goal Task"
            : activeItem.type === "to_do"
              ? "To-Do"
              : activeItem.type === "event"
                ? "Event"
                : activeItem.type === "suggested"
                  ? "Suggested"
                  : activeItem.type === "calendar"
                    ? "Calendar"
                    : "Block"}
        </span>
      </div>

      <h3 className="text-xl font-bold text-foreground mb-1">
        {activeItem.activity}
      </h3>
      <p className="text-sm font-mono text-muted mb-4">
        {formatTime(activeItem.start)} – {formatTime(activeItem.end)}
        <span className="ml-2 text-foreground/70">
          {minutesLeft}min remaining
        </span>
      </p>

      {/* Progress bar */}
      <div className="h-1.5 bg-background rounded-full overflow-hidden mb-4">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${
              ((timeToMinutes(activeItem.end) -
                timeToMinutes(activeItem.start) -
                minutesLeft) /
                (timeToMinutes(activeItem.end) -
                  timeToMinutes(activeItem.start))) *
              100
            }%`,
            backgroundColor: color,
          }}
        />
      </div>

      {canPomodoro && (
        <button
          onClick={() => onStartPomodoro(activeItem)}
          className="bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Start Pomodoro
        </button>
      )}
    </div>
  );
}
