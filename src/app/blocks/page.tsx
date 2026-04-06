"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { BlockForm, type BlockFormData } from "@/components/blocks/BlockForm";
import { BlockCard } from "@/components/blocks/BlockCard";
import { useToast } from "@/components/layout/Toast";

interface Block {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  days: string;
  category: string;
  flexible: boolean;
  color: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function BlocksPage() {
  const { data: blocks, mutate } = useSWR<Block[]>("/api/blocks", fetcher);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BlockFormData | undefined>();
  const { toast } = useToast();

  const handleSubmit = useCallback(
    async (data: BlockFormData) => {
      try {
        if (data.id) {
          await fetch("/api/blocks", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          toast("Block updated");
        } else {
          await fetch("/api/blocks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          toast("Block created");
        }
        setShowForm(false);
        setEditing(undefined);
        mutate();
      } catch {
        toast("Failed to save block", "error");
      }
    },
    [mutate, toast]
  );

  const handleEdit = useCallback((block: Block) => {
    setEditing({
      id: block.id,
      name: block.name,
      startTime: block.startTime,
      endTime: block.endTime,
      days: block.days,
      category: block.category,
      flexible: block.flexible,
      color: block.color,
    });
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/blocks?id=${id}`, { method: "DELETE" });
        toast("Block deleted");
        mutate();
      } catch {
        toast("Failed to delete block", "error");
      }
    },
    [mutate, toast]
  );

  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditing(undefined);
  }, []);

  // Group blocks by category
  const grouped = (blocks ?? []).reduce<Record<string, Block[]>>(
    (acc, block) => {
      const cat = block.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(block);
      return acc;
    },
    {}
  );

  const categoryOrder = ["sleep", "exercise", "meal", "commute", "work", "routine"];
  const sortedCategories = Object.keys(grouped).sort(
    (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
  );

  const CATEGORY_LABELS: Record<string, string> = {
    sleep: "Sleep",
    meal: "Meals",
    exercise: "Exercise",
    commute: "Commute",
    work: "Work",
    routine: "Routine",
  };

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Daily Blocks</h1>
          <p className="text-muted text-sm mt-1">
            Define your non-negotiable routines and recurring time blocks
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => {
              setEditing(undefined);
              setShowForm(true);
            }}
            className="bg-accent hover:bg-accent/90 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            + Add Block
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-card rounded-xl border border-border p-6 mb-8 animate-fade-in-up">
          <h2 className="text-lg font-semibold mb-4">
            {editing?.id ? "Edit Block" : "New Block"}
          </h2>
          <BlockForm
            initial={editing}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </div>
      )}

      {!blocks ? (
        <LoadingSkeleton />
      ) : blocks.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center animate-fade-in">
          <div className="text-3xl mb-3">▦</div>
          <p className="text-foreground font-medium mb-1">No blocks defined yet</p>
          <p className="text-muted/60 text-xs">
            Add your daily routines like sleep, meals, workouts, and commute
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedCategories.map((cat) => (
            <div key={cat} className="animate-fade-in-up">
              <h2 className="text-sm font-medium text-muted uppercase tracking-wider mb-3">
                {CATEGORY_LABELS[cat] ?? cat}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {grouped[cat].map((block) => (
                  <BlockCard
                    key={block.id}
                    block={block}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-card rounded-xl border border-border p-6 animate-pulse-subtle"
        >
          <div className="h-4 bg-border/50 rounded w-1/3 mb-3" />
          <div className="h-3 bg-border/30 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}
