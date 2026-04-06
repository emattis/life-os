"use client";

import { useState, useMemo, useEffect } from "react";

export function MiniCalendar() {
  const [mounted, setMounted] = useState(false);
  const [viewDate, setViewDate] = useState(() => new Date());

  useEffect(() => {
    setMounted(true);
  }, []);

  const today = mounted ? new Date() : null;
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const { days, startDay } = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDay = new Date(year, month, 1).getDay();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    return { days, startDay };
  }, [year, month]);

  const monthLabel = viewDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  function prevMonth() {
    setViewDate(new Date(year, month - 1, 1));
  }
  function nextMonth() {
    setViewDate(new Date(year, month + 1, 1));
  }

  const isCurrentMonth =
    today && today.getFullYear() === year && today.getMonth() === month;

  if (!mounted) {
    return (
      <div className="bg-card rounded-xl border border-border p-4 h-[280px] animate-pulse-subtle" />
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="p-1 text-muted hover:text-foreground transition-colors text-xs"
        >
          ‹
        </button>
        <span className="text-sm font-medium text-foreground">{monthLabel}</span>
        <button
          onClick={nextMonth}
          className="p-1 text-muted hover:text-foreground transition-colors text-xs"
        >
          ›
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0 mb-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div
            key={i}
            className="text-[10px] font-medium text-muted text-center py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-0">
        {Array.from({ length: startDay }).map((_, i) => (
          <div key={`empty-${i}`} className="h-7" />
        ))}
        {days.map((day) => {
          const isToday = isCurrentMonth && today && day === today.getDate();
          return (
            <div
              key={day}
              className={`h-7 flex items-center justify-center text-xs rounded-md ${
                isToday
                  ? "bg-accent text-white font-bold"
                  : "text-foreground/80 hover:bg-white/5"
              }`}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}
