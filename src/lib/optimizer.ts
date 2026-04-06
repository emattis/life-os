import { prisma } from "@/lib/prisma";
import { getDayOfWeek } from "@/lib/utils";
import { generateText, extractJSON } from "@/lib/gemini";
import { getCalendarEvents } from "@/lib/google-calendar";
import type { OptimizedSchedule } from "@/types";

interface OptimizerInput {
  accessToken?: string;
}

export async function optimizeDay(
  input: OptimizerInput
): Promise<OptimizedSchedule> {
  const now = new Date();
  const todayShort = getDayOfWeek(now);
  const todayStr = now.toLocaleDateString("en-US", {
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

  // Filter blocks for today
  const todayBlocks = allBlocks.filter((b) =>
    b.days.split(",").includes(todayShort)
  );
  const fixedBlocks = todayBlocks.filter((b) => !b.flexible);
  const flexibleBlocks = todayBlocks.filter((b) => b.flexible);

  // Split tasks by type
  const goalTasks = tasks.filter((t) => t.type === "goal_task");
  const todos = tasks.filter((t) => t.type === "to_do");
  const events = tasks.filter((t) => t.type === "event");

  // Fetch Google Calendar events if authenticated
  let calendarEvents: { title: string; start: string; end: string; allDay: boolean }[] = [];
  if (input.accessToken) {
    try {
      const timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const timeMax = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
      calendarEvents = await getCalendarEvents(input.accessToken, timeMin, timeMax);
    } catch {
      // Calendar fetch failed — continue without it
    }
  }

  // Build prompt
  const prompt = buildPrompt({
    todayStr,
    goals,
    goalTasks,
    todos,
    events,
    fixedBlocks,
    flexibleBlocks,
    calendarEvents,
  });

  // Call Gemini
  const rawResponse = await generateText(prompt);

  // Parse JSON from response (handle markdown code blocks)
  const jsonStr = extractJSON(rawResponse);
  const parsed: OptimizedSchedule = JSON.parse(jsonStr);

  return parsed;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildPrompt(data: {
  todayStr: string;
  goals: any[];
  goalTasks: any[];
  todos: any[];
  events: any[];
  fixedBlocks: any[];
  flexibleBlocks: any[];
  calendarEvents: any[];
}): string {
  const goalsSection = data.goals.length > 0
    ? data.goals.map((g) => `- [P${g.priority}] ${g.title} (${g.category})`).join("\n")
    : "No active goals";

  const goalTasksSection = data.goalTasks.length > 0
    ? data.goalTasks.map((t) =>
        `- [ID: ${t.id}] "${t.title}" — P${t.priority}, ${t.estimatedMins}min, energy: ${t.energyLevel}${t.dueDate ? `, due: ${new Date(t.dueDate).toLocaleDateString()}` : ""}${t.goal ? `, goal: "${t.goal.title}" (P${t.goal.priority})` : ""}`
      ).join("\n")
    : "No goal tasks";

  const todosSection = data.todos.length > 0
    ? data.todos.map((t) =>
        `- [ID: ${t.id}] "${t.title}" — P${t.priority}, ${t.estimatedMins}min, energy: ${t.energyLevel}${t.dueDate ? `, due: ${new Date(t.dueDate).toLocaleDateString()}` : ""}`
      ).join("\n")
    : "No to-dos";

  const eventsSection = data.events.length > 0
    ? data.events.map((t) =>
        `- [ID: ${t.id}] "${t.title}" — ${t.scheduledDate ? new Date(t.scheduledDate).toLocaleString() : "no time set"}, ${t.estimatedMins}min`
      ).join("\n")
    : "No scheduled events";

  const fixedSection = data.fixedBlocks.length > 0
    ? data.fixedBlocks.map((b) => `- ${b.name}: ${b.startTime}–${b.endTime} (${b.category})`).join("\n")
    : "No fixed blocks";

  const flexSection = data.flexibleBlocks.length > 0
    ? data.flexibleBlocks.map((b) => `- ${b.name}: ${b.startTime}–${b.endTime} (${b.category})`).join("\n")
    : "No flexible blocks";

  const calSection = data.calendarEvents.length > 0
    ? data.calendarEvents.map((e) => {
        if (e.allDay) return `- ${e.title} (all day)`;
        const start = new Date(e.start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        const end = new Date(e.end).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        return `- ${e.title}: ${start}–${end}`;
      }).join("\n")
    : "No calendar events";

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

**Today:** ${data.todayStr}

Create a minute-by-minute schedule for the day. Rules:
1. Never overlap with fixed blocks, existing calendar events, or scheduled events
2. Schedule goal_tasks first, prioritized by their parent goal's rank
3. Fit to_dos into remaining open slots, ordered by priority then due date
4. Events are immovable — treat them like fixed blocks
5. Schedule high-energy tasks during morning hours (9am-12pm)
6. Schedule medium-energy tasks early afternoon (1pm-3pm)
7. Schedule low-energy tasks late afternoon (3pm-5pm)
8. Include 10-min buffers between task blocks
9. Don't schedule more than 90 minutes of deep work without a break
10. Leave at least 1 hour of unscheduled "flex time" for unexpected things

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "schedule": [
    { "start": "07:00", "end": "08:00", "activity": "...", "type": "block|goal_task|to_do|event|calendar|buffer", "taskId": "..." }
  ],
  "reasoning": "...",
  "tasksDeferred": ["task IDs that couldn't fit today"],
  "suggestions": ["any productivity tips based on the day's workload"]
}`;
}
