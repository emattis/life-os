"use client";

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

interface TimelineViewProps {
  blocks: Block[];
}

// Generate hour markers from 6am to 11pm
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function TimelineView({ blocks }: TimelineViewProps) {
  const startOfDay = 6 * 60; // 6am
  const endOfDay = 23 * 60; // 11pm
  const totalMinutes = endOfDay - startOfDay;

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h2 className="text-sm font-medium text-muted uppercase tracking-wider mb-4">
        Today&apos;s Schedule
      </h2>
      {blocks.length === 0 ? (
        <p className="text-xs text-muted/60 py-4 text-center">
          No blocks scheduled for today
        </p>
      ) : (
        <div className="relative" style={{ height: `${HOURS.length * 40}px` }}>
          {/* Hour lines */}
          {HOURS.map((hour) => {
            const top =
              ((hour * 60 - startOfDay) / totalMinutes) * 100;
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

            const top =
              ((clampedStart - startOfDay) / totalMinutes) * 100;
            const height =
              ((clampedEnd - clampedStart) / totalMinutes) * 100;

            return (
              <div
                key={block.id}
                className="absolute left-14 right-0 rounded-lg px-3 py-1.5 overflow-hidden"
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

          {/* Current time indicator */}
          <CurrentTimeIndicator
            startOfDay={startOfDay}
            totalMinutes={totalMinutes}
          />
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
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  if (currentMinutes < startOfDay || currentMinutes > startOfDay + totalMinutes)
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
