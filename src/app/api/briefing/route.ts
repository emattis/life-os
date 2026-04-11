import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCalendarEvents } from "@/lib/google-calendar";
import { generateText, extractJSON } from "@/lib/gemini";
import { NextResponse } from "next/server";

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function GET() {
  const today = new Date();
  const todayStr = fmtDate(today);

  // Check cache first
  const cached = await prisma.dailyBriefing.findUnique({
    where: { date: todayStr },
  });
  if (cached) {
    return NextResponse.json({ briefing: cached.content, cached: true });
  }

  // Gather context
  const session = await getServerSession(authOptions);

  const [tasks, goals, recurringTasks] = await Promise.all([
    prisma.task.findMany({
      where: { status: { not: "completed" } },
      include: {
        goal: { select: { title: true } },
      },
      orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
    }),
    prisma.goal.findMany({
      where: { status: "active" },
      orderBy: { priority: "asc" },
    }),
    prisma.task.findMany({
      where: { recurring: { not: null } },
      select: {
        id: true,
        title: true,
        recurring: true,
        habitLogs: {
          orderBy: { date: "desc" },
          take: 7,
          select: { date: true, completed: true },
        },
      },
    }),
  ]);

  // Calendar events
  let calendarSummary = "No calendar events (not signed in)";
  if (session?.accessToken) {
    try {
      const timeMin = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const timeMax = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
      const events = await getCalendarEvents(session.accessToken, timeMin, timeMax);
      if (events.length > 0) {
        calendarSummary = events
          .map((e) => {
            if (e.allDay) return `${e.title} (all day)`;
            const s = new Date(e.start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
            const end = new Date(e.end).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
            return `${e.title} (${s}–${end})`;
          })
          .join(", ");
      } else {
        calendarSummary = "No calendar events today";
      }
    } catch {
      calendarSummary = "Calendar unavailable";
    }
  }

  // Streak info
  const streakInfo = recurringTasks.map((t) => {
    const logs = new Set(t.habitLogs.filter((l) => l.completed).map((l) => l.date));
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const doneYesterday = logs.has(fmtDate(yesterday));
    const doneToday = logs.has(todayStr);
    const atRisk = !doneToday && t.recurring === "daily";
    return `"${t.title}" (${t.recurring}${atRisk ? ", AT RISK — not done today yet" : doneToday ? ", done today" : ""})`;
  });

  // Weekly habit score
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekStartStr = fmtDate(weekStart);
  let weekExpected = 0;
  let weekCompleted = 0;
  for (const t of recurringTasks) {
    const expected = t.recurring === "daily" ? 7 : t.recurring === "weekly" ? 1 : 0.25;
    weekExpected += expected;
    const completions = t.habitLogs.filter(
      (l) => l.completed && l.date >= weekStartStr && l.date <= todayStr
    ).length;
    weekCompleted += Math.min(completions, expected);
  }
  const weeklyScore = weekExpected > 0 ? Math.round((weekCompleted / weekExpected) * 100) : 100;

  // Task summary
  const topTask = tasks[0];
  const overdue = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < today
  ).length;

  const dateLabel = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const prompt = `You are a concise, motivational daily briefing assistant. Generate a morning briefing for the user.

Context:
- Date: ${dateLabel}
- Pending tasks: ${tasks.length} (${overdue} overdue)
- Top priority task: ${topTask ? `"${topTask.title}"${topTask.goal ? ` (goal: ${topTask.goal.title})` : ""}, priority ${topTask.priority}` : "none"}
- Active goals: ${goals.map((g) => g.title).join(", ") || "none"}
- Calendar today: ${calendarSummary}
- Recurring habits: ${streakInfo.join("; ") || "none"}
- Weekly habit score: ${weeklyScore}%

Write a morning briefing in EXACTLY this JSON format (no markdown, no code fences):
{
  "briefing": "3-4 sentences max. Start with a greeting referencing the day. Mention the number of tasks and any key events. State the single most important thing to focus on. If any streaks are at risk, mention it. End with one actionable tip. Be punchy and motivational, not verbose."
}`;

  try {
    const raw = await generateText(prompt);
    const parsed = JSON.parse(extractJSON(raw));
    const briefing = parsed.briefing;

    // Cache it
    await prisma.dailyBriefing.create({
      data: { date: todayStr, content: briefing },
    });

    return NextResponse.json({ briefing, cached: false });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate briefing";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
