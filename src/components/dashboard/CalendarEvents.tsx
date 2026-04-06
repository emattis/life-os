"use client";

import { useState, useCallback, useMemo } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { localDayBounds, isSameDay } from "@/lib/utils";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
}

interface CalendarResponse {
  events: CalendarEvent[];
  syncedAt: string;
  error?: string;
}

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) return { events: [], syncedAt: "", error: "Not signed in" };
    return r.json();
  });

function formatEventTime(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

interface CalendarEventsProps {
  selectedDate: Date;
  onEventsLoaded?: (events: CalendarEvent[], syncedAt: string) => void;
}

export function CalendarEvents({
  selectedDate,
  onEventsLoaded,
}: CalendarEventsProps) {
  const { data: session, status } = useSession();
  const [manualRefresh, setManualRefresh] = useState(0);

  // Use local timezone bounds for the selected date
  const { timeMin, timeMax } = useMemo(
    () => localDayBounds(selectedDate),
    [selectedDate]
  );

  const hasToken = !!session?.accessToken;
  const isToday = isSameDay(selectedDate, new Date());

  const { data, mutate } = useSWR<CalendarResponse>(
    hasToken
      ? `/api/calendar?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&_r=${manualRefresh}`
      : null,
    fetcher,
    {
      revalidateOnFocus: false,
      onSuccess: (data) => {
        if (data?.events && onEventsLoaded) {
          onEventsLoaded(data.events, data.syncedAt);
        }
      },
    }
  );

  const handleSync = useCallback(() => {
    setManualRefresh((n) => n + 1);
    mutate();
  }, [mutate]);

  if (status === "loading") {
    return (
      <div className="bg-card rounded-xl border border-border p-4">
        <h2 className="text-sm font-medium text-muted uppercase tracking-wider mb-2">
          Google Calendar
        </h2>
        <p className="text-xs text-muted/60 text-center py-2 animate-pulse-subtle">
          Loading...
        </p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="bg-card rounded-xl border border-border p-4">
        <h2 className="text-sm font-medium text-muted uppercase tracking-wider mb-2">
          Google Calendar
        </h2>
        <p className="text-xs text-muted/60 text-center py-2">
          Sign in with Google to see your calendar
        </p>
      </div>
    );
  }

  const events = data?.events ?? [];
  const syncedAt = data?.syncedAt;
  const hasError = data?.error;

  const dateLabel = isToday
    ? "today"
    : selectedDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-muted uppercase tracking-wider">
          Calendar
        </h2>
        <button
          onClick={handleSync}
          className="text-[10px] text-accent hover:text-accent/80 transition-colors"
          title="Refresh calendar events"
        >
          ↻ Sync
        </button>
      </div>

      {hasError ? (
        <p className="text-xs text-red-400/80 text-center py-2">
          {data?.error}
        </p>
      ) : events.length === 0 ? (
        <p className="text-xs text-muted/60 text-center py-2">
          No events {dateLabel}
        </p>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <div key={event.id} className="flex items-center gap-3 py-1.5">
              <div className="w-1 h-8 rounded-full bg-blue-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground truncate">
                  {event.title}
                </p>
                <p className="text-[10px] font-mono text-muted">
                  {event.allDay
                    ? "All day"
                    : `${formatEventTime(event.start)} – ${formatEventTime(event.end)}`}
                  {event.location && (
                    <span className="text-muted/50 ml-1">
                      · {event.location}
                    </span>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {syncedAt && (
        <div className="mt-3 pt-2 border-t border-border">
          <p className="text-[10px] text-muted/50">
            Last synced{" "}
            {new Date(syncedAt).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>
      )}
    </div>
  );
}
