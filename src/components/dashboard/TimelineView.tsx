"use client";

import { useState, useEffect } from "react";
import { formatTime } from "@/lib/utils";

interface Block {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  category: string;
  color: string;
  flexible: boolean;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
}

interface ScheduleEntry {
  start: string;
  end: string;
  activity: string;
  type: string;
  taskId?: string;
}

interface TimelineViewProps {
  blocks: Block[];
  calendarEvents?: CalendarEvent[];
  optimizedSchedule?: ScheduleEntry[] | null;
}

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function isoToMinutes(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

// Colors with good contrast in both light and dark mode
const SCHEDULE_TYPE_STYLES: Record<
  string,
  { bg: string; bgLight: string; border: string; text: string; textLight: string }
> = {
  block: {
    bg: "rgba(100,116,139,0.15)",
    bgLight: "rgba(100,116,139,0.1)",
    border: "#64748b",
    text: "#94a3b8",
    textLight: "#475569",
  },
  goal_task: {
    bg: "rgba(139,92,246,0.15)",
    bgLight: "rgba(139,92,246,0.1)",
    border: "#8b5cf6",
    text: "#a78bfa",
    textLight: "#7c3aed",
  },
  to_do: {
    bg: "rgba(59,130,246,0.15)",
    bgLight: "rgba(59,130,246,0.1)",
    border: "#3b82f6",
    text: "#60a5fa",
    textLight: "#2563eb",
  },
  event: {
    bg: "rgba(236,72,153,0.15)",
    bgLight: "rgba(236,72,153,0.1)",
    border: "#ec4899",
    text: "#f472b6",
    textLight: "#db2777",
  },
  calendar: {
    bg: "rgba(6,182,212,0.15)",
    bgLight: "rgba(6,182,212,0.1)",
    border: "#06b6d4",
    text: "#22d3ee",
    textLight: "#0891b2",
  },
  buffer: {
    bg: "transparent",
    bgLight: "transparent",
    border: "#475569",
    text: "#64748b",
    textLight: "#94a3b8",
  },
};

export function TimelineView({
  blocks,
  calendarEvents = [],
  optimizedSchedule,
}: TimelineViewProps) {
  const startOfDay = 6 * 60;
  const endOfDay = 23 * 60;
  const totalMinutes = endOfDay - startOfDay;

  const timedEvents = calendarEvents.filter((e) => !e.allDay);
  const hasOptimized = optimizedSchedule && optimizedSchedule.length > 0;
  const hasContent = blocks.length > 0 || timedEvents.length > 0 || hasOptimized;

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-muted uppercase tracking-wider">
          Schedule
        </h2>
        {hasOptimized && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent/15 text-accent">
            Optimized
          </span>
        )}
      </div>

      {!hasContent ? (
        <p className="text-xs text-muted/60 py-4 text-center">
          No blocks or events scheduled
        </p>
      ) : hasOptimized ? (
        /* ── Optimized schedule: list layout (no overlap) ── */
        <OptimizedTimeline entries={optimizedSchedule!} />
      ) : (
        /* ── Normal view: absolute-positioned blocks + calendar events ── */
        <div className="relative" style={{ height: `${HOURS.length * 40}px` }}>
          {/* Hour lines */}
          {HOURS.map((hour) => {
            const top = ((hour * 60 - startOfDay) / totalMinutes) * 100;
            return (
              <div
                key={hour}
                className="absolute left-0 right-0 flex items-center"
                style={{ top: `${top}%` }}
              >
                <span className="text-[10px] font-mono text-muted w-12 shrink-0 -mt-2">
                  {formatTime(`${hour.toString().padStart(2, "0")}:00`)}
                </span>
                <div className="flex-1 border-t border-border/50" />
              </div>
            );
          })}

          {/* Daily block bars */}
          {blocks.map((block) => {
            const start = timeToMinutes(block.startTime);
            const end = timeToMinutes(block.endTime);
            const clampedStart = Math.max(start, startOfDay);
            const clampedEnd = Math.min(end, endOfDay);
            if (clampedEnd <= clampedStart) return null;

            const top = ((clampedStart - startOfDay) / totalMinutes) * 100;
            const height = ((clampedEnd - clampedStart) / totalMinutes) * 100;

            return (
              <div
                key={`block-${block.id}`}
                className="absolute left-14 rounded-lg px-3 py-1.5 overflow-hidden"
                style={{
                  top: `${top}%`,
                  height: `${height}%`,
                  minHeight: "24px",
                  right: timedEvents.length > 0 ? "50%" : "8px",
                  backgroundColor:
                    block.color + (block.flexible ? "18" : "30"),
                  borderLeft: `3px solid ${block.color}`,
                  borderLeftStyle: block.flexible ? "dashed" : "solid",
                }}
              >
                <span
                  className="text-xs font-medium block truncate"
                  style={{
                    color: block.color,
                    opacity: block.flexible ? 0.7 : 1,
                  }}
                >
                  {block.name}
                  {block.flexible && (
                    <span className="text-[9px] ml-1 opacity-60">flex</span>
                  )}
                </span>
                <span
                  className="text-[10px] font-mono text-muted"
                  style={{ opacity: block.flexible ? 0.6 : 1 }}
                >
                  {formatTime(block.startTime)} – {formatTime(block.endTime)}
                </span>
              </div>
            );
          })}

          {/* Calendar event bars */}
          {timedEvents.map((event) => {
            const start = isoToMinutes(event.start);
            const end = isoToMinutes(event.end);
            const clampedStart = Math.max(start, startOfDay);
            const clampedEnd = Math.min(end, endOfDay);
            if (clampedEnd <= clampedStart) return null;

            const top = ((clampedStart - startOfDay) / totalMinutes) * 100;
            const height = ((clampedEnd - clampedStart) / totalMinutes) * 100;

            const startTime = new Date(event.start).toLocaleTimeString(
              "en-US",
              { hour: "numeric", minute: "2-digit" }
            );
            const endTime = new Date(event.end).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            });

            return (
              <div
                key={`cal-${event.id}`}
                className="absolute right-2 rounded-lg px-3 py-1.5 overflow-hidden"
                style={{
                  top: `${top}%`,
                  height: `${height}%`,
                  minHeight: "24px",
                  left: blocks.length > 0 ? "52%" : "56px",
                  backgroundColor: "rgba(59,130,246,0.12)",
                  borderLeft: "3px solid #3b82f6",
                }}
              >
                <span className="text-xs font-medium block truncate text-blue-500 dark:text-blue-400">
                  {event.title}
                </span>
                <span className="text-[10px] font-mono text-muted">
                  {startTime} – {endTime}
                </span>
              </div>
            );
          })}

          <CurrentTimeIndicator
            startOfDay={startOfDay}
            totalMinutes={totalMinutes}
          />
        </div>
      )}

      {/* All-day events */}
      {calendarEvents.filter((e) => e.allDay).length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-[10px] font-medium text-muted uppercase tracking-wider mb-2">
            All Day
          </p>
          <div className="space-y-1">
            {calendarEvents
              .filter((e) => e.allDay)
              .map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-2 py-1 px-2 rounded bg-blue-500/10"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400" />
                  <span className="text-xs text-blue-600 dark:text-blue-400">
                    {event.title}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Optimized schedule as a list (no absolute positioning, no overlap) ── */
function OptimizedTimeline({ entries }: { entries: ScheduleEntry[] }) {
  return (
    <div className="space-y-0.5">
      {entries.map((entry, i) => {
        const isBuffer = entry.type === "buffer";
        const style = SCHEDULE_TYPE_STYLES[entry.type] ?? SCHEDULE_TYPE_STYLES.buffer;

        if (isBuffer) {
          return (
            <div
              key={`opt-${i}`}
              className="flex items-center gap-3 py-1 px-3"
            >
              <span className="font-mono text-[10px] text-muted/50 w-28 shrink-0">
                {formatTime(entry.start)}
              </span>
              <div className="flex-1 border-t border-dashed border-border" />
              <span className="text-[10px] text-muted/40 shrink-0">buffer</span>
            </div>
          );
        }

        const duration = timeToMinutes(entry.end) - timeToMinutes(entry.start);

        return (
          <div
            key={`opt-${i}`}
            className="flex items-stretch gap-0 rounded-lg overflow-hidden animate-schedule-row"
            style={{ animationDelay: `${i * 30}ms` }}
          >
            {/* Time column */}
            <div className="w-28 shrink-0 py-2.5 px-3 flex flex-col justify-center">
              <span className="font-mono text-[11px] text-foreground/70">
                {formatTime(entry.start)}
              </span>
              <span className="font-mono text-[10px] text-muted">
                {formatTime(entry.end)}
              </span>
            </div>

            {/* Color bar */}
            <div
              className="w-1 shrink-0 rounded-full my-1"
              style={{ backgroundColor: style.border }}
            />

            {/* Content */}
            <div
              className="flex-1 py-2.5 px-3 rounded-r-lg"
              style={{ backgroundColor: style.bg }}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground truncate flex-1">
                  {entry.activity}
                </span>
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0"
                  style={{
                    color: style.text,
                    backgroundColor: style.bg,
                  }}
                >
                  {entry.type === "goal_task"
                    ? "Goal"
                    : entry.type === "to_do"
                      ? "To-Do"
                      : entry.type === "calendar"
                        ? "Cal"
                        : entry.type === "event"
                          ? "Event"
                          : "Block"}
                </span>
              </div>
              <span className="text-[10px] text-muted">
                {duration}min
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CurrentTimeIndicator({
  startOfDay,
  totalMinutes,
}: {
  startOfDay: number;
  totalMinutes: number;
}) {
  const [currentMinutes, setCurrentMinutes] = useState<number | null>(null);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentMinutes(now.getHours() * 60 + now.getMinutes());
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  if (
    currentMinutes === null ||
    currentMinutes < startOfDay ||
    currentMinutes > startOfDay + totalMinutes
  )
    return null;

  const top = ((currentMinutes - startOfDay) / totalMinutes) * 100;

  return (
    <div
      className="absolute left-12 right-0 flex items-center z-10 pointer-events-none"
      style={{ top: `${top}%` }}
    >
      <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
      <div className="flex-1 border-t-2 border-red-500/60" />
    </div>
  );
}
