import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getDayOfWeek } from "@/lib/utils";

export async function GET() {
  const now = new Date();
  const todayShort = getDayOfWeek(now);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const [allBlocks, goals, tasks, upcomingEvents] = await Promise.all([
    // Today's blocks (filtered client-side by day)
    prisma.dailyBlock.findMany({ orderBy: { startTime: "asc" } }),

    // Active goals with task counts
    prisma.goal.findMany({
      where: { status: "active" },
      include: {
        tasks: { select: { id: true, status: true } },
      },
      orderBy: { priority: "asc" },
    }),

    // Non-completed tasks
    prisma.task.findMany({
      where: { status: { not: "completed" } },
      include: {
        goal: { select: { id: true, title: true, category: true } },
      },
      orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
    }),

    // Upcoming events this week
    prisma.task.findMany({
      where: {
        type: "event",
        scheduledDate: { gte: todayStart, lt: weekEnd },
        status: { not: "completed" },
      },
      orderBy: { scheduledDate: "asc" },
    }),
  ]);

  // Filter blocks for today's day-of-week
  const todayBlocks = allBlocks.filter((b) =>
    b.days.split(",").includes(todayShort)
  );

  // Goals with progress
  const goalsWithProgress = goals.map((g) => {
    const total = g.tasks.length;
    const completed = g.tasks.filter((t) => t.status === "completed").length;
    return {
      id: g.id,
      title: g.title,
      category: g.category,
      priority: g.priority,
      totalTasks: total,
      completedTasks: completed,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  });

  // Split tasks by type
  const goalTasks = tasks.filter((t) => t.type === "goal_task");
  const todos = tasks.filter((t) => t.type === "to_do");
  const events = tasks.filter((t) => t.type === "event");

  // Overdue count
  const overdue = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < todayStart
  ).length;

  return NextResponse.json({
    todayBlocks,
    goals: goalsWithProgress,
    tasks: { goalTasks, todos, events },
    upcomingEvents,
    stats: {
      activeGoals: goals.length,
      pendingTasks: tasks.length,
      todayBlocks: todayBlocks.length,
      overdue,
    },
  });
}
