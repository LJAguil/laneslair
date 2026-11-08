"use client";

import { MoreHorizontal, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import { isActivePath, navItems } from "./nav-items";

/** Four daily destinations plus a keyboard-accessible menu for every other page. */
export function MobileNav() {
  const pathname = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);
  const primary = navItems.slice(0, 4);
  const extra = [...navItems.slice(4), { href: "/settings", label: "Settings", shortLabel: "Settings", icon: Settings }];
  const moreActive = extra.some((item) => isActivePath(pathname, item.href));
  return (
    <nav aria-label="Main" className="mobile-navigation fixed inset-x-0 bottom-0 z-40 border-t border-line bg-panel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="mx-auto grid max-w-2xl grid-cols-5">
        {primary.map((item) => {
          const active = isActivePath(pathname, item.href);
          const Icon = item.icon;
          return <li key={item.href}><Link href={item.href} aria-current={active ? "page" : undefined} aria-label={item.label}
            onClick={() => { if (menu.current) menu.current.open = false; }}
            className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium", active ? "text-accent-strong" : "text-subtle hover:text-fg")}>
            <Icon className="h-5 w-5" aria-hidden="true" /><span aria-hidden="true">{item.shortLabel}</span>
          </Link></li>;
        })}
        <li>
          <details ref={menu} className="relative" onKeyDown={(e) => { if (e.key === "Escape" && menu.current) { menu.current.open = false; menu.current.querySelector("summary")?.focus(); } }}>
            <summary className={cn("flex h-16 cursor-pointer list-none flex-col items-center justify-center gap-1 text-[11px] font-medium [&::-webkit-details-marker]:hidden", moreActive ? "text-accent-strong" : "text-subtle")}>
              <MoreHorizontal className="h-5 w-5" aria-hidden="true" />More
            </summary>
            <ul className="absolute bottom-full right-2 mb-3 max-h-[60dvh] w-56 overflow-y-auto rounded-xl border border-line bg-panel p-2 shadow-xl">
              {extra.map(({ href, label, icon: Icon }) => <li key={href}><Link href={href} aria-current={isActivePath(pathname, href) ? "page" : undefined}
                onClick={() => { if (menu.current) menu.current.open = false; }} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-muted hover:bg-hover hover:text-fg">
                <Icon className="h-4 w-4" aria-hidden="true" />{label}
              </Link></li>)}
            </ul>
          </details>
        </li>
      </ul>
    </nav>
  );
}
