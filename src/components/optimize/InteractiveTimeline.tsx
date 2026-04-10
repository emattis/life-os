"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { formatTime } from "@/lib/utils";
import type { ScheduleEntry } from "@/types";

const SNAP_MINUTES = 15;
const START_OF_DAY = 6 * 60;
const END_OF_DAY = 23 * 60;
const TOTAL_MINUTES = END_OF_DAY - START_OF_DAY;
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);
const PX_PER_HOUR = 60;
const TIMELINE_HEIGHT = HOURS.length * PX_PER_HOUR;
const LEFT_GUTTER = 56; // px for time labels

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  block: { bg: "#64748b28", border: "#64748b", text: "#94a3b8" },
  goal_task: { bg: "#8b5cf628", border: "#8b5cf6", text: "#a78bfa" },
  to_do: { bg: "#3b82f628", border: "#3b82f6", text: "#60a5fa" },
  event: { bg: "#ec489928", border: "#ec4899", text: "#f472b6" },
  calendar: { bg: "#06b6d428", border: "#06b6d4", text: "#22d3ee" },
  buffer: { bg: "#47556915", border: "#475569", text: "#64748b" },
  suggested: { bg: "#22c55e28", border: "#22c55e", text: "#4ade80" },
};

const LOCKED_TYPES = new Set(["block", "calendar", "event"]);

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function snapToGrid(mins: number): number {
  return Math.round(mins / SNAP_MINUTES) * SNAP_MINUTES;
}

function minutesToPx(mins: number): number {
  return ((mins - START_OF_DAY) / TOTAL_MINUTES) * TIMELINE_HEIGHT;
}

/** Compute column layout for overlapping entries */
function computeColumns(
  entries: ScheduleEntry[]
): { col: number; totalCols: number }[] {
  const layout = entries.map(() => ({ col: 0, totalCols: 1 }));
  const visibleIndices = entries
    .map((e, i) => (e.type === "buffer" ? -1 : i))
    .filter((i) => i >= 0);

  // Sort by start time for overlap grouping
  const sorted = [...visibleIndices].sort((a, b) => {
    const aStart = timeToMinutes(entries[a].start);
    const bStart = timeToMinutes(entries[b].start);
    return aStart - bStart || a - b;
  });

  // Assign columns using a greedy interval coloring algorithm
  const endTimes: number[] = []; // end time per column

  for (const idx of sorted) {
    const start = timeToMinutes(entries[idx].start);
    // Find the first column where this entry doesn't overlap
    let col = -1;
    for (let c = 0; c < endTimes.length; c++) {
      if (endTimes[c] <= start) {
        col = c;
        break;
      }
    }
    if (col === -1) {
      col = endTimes.length;
      endTimes.push(0);
    }
    endTimes[col] = timeToMinutes(entries[idx].end);
    layout[idx].col = col;
  }

  const maxCols = endTimes.length || 1;

  // For each entry, compute the actual column count among its overlapping group
  for (const idx of visibleIndices) {
    const start = timeToMinutes(entries[idx].start);
    const end = timeToMinutes(entries[idx].end);
    let groupCols = 1;
    for (const other of visibleIndices) {
      if (other === idx) continue;
      const oStart = timeToMinutes(entries[other].start);
      const oEnd = timeToMinutes(entries[other].end);
      if (oStart < end && start < oEnd) {
        groupCols = Math.max(groupCols, layout[other].col + 1, layout[idx].col + 1);
      }
    }
    layout[idx].totalCols = Math.max(groupCols, layout[idx].col + 1);
  }

  return layout;
}

function checkOverlaps(entries: ScheduleEntry[]): Set<number> {
  const overlaps = new Set<number>();
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].type === "buffer") continue;
    for (let j = i + 1; j < entries.length; j++) {
      if (entries[j].type === "buffer") continue;
      const aStart = timeToMinutes(entries[i].start);
      const aEnd = timeToMinutes(entries[i].end);
      const bStart = timeToMinutes(entries[j].start);
      const bEnd = timeToMinutes(entries[j].end);
      if (aStart < bEnd && bStart < aEnd) {
        overlaps.add(i);
        overlaps.add(j);
      }
    }
  }
  return overlaps;
}

interface InteractiveTimelineProps {
  entries: ScheduleEntry[];
  onChange: (entries: ScheduleEntry[]) => void;
}

export function InteractiveTimeline({ entries, onChange }: InteractiveTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    index: number;
    mode: "move" | "resize";
    startY: number;
    origStart: number;
    origEnd: number;
  } | null>(null);

  const overlaps = useMemo(() => checkOverlaps(entries), [entries]);
  const columns = useMemo(() => computeColumns(entries), [entries]);

  const nonBufferEntries = entries.filter((e) => e.type !== "buffer");
  const taskEntries = entries.filter((e) =>
    ["goal_task", "to_do", "suggested"].includes(e.type)
  );
  const totalScheduledMins = nonBufferEntries.reduce(
    (sum, e) => sum + (timeToMinutes(e.end) - timeToMinutes(e.start)),
    0
  );
  const freeMins = Math.max(0, TOTAL_MINUTES - totalScheduledMins);

  const handleDelete = useCallback(
    (index: number) => {
      onChange(entries.filter((_, i) => i !== index));
    },
    [entries, onChange]
  );

  const handlePointerDown = useCallback(
    (index: number, mode: "move" | "resize", e: React.PointerEvent) => {
      if (LOCKED_TYPES.has(entries[index].type)) return;
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDragState({
        index,
        mode,
        startY: e.clientY,
        origStart: timeToMinutes(entries[index].start),
        origEnd: timeToMinutes(entries[index].end),
      });
    },
    [entries]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState) return;
      const deltaY = e.clientY - dragState.startY;
      const deltaMins = (deltaY / TIMELINE_HEIGHT) * TOTAL_MINUTES;

      const next = [...entries];
      const entry = { ...next[dragState.index] };

      if (dragState.mode === "move") {
        const duration = dragState.origEnd - dragState.origStart;
        let newStart = snapToGrid(dragState.origStart + deltaMins);
        newStart = Math.max(START_OF_DAY, Math.min(END_OF_DAY - duration, newStart));
        entry.start = minutesToTime(newStart);
        entry.end = minutesToTime(newStart + duration);
      } else {
        let newEnd = snapToGrid(dragState.origEnd + deltaMins);
        newEnd = Math.max(
          dragState.origStart + SNAP_MINUTES,
          Math.min(END_OF_DAY, newEnd)
        );
        entry.end = minutesToTime(newEnd);
      }

      next[dragState.index] = entry;
      onChange(next);
    },
    [dragState, entries, onChange]
  );

  const handlePointerUp = useCallback(() => {
    setDragState(null);
  }, []);

  return (
    <div>
      {/* Summary bar */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        <div className="bg-background rounded-lg border border-border px-3 py-2">
          <span className="text-muted">Scheduled: </span>
          <span className="font-mono text-foreground">
            {Math.floor(totalScheduledMins / 60)}h {totalScheduledMins % 60}m
          </span>
        </div>
        <div className="bg-background rounded-lg border border-border px-3 py-2">
          <span className="text-muted">Free: </span>
          <span className="font-mono text-foreground">
            {Math.floor(freeMins / 60)}h {freeMins % 60}m
          </span>
        </div>
        <div className="bg-background rounded-lg border border-border px-3 py-2">
          <span className="text-muted">Tasks: </span>
          <span className="font-mono text-foreground">{taskEntries.length}</span>
        </div>
        {overlaps.size > 0 && (
          <div className="bg-red-400/10 rounded-lg border border-red-400/20 px-3 py-2 text-red-400">
            Overlapping items
          </div>
        )}
      </div>

      <p className="text-[10px] text-muted mb-3">
        Drag to move, drag bottom edge to resize, hover for delete. Locked items
        cannot be moved.
      </p>

      {/* Timeline */}
      <div
        ref={containerRef}
        className="relative select-none"
        style={{ height: `${TIMELINE_HEIGHT}px` }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Hour grid lines */}
        {HOURS.map((hour) => {
          const top = minutesToPx(hour * 60);
          return (
            <div
              key={hour}
              className="absolute left-0 right-0 flex items-center"
              style={{ top: `${top}px` }}
            >
              <span className="text-[10px] font-mono text-muted w-12 shrink-0 -mt-2">
                {formatTime(`${hour.toString().padStart(2, "0")}:00`)}
              </span>
              <div className="flex-1 border-t border-border/40" />
            </div>
          );
        })}

        {/* Entry blocks with column layout */}
        {entries.map((entry, i) => {
          if (entry.type === "buffer") return null;

          const startMins = timeToMinutes(entry.start);
          const endMins = timeToMinutes(entry.end);
          const top = minutesToPx(startMins);
          const height = minutesToPx(endMins) - top;
          const colors = TYPE_COLORS[entry.type] ?? TYPE_COLORS.buffer;
          const isLocked = LOCKED_TYPES.has(entry.type);
          const hasOverlap = overlaps.has(i);
          const isDragging = dragState?.index === i;
          const { col, totalCols } = columns[i];

          return (
            <TimelineBlock
              key={i}
              index={i}
              entry={entry}
              top={top}
              height={height}
              col={col}
              totalCols={totalCols}
              colors={colors}
              isLocked={isLocked}
              hasOverlap={hasOverlap}
              isDragging={isDragging}
              onPointerDown={handlePointerDown}
              onDelete={handleDelete}
            />
          );
        })}
      </div>
    </div>
  );
}

function TimelineBlock({
  index,
  entry,
  top,
  height,
  col,
  totalCols,
  colors,
  isLocked,
  hasOverlap,
  isDragging,
  onPointerDown,
  onDelete,
}: {
  index: number;
  entry: ScheduleEntry;
  top: number;
  height: number;
  col: number;
  totalCols: number;
  colors: { bg: string; border: string; text: string };
  isLocked: boolean;
  hasOverlap: boolean;
  isDragging: boolean;
  onPointerDown: (i: number, mode: "move" | "resize", e: React.PointerEvent) => void;
  onDelete: (i: number) => void;
}) {
  const isSuggested = entry.type === "suggested";

  // Compute horizontal position based on column assignment
  const availableWidth = `calc(100% - ${LEFT_GUTTER + 8}px)`; // 8px right margin
  const colWidth = `calc(${availableWidth} / ${totalCols})`;
  const colLeft = `calc(${LEFT_GUTTER}px + ${availableWidth} * ${col} / ${totalCols})`;

  return (
    <div
      className={`absolute rounded-lg overflow-hidden group transition-shadow ${
        isDragging ? "z-20 shadow-lg" : "z-10"
      } ${hasOverlap ? "ring-2 ring-red-400/60" : ""}`}
      style={{
        top: `${top}px`,
        height: `${Math.max(height, 20)}px`,
        left: colLeft,
        width: colWidth,
        backgroundColor: colors.bg,
        borderLeft: `3px ${isSuggested ? "dashed" : "solid"} ${colors.border}`,
        cursor: isLocked ? "default" : "grab",
        opacity: isDragging ? 0.85 : 1,
      }}
      onPointerDown={(e) => !isLocked && onPointerDown(index, "move", e)}
      title={`${entry.activity}\n${formatTime(entry.start)} – ${formatTime(entry.end)}`}
    >
      {/* Content */}
      <div className="px-2 py-1 h-full flex flex-col justify-center min-h-0 overflow-hidden">
        <div className="flex items-center gap-1">
          {isLocked && (
            <span className="text-[9px] shrink-0 opacity-50">🔒</span>
          )}
          <span
            className="text-xs font-medium truncate"
            style={{ color: colors.text }}
          >
            {entry.activity}
          </span>
        </div>
        {height >= 30 && (
          <span className="text-[10px] font-mono text-muted/70 truncate">
            {formatTime(entry.start)} – {formatTime(entry.end)}
          </span>
        )}
      </div>

      {/* Delete button */}
      {!isLocked && (
        <button
          className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-500/80 text-white text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-30"
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(index);
          }}
          title="Remove from schedule"
        >
          ✕
        </button>
      )}

      {/* Resize handle */}
      {!isLocked && (
        <div
          className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 transition-opacity z-30"
          style={{ backgroundColor: colors.border + "40" }}
          onPointerDown={(e) => onPointerDown(index, "resize", e)}
        >
          <div className="mx-auto mt-0.5 w-5 h-0.5 rounded-full bg-foreground/30" />
        </div>
      )}
    </div>
  );
}
