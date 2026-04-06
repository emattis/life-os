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

interface TimelineViewProps {
  blocks: Block[];
  calendarEvents?: CalendarEvent[];
}

// Generate hour markers from 6am to 11pm
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function isoToMinutes(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

export function TimelineView({ blocks, calendarEvents = [] }: TimelineViewProps) {
  const startOfDay = 6 * 60; // 6am
  const endOfDay = 23 * 60; // 11pm
  const totalMinutes = endOfDay - startOfDay;

  const hasContent = blocks.length > 0 || calendarEvents.length > 0;

  // Filter out all-day events, keep timed ones
  const timedEvents = calendarEvents.filter((e) => !e.allDay);

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h2 className="text-sm font-medium text-muted uppercase tracking-wider mb-4">
        Today&apos;s Schedule
      </h2>
      {!hasContent ? (
        <p className="text-xs text-muted/60 py-4 text-center">
          No blocks or events scheduled for today
        </p>
      ) : (
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

          {/* Block bars */}
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
                className="absolute left-14 right-[50%] rounded-lg px-3 py-1.5 overflow-hidden"
                style={{
                  top: `${top}%`,
                  height: `${height}%`,
                  minHeight: "24px",
                  backgroundColor: block.color + "25",
                  borderLeft: `3px solid ${block.color}`,
                }}
              >
                <span
                  className="text-xs font-medium block truncate"
                  style={{ color: block.color }}
                >
                  {block.name}
                </span>
                <span className="text-[10px] font-mono text-muted">
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
                className="absolute right-0 rounded-lg px-3 py-1.5 overflow-hidden"
                style={{
                  top: `${top}%`,
                  height: `${height}%`,
                  minHeight: "24px",
                  left: "52%",
                  backgroundColor: "#3b82f520",
                  borderLeft: "3px solid #3b82f5",
                }}
              >
                <span className="text-xs font-medium block truncate text-blue-400">
                  {event.title}
                </span>
                <span className="text-[10px] font-mono text-muted">
                  {startTime} – {endTime}
                </span>
              </div>
            );
          })}

          {/* Current time indicator */}
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
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span className="text-xs text-blue-400">{event.title}</span>
                </div>
              ))}
          </div>
        </div>
      )}
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
