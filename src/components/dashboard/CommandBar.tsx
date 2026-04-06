"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface ParsedGoal {
  title: string;
  category: string;
  priority: number;
  targetDate: string | null;
}

interface ParsedTask {
  title: string;
  type: string;
  priority: number;
  estimatedMins: number;
  energyLevel: string;
  dueDate: string | null;
  scheduledDate: string | null;
  goalId: string | null;
  recurring: string | null;
  tags: string | null;
}

interface ParsedItem {
  action: string;
  goal?: ParsedGoal;
  task?: ParsedTask;
  explanation: string;
}

interface HistoryEntry {
  id: number;
  type: "user" | "ai" | "created" | "error";
  text: string;
  items?: ParsedItem[];
  followUp?: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  goal_task: "Goal Task",
  to_do: "To-Do",
  event: "Event",
};

const PRIORITY_LABELS: Record<number, string> = {
  1: "Urgent",
  2: "High",
  3: "Medium",
  4: "Low",
};

const ENERGY_ICONS: Record<string, string> = {
  high: "🔴",
  medium: "🟡",
  low: "🟢",
};

interface CommandBarProps {
  onItemsCreated: () => void;
}

export function CommandBar({ onItemsCreated }: CommandBarProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [pendingItems, setPendingItems] = useState<ParsedItem[] | null>(null);
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idCounter = useRef(0);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, pendingItems]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || loading) return;

      const userText = input.trim();
      setInput("");
      setExpanded(true);
      setPendingItems(null);

      const userId = ++idCounter.current;
      setHistory((h) => [...h, { id: userId, type: "user", text: userText }]);
      setLoading(true);

      try {
        const res = await fetch("/api/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: userText }),
        });
        const data = await res.json();

        if (data.error) {
          setHistory((h) => [
            ...h,
            { id: ++idCounter.current, type: "error", text: data.error },
          ]);
        } else {
          setPendingItems(data.items ?? []);
          setHistory((h) => [
            ...h,
            {
              id: ++idCounter.current,
              type: "ai",
              text: data.followUp || `Found ${data.items?.length ?? 0} item(s) to create`,
              items: data.items,
              followUp: data.followUp,
            },
          ]);
        }
      } catch {
        setHistory((h) => [
          ...h,
          {
            id: ++idCounter.current,
            type: "error",
            text: "Failed to process. Please try again.",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [input, loading]
  );

  const handleCreate = useCallback(async () => {
    if (!pendingItems) return;
    setLoading(true);

    try {
      const res = await fetch("/api/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", items: pendingItems }),
      });
      const data = await res.json();

      if (data.created) {
        const summary = data.created
          .map((c: { type: string; title: string }) => `${c.type}: "${c.title}"`)
          .join(", ");
        setHistory((h) => [
          ...h,
          {
            id: ++idCounter.current,
            type: "created",
            text: `Created ${summary}`,
          },
        ]);
        setPendingItems(null);
        onItemsCreated();
      }
    } catch {
      setHistory((h) => [
        ...h,
        {
          id: ++idCounter.current,
          type: "error",
          text: "Failed to create items.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [pendingItems, onItemsCreated]);

  const handleDismiss = useCallback(() => {
    setPendingItems(null);
    setHistory((h) => [
      ...h,
      { id: ++idCounter.current, type: "ai", text: "Dismissed." },
    ]);
  }, []);

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Chat history (expandable) */}
      {expanded && history.length > 0 && (
        <div
          ref={scrollRef}
          className="max-h-80 overflow-y-auto p-4 space-y-3 border-b border-border"
        >
          {history.map((entry) => (
            <div key={entry.id}>
              {entry.type === "user" && (
                <div className="flex justify-end">
                  <div className="bg-accent/15 text-accent text-sm px-3 py-2 rounded-lg max-w-[80%]">
                    {entry.text}
                  </div>
                </div>
              )}
              {entry.type === "ai" && (
                <div className="space-y-2">
                  <div className="text-sm text-foreground/80 px-1">
                    {entry.text}
                  </div>
                </div>
              )}
              {entry.type === "created" && (
                <div className="flex items-center gap-2 px-1">
                  <span className="text-green-400 text-sm">✓</span>
                  <span className="text-sm text-green-400">{entry.text}</span>
                </div>
              )}
              {entry.type === "error" && (
                <div className="text-sm text-red-400 px-1">{entry.text}</div>
              )}
            </div>
          ))}

          {/* Pending items preview cards */}
          {pendingItems && pendingItems.length > 0 && (
            <div className="space-y-2">
              {pendingItems.map((item, i) => (
                <ItemPreviewCard key={i} item={item} />
              ))}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleCreate}
                  disabled={loading}
                  className="bg-green-500 hover:bg-green-500/90 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                >
                  {loading ? "Creating..." : `Create ${pendingItems.length} item${pendingItems.length > 1 ? "s" : ""}`}
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted hover:text-foreground border border-border hover:bg-white/5 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-2 px-1">
              <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-muted">Thinking...</span>
            </div>
          )}
        </div>
      )}

      {/* Input bar */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3">
        <div className="text-accent text-sm shrink-0">✦</div>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => history.length > 0 && setExpanded(true)}
          placeholder="Tell me what you need to get done..."
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
          disabled={loading}
        />
        {input.trim() && (
          <button
            type="submit"
            disabled={loading}
            className="px-3 py-1 bg-accent hover:bg-accent/90 text-white rounded-md text-xs font-medium transition-colors shrink-0"
          >
            Send
          </button>
        )}
        {expanded && history.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="text-muted hover:text-foreground text-xs shrink-0 px-1"
          >
            ▾
          </button>
        )}
      </form>
    </div>
  );
}

function ItemPreviewCard({ item }: { item: ParsedItem }) {
  return (
    <div className="bg-background rounded-lg border border-border p-3 space-y-2">
      {/* Goal preview */}
      {item.goal && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-400/10 text-violet-400">
            Goal
          </span>
          <span className="text-sm font-medium text-foreground">
            {item.goal.title}
          </span>
          <span className="text-[10px] text-muted">
            {item.goal.category} · P{item.goal.priority}
          </span>
        </div>
      )}

      {/* Task preview */}
      {item.task && (
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              item.task.type === "goal_task"
                ? "bg-violet-400/10 text-violet-400"
                : item.task.type === "event"
                  ? "bg-pink-400/10 text-pink-400"
                  : "bg-blue-400/10 text-blue-400"
            }`}
          >
            {TYPE_LABELS[item.task.type] ?? item.task.type}
          </span>
          <span className="text-sm font-medium text-foreground">
            {item.task.title}
          </span>
          <span className="text-[10px] text-muted">
            {PRIORITY_LABELS[item.task.priority] ?? "P" + item.task.priority}
            {" · "}
            {item.task.estimatedMins}m
            {" · "}
            {ENERGY_ICONS[item.task.energyLevel] ?? "����"}{" "}
            {item.task.energyLevel}
          </span>
          {item.task.recurring && (
            <span className="text-[10px] text-accent">
              ↻ {item.task.recurring}
            </span>
          )}
          {item.task.dueDate && (
            <span className="text-[10px] font-mono text-muted">
              due {item.task.dueDate}
            </span>
          )}
          {item.task.scheduledDate && (
            <span className="text-[10px] font-mono text-pink-400">
              {item.task.scheduledDate}
            </span>
          )}
        </div>
      )}

      {/* Explanation */}
      {item.explanation && (
        <p className="text-[11px] text-muted/70 italic">{item.explanation}</p>
      )}
    </div>
  );
}
