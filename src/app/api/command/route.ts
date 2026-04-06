import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { generateText, extractJSON } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (body.action === "create") {
    return handleCreate(body.items);
  }

  // Parse natural language
  const { input } = body;
  if (!input || typeof input !== "string") {
    return NextResponse.json({ error: "input is required" }, { status: 400 });
  }

  try {
    // Fetch existing goals for context
    const goals = await prisma.goal.findMany({
      where: { status: "active" },
      select: { id: true, title: true, category: true },
      orderBy: { priority: "asc" },
    });

    const goalsContext =
      goals.length > 0
        ? goals
            .map((g) => `- [ID: ${g.id}] "${g.title}" (${g.category})`)
            .join("\n")
        : "No active goals yet";

    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const prompt = `You are an assistant that converts natural language into structured tasks, goals, and events.

**User's existing goals:**
${goalsContext}

**Available goal categories:** Health, Career, Personal Growth, Financial, Relationships, Creative

**Today's date:** ${today}

The user said: "${input}"

Determine what the user wants to create. Return ONLY valid JSON (no markdown, no code fences):
{
  "items": [
    {
      "action": "create_task" | "create_goal" | "create_both",
      "goal": {
        "title": "...",
        "category": "health|career|personal|financial|relationships|creative",
        "priority": 1-5,
        "targetDate": "YYYY-MM-DD or null"
      },
      "task": {
        "title": "...",
        "type": "goal_task" | "to_do" | "event",
        "priority": 1-4,
        "estimatedMins": number,
        "energyLevel": "low" | "medium" | "high",
        "dueDate": "YYYY-MM-DD or null",
        "scheduledDate": "YYYY-MM-DDTHH:mm or null",
        "goalId": "existing goal ID or null",
        "recurring": "daily" | "weekly" | "monthly" | null,
        "tags": "comma-separated or null"
      },
      "explanation": "Brief reason for the choices made"
    }
  ],
  "followUp": "Optional question if the input is ambiguous, or null"
}

Rules:
- Only include "goal" field when action is "create_goal" or "create_both"
- Only include "task" field when action is "create_task" or "create_both"
- Infer priority from urgency cues ("critical", "important", "whenever", "low priority")
- Infer energy level from task type (deep work = high, errands = low, meetings = medium)
- Estimate duration based on common sense (workout = 60min, email = 15min, presentation prep = 120min)
- Link to existing goals when the task clearly relates to one (use the goal ID)
- If the user describes a habit or ongoing commitment, suggest a goal + recurring task(s)
- If ambiguous, include a followUp question rather than guessing wrong
- For "create_both", the task's goalId should be set to "NEW" — the app will link it after creating the goal`;

    const rawResponse = await generateText(prompt);
    const jsonStr = extractJSON(rawResponse);
    const parsed = JSON.parse(jsonStr);

    return NextResponse.json(parsed);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to parse command";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleCreate(items: any[]) {
  const created: { type: string; title: string }[] = [];

  for (const item of items) {
    let goalId = item.task?.goalId;

    // Create goal if needed
    if (
      (item.action === "create_goal" || item.action === "create_both") &&
      item.goal
    ) {
      const goal = await prisma.goal.create({
        data: {
          title: item.goal.title,
          category: item.goal.category ?? "personal",
          priority: item.goal.priority ?? 1,
          targetDate: item.goal.targetDate
            ? new Date(item.goal.targetDate)
            : null,
        },
      });
      created.push({ type: "goal", title: goal.title });

      // Link task to newly created goal
      if (item.action === "create_both" && item.task) {
        goalId = goal.id;
      }
    }

    // Create task if needed
    if (
      (item.action === "create_task" || item.action === "create_both") &&
      item.task
    ) {
      const task = await prisma.task.create({
        data: {
          title: item.task.title,
          type: item.task.type ?? "to_do",
          priority: item.task.priority ?? 2,
          estimatedMins: item.task.estimatedMins ?? 30,
          energyLevel: item.task.energyLevel ?? "medium",
          dueDate: item.task.dueDate ? new Date(item.task.dueDate) : null,
          scheduledDate: item.task.scheduledDate
            ? new Date(item.task.scheduledDate)
            : null,
          goalId: goalId === "NEW" ? null : goalId ?? null,
          recurring: item.task.recurring ?? null,
          tags: item.task.tags ?? null,
        },
      });
      created.push({ type: "task", title: task.title });
    }
  }

  return NextResponse.json({ created });
}
