import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getDayOfWeek } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date"); // "YYYY-MM-DD" or null (defaults to today)

  const targetDate = dateParam ? new Date(dateParam + "T12:00:00") : new Date();
  const dayShort = getDayOfWeek(targetDate);
  const dayStart = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate()
  );
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const weekEnd = new Date(dayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const dateKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}-${String(targetDate.getDate()).padStart(2, "0")}`;

  const [allBlocks, goals, tasks, upcomingEvents, acceptedPlan] = await Promise.all([
    prisma.dailyBlock.findMany({ orderBy: { startTime: "asc" } }),

    prisma.goal.findMany({
      where: { status: "active" },
      include: {
        tasks: { select: { id: true, status: true } },
      },
      orderBy: { priority: "asc" },
    }),

    prisma.task.findMany({
      where: { status: { not: "completed" } },
      include: {
        goal: { select: { id: true, title: true, category: true } },
      },
      orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
    }),

    prisma.task.findMany({
      where: {
        type: "event",
        scheduledDate: { gte: dayStart, lt: weekEnd },
        status: { not: "completed" },
      },
      orderBy: { scheduledDate: "asc" },
    }),

    // Check for an accepted optimized plan for this date
    prisma.optimizedDay.findFirst({
      where: { date: dateKey, accepted: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Filter blocks for the target day-of-week
  const dayBlocks = allBlocks.filter((b) =>
    b.days.split(",").includes(dayShort)
  );

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

  const goalTasks = tasks.filter((t) => t.type === "goal_task");
  const todos = tasks.filter((t) => t.type === "to_do");
  const events = tasks.filter((t) => t.type === "event");

  const overdue = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < dayStart
  ).length;

  // Parse accepted plan if it exists
  let optimizedSchedule = null;
  if (acceptedPlan) {
    try {
      optimizedSchedule = JSON.parse(acceptedPlan.plan);
    } catch {
      // Invalid JSON — ignore
    }
  }

  return NextResponse.json({
    todayBlocks: dayBlocks,
    goals: goalsWithProgress,
    tasks: { goalTasks, todos, events },
    upcomingEvents,
    optimizedSchedule,
    stats: {
      activeGoals: goals.length,
      pendingTasks: tasks.length,
      todayBlocks: dayBlocks.length,
      overdue,
    },
  });
}
