import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCalendarEvents, createCalendarEvent } from "@/lib/google-calendar";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json(
      { error: "Not authenticated. Sign in with Google first." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const timeMin =
    searchParams.get("timeMin") ?? new Date().toISOString().split("T")[0] + "T00:00:00Z";
  const timeMax =
    searchParams.get("timeMax") ??
    (() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d.toISOString().split("T")[0] + "T00:00:00Z";
    })();

  try {
    const events = await getCalendarEvents(
      session.accessToken,
      timeMin,
      timeMax
    );
    return NextResponse.json({
      events,
      syncedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch calendar events";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json(
      { error: "Not authenticated. Sign in with Google first." },
      { status: 401 }
    );
  }

  const body = await request.json();

  try {
    const event = await createCalendarEvent(session.accessToken, {
      title: body.title,
      start: body.start,
      end: body.end,
      description: body.description,
    });
    return NextResponse.json(event, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create calendar event";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
