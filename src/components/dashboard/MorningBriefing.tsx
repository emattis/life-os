"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { toLocalDateString } from "@/lib/utils";

interface BriefingResponse {
  briefing?: string;
  error?: string;
}

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) return { error: "Failed to load briefing" };
    return r.json();
  });

export function MorningBriefing() {
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if dismissed today
    const todayStr = toLocalDateString(new Date());
    const dismissedDate = localStorage.getItem("briefing-dismissed");
    if (dismissedDate === todayStr) {
      setDismissed(true);
    }
  }, []);

  const { data, isLoading } = useSWR<BriefingResponse>(
    mounted && !dismissed ? "/api/briefing" : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  if (!mounted || dismissed) return null;

  if (isLoading) {
    return (
      <div className="relative rounded-xl p-[1px] mb-6 bg-gradient-to-r from-accent via-violet-500 to-pink-500">
        <div className="bg-card rounded-[11px] p-5">
          <div className="flex items-center gap-2">
            <span className="text-lg">✦</span>
            <div className="h-4 bg-border/30 rounded w-48 animate-pulse-subtle" />
          </div>
        </div>
      </div>
    );
  }

  if (!data?.briefing) return null;

  const handleDismiss = () => {
    setDismissed(true);
    const todayStr = toLocalDateString(new Date());
    localStorage.setItem("briefing-dismissed", todayStr);
  };

  return (
    <div className="relative rounded-xl p-[1px] mb-6 bg-gradient-to-r from-accent via-violet-500 to-pink-500 animate-fade-in-up">
      <div className="bg-card rounded-[11px] p-5">
        <div className="flex items-start gap-3">
          <span className="text-lg mt-0.5 shrink-0">✦</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground leading-relaxed">
              {data.briefing}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted hover:text-foreground transition-colors shrink-0 p-1 -mt-1 -mr-1"
            title="Dismiss for today"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
