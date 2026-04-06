import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { optimizeDay } from "@/lib/optimizer";
import { createCalendarEvent } from "@/lib/google-calendar";
import { NextRequest, NextResponse } from "next/server";

// POST /api/optimize — generate an optimized schedule
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const body = await request.json();

  if (body.action === "accept") {
    return handleAccept(body, session?.accessToken);
  }

  // Generate schedule
  try {
    const schedule = await optimizeDay({
      accessToken: session?.accessToken,
    });
    return NextResponse.json(schedule);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to generate schedule";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handleAccept(
  body: { plan: string; reasoning?: string; date: string },
  accessToken?: string
) {
  try {
    // Save to OptimizedDay
    const optimizedDay = await prisma.optimizedDay.create({
      data: {
        date: body.date,
        plan: body.plan,
        reasoning: body.reasoning ?? null,
        accepted: true,
      },
    });

    // Push task entries to Google Calendar if authenticated
    if (accessToken) {
      const schedule = JSON.parse(body.plan);
      const today = new Date(body.date);

      const writeableTypes = ["goal_task", "to_do"];
      const calendarEntries = schedule.filter(
        (entry: { type: string }) => writeableTypes.includes(entry.type)
      );

      for (const entry of calendarEntries) {
        const [startH, startM] = entry.start.split(":").map(Number);
        const [endH, endM] = entry.end.split(":").map(Number);

        const start = new Date(today);
        start.setHours(startH, startM, 0, 0);
        const end = new Date(today);
        end.setHours(endH, endM, 0, 0);

        try {
          await createCalendarEvent(accessToken, {
            title: `[Life OS] ${entry.activity}`,
            start: start.toISOString(),
            end: end.toISOString(),
            description: "Scheduled by Life OS AI Optimizer",
          });
        } catch {
          // Skip individual calendar write failures
        }
      }
    }

    return NextResponse.json({ success: true, id: optimizedDay.id });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to accept plan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
