"use client";

import useSWR from "swr";

interface HabitData {
  taskId: string;
  title: string;
  recurring: string;
  streak: number;
  heatmap: { date: string; completed: boolean }[];
}

interface HabitsResponse {
  habits: HabitData[];
  weeklyScore: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function Streaks() {
  const { data } = useSWR<HabitsResponse>("/api/habits", fetcher);

  if (!data || data.habits.length === 0) {
    return null;
  }

  return (
    <div className="bg-card rounded-xl border border-border p-5 animate-fade-in-up">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-muted uppercase tracking-wider">
          Streaks
        </h2>
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            data.weeklyScore >= 80
              ? "bg-green-400/15 text-green-400"
              : data.weeklyScore >= 50
                ? "bg-yellow-400/15 text-yellow-400"
                : "bg-red-400/15 text-red-400"
          }`}
        >
          Weekly: {data.weeklyScore}%
        </span>
      </div>

      <div className="space-y-4">
        {data.habits.map((habit) => (
          <HabitRow key={habit.taskId} habit={habit} />
        ))}
      </div>
    </div>
  );
}

function HabitRow({ habit }: { habit: HabitData }) {
  const freqLabel =
    habit.recurring === "daily"
      ? "daily"
      : habit.recurring === "weekly"
        ? "weekly"
        : "monthly";

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm">
            {habit.streak > 0 ? "🔥" : "⚪"}
          </span>
          <span className="text-sm text-foreground truncate">
            {habit.title}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-muted">{freqLabel}</span>
          <span
            className={`text-xs font-bold font-mono ${
              habit.streak > 0 ? "text-orange-400" : "text-muted/40"
            }`}
          >
            {habit.streak > 0 ? `${habit.streak}d` : "0"}
          </span>
        </div>
      </div>

      {/* Heatmap: last 30 days */}
      <div className="flex gap-[2px]">
        {habit.heatmap.map((day) => (
          <div
            key={day.date}
            className="w-[7px] h-[7px] rounded-[1px]"
            style={{
              backgroundColor: day.completed
                ? "#22c55e"
                : "var(--border)",
            }}
            title={`${day.date}: ${day.completed ? "completed" : "missed"}`}
          />
        ))}
      </div>
    </div>
  );
}
