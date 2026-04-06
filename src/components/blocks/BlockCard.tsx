"use client";

import { formatTime } from "@/lib/utils";

interface Block {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  days: string;
  category: string;
  flexible: boolean;
  color: string;
}

const DAY_LABELS: Record<string, string> = {
  mon: "M",
  tue: "T",
  wed: "W",
  thu: "T",
  fri: "F",
  sat: "S",
  sun: "S",
};

const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const CATEGORY_ICONS: Record<string, string> = {
  sleep: "🌙",
  meal: "🍽",
  exercise: "💪",
  commute: "🚗",
  routine: "🔄",
  work: "💼",
};

interface BlockCardProps {
  block: Block;
  onEdit: (block: Block) => void;
  onDelete: (id: string) => void;
}

export function BlockCard({ block, onEdit, onDelete }: BlockCardProps) {
  const activeDays = new Set(block.days.split(","));

  return (
    <div className="bg-card rounded-xl border border-border p-4 group hover:border-border/80 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: block.color }}
          />
          <h3 className="font-medium text-foreground">{block.name}</h3>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(block)}
            className="p-1.5 rounded-md text-muted hover:text-foreground hover:bg-white/5 transition-colors text-xs"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(block.id)}
            className="p-1.5 rounded-md text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors text-xs"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="font-mono text-sm text-foreground">
          {formatTime(block.startTime)} — {formatTime(block.endTime)}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {DAY_ORDER.map((day) => (
            <span
              key={day}
              className={`w-6 h-6 flex items-center justify-center rounded text-[10px] font-medium ${
                activeDays.has(day)
                  ? "text-white"
                  : "bg-background text-muted/40"
              }`}
              style={
                activeDays.has(day)
                  ? { backgroundColor: block.color + "cc" }
                  : undefined
              }
            >
              {DAY_LABELS[day]}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs" title={block.category}>
            {CATEGORY_ICONS[block.category] ?? "����"}
          </span>
          {block.flexible && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent/15 text-accent">
              Flex
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
