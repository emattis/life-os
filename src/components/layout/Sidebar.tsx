"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard", icon: "◉" },
  { href: "/tasks", label: "Tasks", icon: "☑" },
  { href: "/goals", label: "Goals", icon: "◎" },
  { href: "/blocks", label: "Blocks", icon: "▦" },
  { href: "/optimize", label: "Optimize", icon: "✦" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border flex flex-col">
      <div className="p-6">
        <h1 className="text-xl font-bold text-accent">Life OS</h1>
        <p className="text-sm text-muted mt-1">Daily Optimizer</p>
      </div>
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-accent/10 text-accent"
                  : "text-muted hover:text-foreground hover:bg-white/5"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
