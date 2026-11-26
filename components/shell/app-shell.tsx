"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { CaptureDialog } from "@/components/inbox/capture-form";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { useAppActions, useAppState } from "@/lib/store/app-store";
import { NoticeMessage } from "./notice-message";
import { DailyPreferencesProvider } from "@/components/today/daily-preferences-provider";
import { KeyboardControls } from "@/components/ui/keyboard-controls";
import { ViewportSync } from "./viewport-sync";
import { MobileNav } from "./mobile-nav";
import { SearchDialog } from "./search-dialog";
import { ShellContext } from "./shell-context";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { ReminderProvider } from "@/components/reminders/reminder-provider";
import { PlayProvider } from "@/components/play/play-provider";
import { JournalDraftGuard } from "@/components/journal/journal-draft-guard";
import { CaptureDraftProvider } from "@/components/inbox/capture-draft-provider";

export function AppShell({ children }: { children: ReactNode }) {
  return <CaptureDraftProvider><DailyPreferencesProvider><ReminderProvider><PlayProvider><AppShellContent>{children}</AppShellContent></PlayProvider></ReminderProvider></DailyPreferencesProvider></CaptureDraftProvider>;
}

function AppShellContent({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { notice } = useAppState();
  const { notify, dismissNotice } = useAppActions();

  const openQuickAdd = useCallback(() => setQuickAddOpen(true), []);
  const openNewTask = useCallback(() => setNewTaskOpen(true), []);
  const openSearch = useCallback(() => setSearchOpen(true), []);
  const controls = useMemo(() => ({ openQuickAdd, openSearch, openNewTask }), [openQuickAdd, openSearch, openNewTask]);

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


  return (
    <ShellContext.Provider value={controls}>
      <ViewportSync />
      <JournalDraftGuard />
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
          <main id="main" tabIndex={-1} className="app-main flex-1 px-4 pb-28 pt-6 outline-none sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
      <MobileNav />
      <KeyboardControls />

      <CaptureDialog open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
      <TaskFormDialog open={newTaskOpen} onClose={() => setNewTaskOpen(false)} onCreated={(title) => notify("success", `Added “${title}”`)} />
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />

      <div aria-live="polite" className="app-toast pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 lg:bottom-6">
        {notice && <NoticeMessage key={notice.id} notice={notice} dismiss={() => dismissNotice(notice.id)} />}
      </div>
    </ShellContext.Provider>
  );
}
