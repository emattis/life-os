import { prisma } from "@/lib/prisma";
import { getDayOfWeek } from "@/lib/utils";
import { generateText, extractJSON } from "@/lib/gemini";
import { getCalendarEvents } from "@/lib/google-calendar";
import type { OptimizedSchedule } from "@/types";

interface OptimizerInput {
  accessToken?: string;
  date?: string; // "YYYY-MM-DD", defaults to today
}

export async function optimizeDay(
  input: OptimizerInput
): Promise<OptimizedSchedule> {
  // Parse target date (default to today)
  const targetDate = input.date
    ? new Date(input.date + "T12:00:00")
    : new Date();
  const dayShort = getDayOfWeek(targetDate);
  const dateStr = targetDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Gather all data in parallel
  const [allBlocks, goals, tasks] = await Promise.all([
    prisma.dailyBlock.findMany({ orderBy: { startTime: "asc" } }),
    prisma.goal.findMany({
      where: { status: "active" },
      include: {
        tasks: {
          where: { status: { not: "completed" } },
          select: { id: true, title: true, estimatedMins: true, energyLevel: true, priority: true },
        },
      },
      orderBy: { priority: "asc" },
    }),
    prisma.task.findMany({
      where: { status: { not: "completed" } },
      include: {
        goal: { select: { id: true, title: true, category: true, priority: true } },
      },
      orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
    }),
  ]);

  // Filter blocks for target day
  const dayBlocks = allBlocks.filter((b) =>
    b.days.split(",").includes(dayShort)
  );
  const fixedBlocks = dayBlocks.filter((b) => !b.flexible);
  const flexibleBlocks = dayBlocks.filter((b) => b.flexible);

  // Split tasks by type
  const goalTasks = tasks.filter((t) => t.type === "goal_task");
  const todos = tasks.filter((t) => t.type === "to_do");
  const events = tasks.filter((t) => t.type === "event");

  // Build goal backlog for suggestions (tasks not yet scheduled that align with goals)
  const goalBacklog = goals
    .filter((g) => g.tasks.length > 0)
    .map((g) => ({
      goalTitle: g.title,
      category: g.category,
      priority: g.priority,
      pendingTasks: g.tasks.slice(0, 3).map((t) => ({
        id: t.id,
        title: t.title,
        estimatedMins: t.estimatedMins,
        energyLevel: t.energyLevel,
      })),
    }));

  // Fetch Google Calendar events if authenticated
  let calendarEvents: { title: string; start: string; end: string; allDay: boolean }[] = [];
  if (input.accessToken) {
    try {
      const timeMin = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate()
      ).toISOString();
      const timeMax = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate() + 1
      ).toISOString();
      calendarEvents = await getCalendarEvents(input.accessToken, timeMin, timeMax);
    } catch {
      // Calendar fetch failed — continue without it
    }
  }

  // Build prompt
  const prompt = buildPrompt({
    dateStr,
    goals: goals.map((g) => ({ title: g.title, category: g.category, priority: g.priority })),
    goalTasks,
    todos,
    events,
    fixedBlocks,
    flexibleBlocks,
    calendarEvents,
    goalBacklog,
  });

  // Call Gemini
  const rawResponse = await generateText(prompt);
  const jsonStr = extractJSON(rawResponse);
  const parsed: OptimizedSchedule = JSON.parse(jsonStr);

  return parsed;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildPrompt(data: {
  dateStr: string;
  goals: any[];
  goalTasks: any[];
  todos: any[];
  events: any[];
  fixedBlocks: any[];
  flexibleBlocks: any[];
  calendarEvents: any[];
  goalBacklog: any[];
}): string {
  const goalsSection = data.goals.length > 0
    ? data.goals.map((g: any) => `- [P${g.priority}] ${g.title} (${g.category})`).join("\n")
    : "No active goals";

  const goalTasksSection = data.goalTasks.length > 0
    ? data.goalTasks.map((t: any) =>
        `- [ID: ${t.id}] "${t.title}" — P${t.priority}, ${t.estimatedMins}min, energy: ${t.energyLevel}${t.dueDate ? `, due: ${new Date(t.dueDate).toLocaleDateString()}` : ""}${t.goal ? `, goal: "${t.goal.title}" (P${t.goal.priority})` : ""}`
      ).join("\n")
    : "No goal tasks";

  const todosSection = data.todos.length > 0
    ? data.todos.map((t: any) =>
        `- [ID: ${t.id}] "${t.title}" — P${t.priority}, ${t.estimatedMins}min, energy: ${t.energyLevel}${t.dueDate ? `, due: ${new Date(t.dueDate).toLocaleDateString()}` : ""}`
      ).join("\n")
    : "No to-dos";

  const eventsSection = data.events.length > 0
    ? data.events.map((t: any) =>
        `- [ID: ${t.id}] "${t.title}" — ${t.scheduledDate ? new Date(t.scheduledDate).toLocaleString() : "no time set"}, ${t.estimatedMins}min`
      ).join("\n")
    : "No scheduled events";

  const fixedSection = data.fixedBlocks.length > 0
    ? data.fixedBlocks.map((b: any) => `- ${b.name}: ${b.startTime}–${b.endTime} (${b.category})`).join("\n")
    : "No fixed blocks";

  const flexSection = data.flexibleBlocks.length > 0
    ? data.flexibleBlocks.map((b: any) => `- ${b.name}: ${b.startTime}–${b.endTime} (${b.category})`).join("\n")
    : "No flexible blocks";

  const calSection = data.calendarEvents.length > 0
    ? data.calendarEvents.map((e: any) => {
        if (e.allDay) return `- ${e.title} (all day)`;
        const start = new Date(e.start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        const end = new Date(e.end).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        return `- ${e.title}: ${start}–${end}`;
      }).join("\n")
    : "No calendar events";

  const backlogSection = data.goalBacklog.length > 0
    ? data.goalBacklog.map((g: any) =>
        `- Goal "${g.goalTitle}" (${g.category}, P${g.priority}): ${g.pendingTasks.map((t: any) => `"${t.title}" (${t.estimatedMins}min, ${t.energyLevel} energy)`).join(", ")}`
      ).join("\n")
    : "No backlog tasks";

  return `You are a personal productivity optimizer. Given the following information about the user's day, create an optimized schedule.

**User's Goals (by priority):**
${goalsSection}

**Goal Tasks (linked to goals — schedule these with highest priority):**
${goalTasksSection}

**To-Dos (standalone tasks — fit into available time):**
${todosSection}

**Events (fixed-time activities — plan around these):**
${eventsSection}

**Fixed Daily Blocks (cannot be moved):**
${fixedSection}

**Flexible Daily Blocks (can be rearranged):**
${flexSection}

**Existing Calendar Events:**
${calSection}

**Goal Backlog (suggest these if free time remains after all pending tasks are scheduled):**
${backlogSection}

**Date:** ${data.dateStr}

Create a minute-by-minute schedule for the day. Rules:
1. Never overlap with fixed blocks, existing calendar events, or scheduled events
2. Schedule goal_tasks first, prioritized by their parent goal's rank
3. Fit to_dos into remaining open slots, ordered by priority then due date
4. Events are immovable — treat them like fixed blocks
5. Schedule high-energy tasks during morning hours (9am-12pm)
6. Schedule medium-energy tasks early afternoon (1pm-3pm)
7. Schedule low-energy tasks late afternoon (3pm-5pm)
8. Use STRATEGIC buffer times:
   - 10-15 min buffer after high-energy tasks
   - 20-30 min buffer after 90-minute deep work sessions
   - No buffer needed between a block ending and a task starting, or between low-energy tasks
   - Do NOT place a buffer between every single item
9. Don't schedule more than 90 minutes of deep work without a break
10. Leave at least 1 hour of unscheduled "flex time" for unexpected things
11. If free time slots remain after scheduling all pending tasks, suggest goal-aligned tasks from the backlog that would advance the user's highest-priority goals. Mark these with type "suggested" so the user knows they are recommendations, not committed tasks.

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "schedule": [
    { "start": "07:00", "end": "08:00", "activity": "...", "type": "block|goal_task|to_do|event|calendar|buffer|suggested", "taskId": "..." }
  ],
  "reasoning": "...",
  "tasksDeferred": ["task IDs that couldn't fit"],
  "suggestions": ["productivity tips based on the day's workload"]
}`;
}
