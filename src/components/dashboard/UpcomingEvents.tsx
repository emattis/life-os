"use client";

interface Event {
  id: string;
  title: string;
  scheduledDate: string | null;
  estimatedMins: number;
  status: string;
}

interface UpcomingEventsProps {
  events: Event[];
}

export function UpcomingEvents({ events }: UpcomingEventsProps) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <h2 className="text-sm font-medium text-muted uppercase tracking-wider mb-3">
        Upcoming Events
      </h2>
      {events.length === 0 ? (
        <p className="text-xs text-muted/60 text-center py-2">
          No events this week
        </p>
      ) : (
        <div className="space-y-2">
          {events.map((event) => {
            const dt = event.scheduledDate
              ? new Date(event.scheduledDate)
              : null;
            return (
              <div
                key={event.id}
                className="flex items-center gap-3 py-1.5"
              >
                <div className="w-1 h-8 rounded-full bg-pink-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground truncate">
                    {event.title}
                  </p>
                  {dt && (
                    <p className="text-[10px] font-mono text-muted">
                      {dt.toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      {dt.toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                      <span className="text-muted/60 ml-1">
                        · {event.estimatedMins}m
                      </span>
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
