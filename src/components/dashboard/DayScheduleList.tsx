"use client";

import { formatTime } from "@/lib/utils";
import { useState, useEffect } from "react";

interface ScheduleItem {
  start: string;
  end: string;
  activity: string;
  type: string;
  taskId?: string;
}

interface Block {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  category: string;
  color: string;
}

const TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  block: { bg: "#64748b15", text: "#94a3b8", label: "Block" },
  goal_task: { bg: "#8b5cf615", text: "#a78bfa", label: "Goal" },
  to_do: { bg: "#3b82f615", text: "#60a5fa", label: "To-Do" },
  event: { bg: "#ec489915", text: "#f472b6", label: "Event" },
  calendar: { bg: "#06b6d415", text: "#22d3ee", label: "Cal" },
  buffer: { bg: "transparent", text: "#64748b", label: "" },
  suggested: { bg: "#22c55e15", text: "#4ade80", label: "Idea" },
};

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

interface DayScheduleListProps {
  schedule: ScheduleItem[] | null;
  blocks: Block[];
}

export function DayScheduleList({ schedule, blocks }: DayScheduleListProps) {
  const [currentMinutes, setCurrentMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentMinutes(now.getHours() * 60 + now.getMinutes());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Build the list: use optimized schedule if available, otherwise daily blocks
  let items: { start: string; end: string; name: string; type: string; color?: string }[];

  if (schedule && schedule.length > 0) {
    items = schedule
      .filter((e) => e.type !== "buffer")
      .map((e) => ({
        start: e.start,
        end: e.end,
        name: e.activity,
        type: e.type,
      }));
  } else {
    items = blocks.map((b) => ({
      start: b.startTime,
      end: b.endTime,
      name: b.name,
      type: "block",
      color: b.color,
    }));
  }

  // Sort by start time
  items.sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <h2 className="text-sm font-medium text-muted uppercase tracking-wider mb-3">
        {schedule ? "Day Plan" : "Daily Blocks"}
      </h2>
      {items.length === 0 ? (
        <p className="text-xs text-muted/60 text-center py-2">
          No schedule for this day
        </p>
      ) : (
        <div className="space-y-0.5">
          {items.map((item, i) => {
            const style = TYPE_STYLES[item.type] ?? TYPE_STYLES.block;
            const startMins = timeToMinutes(item.start);
            const endMins = timeToMinutes(item.end);
            const isPast = endMins <= currentMinutes;
            const isActive =
              currentMinutes >= startMins && currentMinutes < endMins;

            return (
              <div
                key={i}
                className={`flex items-center gap-2 py-1.5 px-2 rounded-md text-xs transition-colors ${
                  isPast ? "opacity-40" : ""
                }`}
                style={{
                  backgroundColor: isActive ? style.bg : "transparent",
                  borderLeft: isActive
                    ? `2px solid ${item.color ?? style.text}`
                    : "2px solid transparent",
                }}
              >
                <span className="font-mono text-muted w-10 shrink-0">
                  {formatTime(item.start).replace(/ (AM|PM)/, "")}
                </span>
                <span
                  className={`flex-1 truncate ${
                    isActive ? "text-foreground font-medium" : "text-foreground/80"
                  }`}
                >
                  {item.name}
                </span>
                {style.label && (
                  <span
                    className="text-[9px] font-bold px-1 py-0.5 rounded shrink-0"
                    style={{ color: style.text, backgroundColor: style.bg }}
                  >
                    {style.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
