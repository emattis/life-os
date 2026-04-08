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
      date: body.date, // "YYYY-MM-DD" or undefined (defaults to today)
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
      const dateStr = body.date; // "YYYY-MM-DD"

      const writeableTypes = ["goal_task", "to_do", "suggested"];
      const calendarEntries = schedule.filter(
        (entry: { type: string }) => writeableTypes.includes(entry.type)
      );

      for (const entry of calendarEntries) {
        // Build local datetime strings: "2026-04-06T09:00:00"
        const startDT = `${dateStr}T${entry.start}:00`;
        const endDT = `${dateStr}T${entry.end}:00`;

        try {
          await createCalendarEvent(accessToken, {
            title: `[Life OS] ${entry.activity}`,
            start: startDT,
            end: endDT,
            description: "Scheduled by Life OS AI Optimizer",
            timeZone: "America/New_York",
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
