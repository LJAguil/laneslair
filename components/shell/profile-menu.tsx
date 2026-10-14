"use client";

import { Bell, Globe, Palette, User } from "lucide-react";
import Link from "next/link";
import { Popover } from "@/components/ui/popover";
import { useAppState } from "@/lib/store/app-store";

const links = [
  { href: "/settings#profile", label: "Profile", icon: User },
  { href: "/settings#appearance", label: "Appearance", icon: Palette },
  { href: "/settings#timezone", label: "Time zone", icon: Globe },
  { href: "/settings#notifications", label: "Notification preferences", icon: Bell },
];

export function ProfileMenu() {
  const { profile } = useAppState();
  const initial = profile.name.charAt(0).toUpperCase();

  return (
    <Popover
      label="Profile and settings"
      trigger={
        <span className="grid h-8 w-8 place-items-center rounded-full bg-raised text-sm font-semibold text-fg ring-1 ring-line-strong">
          {initial}
        </span>
      }
      triggerClassName="inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-hover"
      panelClassName="w-64"
    >
      {(close) => (
        <div>
          <div className="border-b border-line px-4 py-3">
            <p className="text-sm font-medium">{profile.name}</p>
            <p className="truncate text-xs text-subtle">{profile.email}</p>
          </div>
          <ul className="p-1.5">
            {links.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={close}
                  className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm text-muted transition-colors hover:bg-hover hover:text-fg"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="border-t border-line px-4 py-2.5 text-xs text-subtle">Prototype · sign-in coming in a later phase</p>
        </div>
      )}
    </Popover>
  );
}
