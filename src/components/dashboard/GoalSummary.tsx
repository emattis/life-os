"use client";

import Link from "next/link";

const CATEGORY_CONFIG: Record<string, { icon: string; color: string }> = {
  health: { icon: "💪", color: "#22c55e" },
  career: { icon: "💼", color: "#3b82f6" },
  personal: { icon: "🌱", color: "#8b5cf6" },
  financial: { icon: "💰", color: "#eab308" },
  relationships: { icon: "🤝", color: "#ec4899" },
  creative: { icon: "🎨", color: "#f97316" },
};

interface GoalProgress {
  id: string;
  title: string;
  category: string;
  priority: number;
  totalTasks: number;
  completedTasks: number;
  progress: number;
}

interface GoalSummaryProps {
  goals: GoalProgress[];
}

export function GoalSummary({ goals }: GoalSummaryProps) {
  if (goals.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="text-sm font-medium text-muted uppercase tracking-wider mb-3">
          Goals
        </h2>
        <p className="text-xs text-muted/60 text-center py-3">
          No active goals.{" "}
          <Link href="/goals" className="text-accent hover:underline">
            Create one
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-muted uppercase tracking-wider">
          Goal Progress
        </h2>
        <Link
          href="/goals"
          className="text-xs text-accent hover:underline"
        >
          View all
        </Link>
      </div>
      <div className="space-y-3">
        {goals.slice(0, 5).map((goal) => {
          const cat = CATEGORY_CONFIG[goal.category] ?? {
            icon: "🎯",
            color: "#6366f1",
          };
          return (
            <div key={goal.id}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs">{cat.icon}</span>
                  <span className="text-sm text-foreground truncate">
                    {goal.title}
                  </span>
                </div>
                <span className="text-xs font-mono text-muted ml-2 shrink-0">
                  {goal.completedTasks}/{goal.totalTasks}
                </span>
              </div>
              <div className="h-1.5 bg-background rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${goal.progress}%`,
                    backgroundColor: cat.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
