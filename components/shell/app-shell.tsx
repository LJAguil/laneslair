"use client";

import { CheckCircle2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { MobileNav } from "./mobile-nav";
import { SearchDialog } from "./search-dialog";
import { ShellContext } from "./shell-context";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const openQuickAdd = useCallback(() => setQuickAddOpen(true), []);
  const openSearch = useCallback(() => setSearchOpen(true), []);
  const controls = useMemo(() => ({ openQuickAdd, openSearch }), [openQuickAdd, openSearch]);

  // Ctrl/Cmd + K opens global search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <ShellContext.Provider value={controls}>
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-on-accent focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <div className="flex min-h-dvh">
        <Sidebar collapsed={collapsed} onToggleCollapsed={() => setCollapsed((c) => !c)} onQuickAdd={openQuickAdd} />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar onSearch={openSearch} onQuickAdd={openQuickAdd} />
          <main id="main" tabIndex={-1} className="flex-1 px-4 pb-28 pt-6 outline-none sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
      <MobileNav />

      <TaskFormDialog open={quickAddOpen} onClose={() => setQuickAddOpen(false)} onCreated={(title) => setToast(`Added “${title}”`)} />
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 lg:bottom-6">
        {toast && (
          <div className="flex items-center gap-2 rounded-xl border border-line bg-raised px-4 py-2.5 text-sm text-fg shadow-xl shadow-black/40">
            <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
            {toast}
          </div>
        )}
      </div>
    </ShellContext.Provider>
  );
}
