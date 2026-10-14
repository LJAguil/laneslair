"use client";

import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoMark } from "./logo";
import { NotificationCenter } from "./notification-center";
import { ProfileMenu } from "./profile-menu";

interface TopBarProps {
  onSearch: () => void;
  onQuickAdd: () => void;
}

export function TopBar({ onSearch, onQuickAdd }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line bg-canvas/85 px-4 backdrop-blur sm:px-6 lg:px-8">
      <Link href="/" className="mr-1 flex items-center gap-2 rounded-lg lg:hidden" aria-label="Lane's Lair home">
        <LogoMark />
        <span className="hidden text-[15px] font-semibold tracking-tight sm:inline">Lane&apos;s Lair</span>
      </Link>

      <button
        type="button"
        onClick={onSearch}
        className="ml-auto flex h-10 items-center gap-2 rounded-lg border border-line bg-panel px-3 text-sm text-subtle transition-colors hover:border-line-strong hover:text-muted sm:w-72 lg:ml-0 lg:w-80"
        aria-label="Search (Ctrl+K)"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Search everything…</span>
        <kbd className="ml-auto hidden rounded border border-line bg-raised px-1.5 py-0.5 font-sans text-[11px] text-subtle sm:inline">Ctrl K</kbd>
      </button>

      <div className="flex items-center gap-1 lg:ml-auto">
        {/* Wrappers carry the responsive display rules so they don't fight the button's own inline-flex. */}
        <span className="hidden sm:block lg:hidden">
          <Button variant="primary" onClick={onQuickAdd} size="sm">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add
          </Button>
        </span>
        <span className="sm:hidden">
          <Button variant="primary" size="icon-sm" onClick={onQuickAdd} aria-label="Quick add task">
            <Plus className="h-4 w-4" aria-hidden="true" />
          </Button>
        </span>
        <NotificationCenter />
        <ProfileMenu />
      </div>
    </header>
  );
}
