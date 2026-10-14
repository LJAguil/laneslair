import { Bot, Compass, FolderKanban, LayoutDashboard, ListChecks, Target, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  /** Shorter label for the mobile bottom bar. */
  shortLabel: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", shortLabel: "Home", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", shortLabel: "Tasks", icon: ListChecks },
  { href: "/projects", label: "Projects", shortLabel: "Projects", icon: FolderKanban },
  { href: "/habits", label: "Habits & Goals", shortLabel: "Habits", icon: Target },
  { href: "/discover", label: "Discover", shortLabel: "Discover", icon: Compass },
  { href: "/assistant", label: "AI Assistant", shortLabel: "AI", icon: Bot },
];

export function isActivePath(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
