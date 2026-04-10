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

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  block: { bg: "#64748b20", text: "#94a3b8" },
  goal_task: { bg: "#8b5cf620", text: "#a78bfa" },
  to_do: { bg: "#3b82f620", text: "#60a5fa" },
  event: { bg: "#ec489920", text: "#f472b6" },
  calendar: { bg: "#06b6d420", text: "#22d3ee" },
  suggested: { bg: "#22c55e20", text: "#4ade80" },
};

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

interface UpNextProps {
  schedule: ScheduleItem[];
}

export function UpNext({ schedule }: UpNextProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Get next 3 non-buffer items that haven't started yet
  const upcoming = schedule
    .filter(
      (item) =>
        item.type !== "buffer" && timeToMinutes(item.start) > currentMinutes
    )
    .slice(0, 3);

  if (upcoming.length === 0) {
    return null;
  }

  return (
    <div className="bg-card rounded-xl border border-border p-5 animate-fade-in-up">
      <h2 className="text-sm font-medium text-muted uppercase tracking-wider mb-3">
        Up Next
      </h2>
      <div className="space-y-2">
        {upcoming.map((item, i) => {
          const colors = TYPE_COLORS[item.type] ?? TYPE_COLORS.block;
          const duration =
            timeToMinutes(item.end) - timeToMinutes(item.start);
          const startsIn = timeToMinutes(item.start) - currentMinutes;

          return (
            <div
              key={i}
              className="flex items-center gap-3 py-2 px-3 rounded-lg"
              style={{ backgroundColor: colors.bg }}
            >
              <div
                className="w-1 h-8 rounded-full shrink-0"
                style={{ backgroundColor: colors.text }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {item.activity}
                </p>
                <p className="text-[10px] font-mono text-muted">
                  {formatTime(item.start)} · {duration}min
                  {startsIn <= 60 && (
                    <span className="text-accent ml-1">
                      in {startsIn}min
                    </span>
                  )}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
