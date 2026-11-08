import { BarChart3, BookOpen, Bot, ChartNoAxesCombined, Compass, FolderKanban, Inbox, KeyRound, LayoutDashboard, ListChecks, Target, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  /** Shorter label for the mobile bottom bar. */
  shortLabel: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { href: "/", label: "Today", shortLabel: "Today", icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", shortLabel: "Inbox", icon: Inbox },
  { href: "/tasks", label: "Tasks", shortLabel: "Tasks", icon: ListChecks },
  { href: "/projects", label: "Projects", shortLabel: "Projects", icon: FolderKanban },
  { href: "/journal", label: "Journal", shortLabel: "Journal", icon: BookOpen },
  { href: "/overview", label: "Overview", shortLabel: "Overview", icon: BarChart3 },
  { href: "/statistics", label: "Statistics", shortLabel: "Stats", icon: ChartNoAxesCombined },
  { href: "/habits", label: "Habits & Goals", shortLabel: "Habits", icon: Target },
  { href: "/play", label: "Daily Play", shortLabel: "Play", icon: KeyRound },
  { href: "/discover", label: "Discover", shortLabel: "Discover", icon: Compass },
  { href: "/assistant", label: "AI Assistant", shortLabel: "AI", icon: Bot },
];

export function isActivePath(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
