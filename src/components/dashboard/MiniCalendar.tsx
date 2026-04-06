"use client";

import { useState, useMemo, useEffect } from "react";
import { isSameDay } from "@/lib/utils";

interface MiniCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

export function MiniCalendar({ selectedDate, onDateSelect }: MiniCalendarProps) {
  const [mounted, setMounted] = useState(false);
  const [viewDate, setViewDate] = useState(() => new Date(selectedDate));

  useEffect(() => {
    setMounted(true);
  }, []);

  // When selectedDate changes externally, update the view month if needed
  useEffect(() => {
    if (
      selectedDate.getFullYear() !== viewDate.getFullYear() ||
      selectedDate.getMonth() !== viewDate.getMonth()
    ) {
      setViewDate(new Date(selectedDate));
    }
  }, [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

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

  function handleDayClick(day: number) {
    onDateSelect(new Date(year, month, day));
  }

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
          const thisDate = new Date(year, month, day);
          const isToday = today && isSameDay(thisDate, today);
          const isSelected = isSameDay(thisDate, selectedDate);

          return (
            <button
              key={day}
              onClick={() => handleDayClick(day)}
              className={`h-7 w-full flex items-center justify-center text-xs rounded-md transition-colors ${
                isSelected
                  ? "bg-accent text-white font-bold"
                  : isToday
                    ? "bg-accent/20 text-accent font-bold"
                    : "text-foreground/80 hover:bg-white/10"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Today button */}
      {today && !isSameDay(selectedDate, today) && (
        <button
          onClick={() => onDateSelect(new Date())}
          className="mt-2 w-full text-center text-[10px] text-accent hover:underline"
        >
          Back to today
        </button>
      )}
    </div>
  );
}
