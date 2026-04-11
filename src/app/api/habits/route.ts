import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  // Get all recurring tasks (not completed/deferred permanently)
  const recurringTasks = await prisma.task.findMany({
    where: {
      recurring: { not: null },
    },
    select: {
      id: true,
      title: true,
      recurring: true,
      habitLogs: {
        orderBy: { date: "desc" },
        take: 30,
        select: { date: true, completed: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const today = new Date();
  const todayStr = fmtDate(today);

  // Calculate weekly habit score
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay()); // Sunday
  const weekStartStr = fmtDate(weekStart);

  let weekExpected = 0;
  let weekCompleted = 0;

  const habits = recurringTasks.map((task) => {
    const logDates = new Set(
      task.habitLogs.filter((l) => l.completed).map((l) => l.date)
    );

    // Build 30-day heatmap
    const heatmap: { date: string; completed: boolean }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = fmtDate(d);
      heatmap.push({ date: ds, completed: logDates.has(ds) });
    }

    // Calculate streak
    const streak = calculateStreak(task.recurring!, logDates, today);

    // Weekly score contribution
    const weeklyExpected = getWeeklyExpected(task.recurring!);
    weekExpected += weeklyExpected;
    const weekLogs = task.habitLogs.filter(
      (l) => l.completed && l.date >= weekStartStr && l.date <= todayStr
    );
    weekCompleted += Math.min(weekLogs.length, weeklyExpected);

    return {
      taskId: task.id,
      title: task.title,
      recurring: task.recurring,
      streak,
      heatmap,
    };
  });

  // Sort by longest streak first
  habits.sort((a, b) => b.streak - a.streak);

  const weeklyScore =
    weekExpected > 0 ? Math.round((weekCompleted / weekExpected) * 100) : 0;

  return NextResponse.json({ habits, weeklyScore });
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getWeeklyExpected(recurring: string): number {
  switch (recurring) {
    case "daily":
      return 7;
    case "weekly":
      return 1;
    case "monthly":
      return 0.25; // ~1 per month
    default:
      return 1;
  }
}

function calculateStreak(
  recurring: string,
  completedDates: Set<string>,
  today: Date
): number {
  if (recurring === "daily") {
    // Count consecutive days backwards from today/yesterday
    let streak = 0;
    let d = new Date(today);
    // Check today first; if not done yet, start from yesterday
    if (!completedDates.has(fmtDate(d))) {
      d.setDate(d.getDate() - 1);
    }
    while (completedDates.has(fmtDate(d))) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  if (recurring === "weekly") {
    // Count consecutive weeks where at least 1 completion exists
    let streak = 0;
    let weekEnd = new Date(today);
    // Find the start of the current week (Sunday)
    let weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - weekEnd.getDay());

    // Check current week
    let hasThisWeek = false;
    for (let i = 0; i <= 6; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      if (d > today) break;
      if (completedDates.has(fmtDate(d))) {
        hasThisWeek = true;
        break;
      }
    }
    if (!hasThisWeek) {
      // Start checking from last week
      weekStart.setDate(weekStart.getDate() - 7);
    }

    // Count consecutive weeks backwards
    for (let w = 0; w < 52; w++) {
      const ws = new Date(weekStart);
      ws.setDate(weekStart.getDate() - w * 7);
      let found = false;
      for (let i = 0; i < 7; i++) {
        const d = new Date(ws);
        d.setDate(ws.getDate() + i);
        if (completedDates.has(fmtDate(d))) {
          found = true;
          break;
        }
      }
      if (found) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  if (recurring === "monthly") {
    // Count consecutive months
    let streak = 0;
    let month = today.getMonth();
    let year = today.getFullYear();

    for (let i = 0; i < 12; i++) {
      const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
      const hasMonth = Array.from(completedDates).some((d) =>
        d.startsWith(prefix)
      );
      if (hasMonth) {
        streak++;
      } else if (i === 0) {
        // Current month might not have a completion yet — skip
        continue;
      } else {
        break;
      }
      month--;
      if (month < 0) {
        month = 11;
        year--;
      }
    }
    return streak;
  }

  return 0;
}
