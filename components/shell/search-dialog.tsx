"use client";

import { CalendarDays, FolderKanban, ListChecks, Search, Target, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { useAppState } from "@/lib/store/app-store";
import { navItems } from "./nav-items";

interface SearchResult {
  id: string;
  label: string;
  meta: string;
  href: string;
  icon: LucideIcon;
}

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Search" description="Find tasks, projects, habits, events, and pages." className="max-w-xl">
      <SearchPanel onNavigate={onClose} />
    </Dialog>
  );
}

function SearchPanel({ onNavigate }: { onNavigate: () => void }) {
  const { tasks, projects, habits, events } = useAppState();
  const [query, setQuery] = useState("");
  const inputId = useId();

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return navItems.map((n) => ({ id: n.href, label: n.label, meta: "Page", href: n.href, icon: n.icon }));
    }
    const match = (s: string) => s.toLowerCase().includes(q);
    return [
      ...tasks.filter((t) => match(t.title)).map((t) => ({ id: t.id, label: t.title, meta: "Task", href: "/tasks", icon: ListChecks })),
      ...projects.filter((p) => match(p.name)).map((p) => ({ id: p.id, label: p.name, meta: "Project", href: "/projects", icon: FolderKanban })),
      ...habits.filter((h) => match(h.name)).map((h) => ({ id: h.id, label: h.name, meta: "Habit", href: "/habits", icon: Target })),
      ...events.filter((e) => match(e.title) || match(e.venue)).map((e) => ({ id: e.id, label: e.title, meta: "Event", href: "/discover", icon: CalendarDays })),
    ].slice(0, 12);
  }, [query, tasks, projects, habits, events]);

  return (
    <div>
      <label htmlFor={inputId} className="sr-only">
        Search Lane&apos;s Lair
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type to search…"
          autoFocus
          className="h-11 w-full rounded-lg border border-line bg-raised pl-9 pr-3 text-sm text-fg placeholder:text-subtle focus-visible:border-accent"
        />
      </div>
      <p className="sr-only" aria-live="polite">
        {results.length} results
      </p>
      <ul className="mt-3 max-h-80 overflow-y-auto">
        {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-subtle">No matches for “{query}”.</li>}
        {results.map((r) => {
          const Icon = r.icon;
          return (
            <li key={`${r.meta}-${r.id}`}>
              <Link
                href={r.href}
                onClick={onNavigate}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-hover"
              >
                <Icon className="h-4 w-4 shrink-0 text-subtle" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-fg">{r.label}</span>
                <span className="text-xs text-subtle">{r.meta}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
