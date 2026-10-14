"use client";

import { PanelLeftClose, PanelLeftOpen, Plus, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LogoMark } from "./logo";
import { isActivePath, navItems, type NavItem } from "./nav-items";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onQuickAdd: () => void;
}

/** Desktop sidebar (lg and up). Collapses to an icon rail. */
export function Sidebar({ collapsed, onToggleCollapsed, onQuickAdd }: SidebarProps) {
  const pathname = usePathname();
  const settingsItem: NavItem = { href: "/settings", label: "Settings", shortLabel: "Settings", icon: Settings };

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-panel/60 transition-[width] duration-200 lg:flex",
        collapsed ? "w-[72px]" : "w-60",
      )}
    >
      <div className={cn("flex h-16 items-center gap-2.5 px-4", collapsed && "justify-center px-0")}>
        <Link href="/" className="flex items-center gap-2.5 rounded-lg" aria-label="Lane's Lair home">
          <LogoMark />
          {!collapsed && <span className="text-[15px] font-semibold tracking-tight">Lane&apos;s Lair</span>}
        </Link>
      </div>

      <div className={cn("px-3 pb-3", collapsed && "px-0 flex justify-center")}>
        <Button
          variant="primary"
          size={collapsed ? "icon" : "md"}
          className={cn(!collapsed && "w-full")}
          onClick={onQuickAdd}
          aria-label={collapsed ? "Quick add task" : undefined}
          title={collapsed ? "Quick add task" : undefined}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {!collapsed && "Quick add"}
        </Button>
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3">
        <ul className="space-y-0.5">
          {navItems.map((item) => (
            <li key={item.href}>
              <SidebarLink item={item} active={isActivePath(pathname, item.href)} collapsed={collapsed} />
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-0.5 border-t border-line p-3">
        <SidebarLink item={settingsItem} active={isActivePath(pathname, "/settings")} collapsed={collapsed} />
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : undefined}
          className={cn(
            "flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-subtle transition-colors hover:bg-hover hover:text-fg",
            collapsed && "justify-center px-0",
          )}
        >
          {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" aria-hidden="true" /> : <PanelLeftClose className="h-[18px] w-[18px]" aria-hidden="true" />}
          {!collapsed && "Collapse"}
        </button>
      </div>
    </aside>
  );
}

function SidebarLink({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? item.label : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
        collapsed && "justify-center px-0",
        active ? "bg-accent-soft text-fg" : "text-muted hover:bg-hover hover:text-fg",
      )}
    >
      {active && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent" />}
      <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-accent-strong" : "text-subtle group-hover:text-fg")} aria-hidden="true" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}
