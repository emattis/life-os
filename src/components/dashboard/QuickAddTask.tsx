"use client";

import { useState } from "react";

interface QuickAddTaskProps {
  onAdd: (title: string) => void;
}

export function QuickAddTask({ onAdd }: QuickAddTaskProps) {
  const [title, setTitle] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title.trim());
    setTitle("");
    setIsOpen(false);
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full bg-card rounded-xl border border-dashed border-border hover:border-accent/50 p-4 text-sm text-muted hover:text-accent transition-colors flex items-center justify-center gap-2"
      >
        <span className="text-lg">+</span> Quick add task
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card rounded-xl border border-accent/30 p-4 flex gap-2"
    >
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What needs to be done?"
        autoFocus
        className="flex-1 bg-transparent border-none text-sm text-foreground placeholder:text-muted focus:outline-none"
      />
      <button
        type="submit"
        className="px-3 py-1.5 bg-accent hover:bg-accent/90 text-white rounded-lg text-xs font-medium transition-colors"
      >
        Add
      </button>
      <button
        type="button"
        onClick={() => {
          setIsOpen(false);
          setTitle("");
        }}
        className="px-2 py-1.5 text-muted hover:text-foreground text-xs transition-colors"
      >
        Cancel
      </button>
    </form>
  );
}
