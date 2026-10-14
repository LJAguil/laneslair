"use client";

import { Bell, CalendarHeart, Clock, Flame, FolderKanban, Info, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Popover } from "@/components/ui/popover";
import { formatDueLabel, formatTime } from "@/lib/dates";
import { useAppActions, useAppState } from "@/lib/store/app-store";
import type { NotificationKind } from "@/lib/types";
import { cn } from "@/lib/utils";

const kindIcon: Record<NotificationKind, LucideIcon> = {
  reminder: Clock,
  habit: Flame,
  event: CalendarHeart,
  project: FolderKanban,
  system: Info,
};

export function NotificationCenter() {
  const { notifications } = useAppState();
  const { markNotificationRead, markAllNotificationsRead } = useAppActions();
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <Popover
      label={unread ? `Notifications, ${unread} unread` : "Notifications"}
      trigger={
        <>
          <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
          {unread > 0 && (
            <span
              aria-hidden="true"
              className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-on-accent"
            >
              {unread}
            </span>
          )}
        </>
      }
      triggerClassName="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted transition-colors hover:bg-hover hover:text-fg"
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold">Notifications</h2>
            <button
              type="button"
              onClick={markAllNotificationsRead}
              disabled={unread === 0}
              className="rounded text-xs font-medium text-accent-strong hover:underline disabled:text-subtle disabled:no-underline"
            >
              Mark all read
            </button>
          </div>
          <ul className="max-h-96 overflow-y-auto py-1">
            {notifications.map((n) => {
              const Icon = kindIcon[n.kind];
              const content = (
                <>
                  <span className={cn("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg", n.read ? "bg-raised text-subtle" : "bg-accent-soft text-accent-strong")}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className={cn("truncate text-sm", n.read ? "text-muted" : "font-medium text-fg")}>{n.title}</span>
                      {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent"><span className="sr-only">Unread</span></span>}
                    </span>
                    <span className="block text-sm text-subtle">{n.body}</span>
                    <span className="mt-0.5 block text-xs text-subtle">
                      {formatDueLabel(n.createdAt.slice(0, 10))} · {formatTime(n.createdAt)}
                    </span>
                  </span>
                </>
              );
              const rowClass = "flex w-full gap-3 px-4 py-2.5 text-left transition-colors hover:bg-hover";
              return (
                <li key={n.id}>
                  {n.href ? (
                    <Link
                      href={n.href}
                      className={rowClass}
                      onClick={() => {
                        markNotificationRead(n.id);
                        close();
                      }}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className={rowClass}>{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Popover>
  );
}
