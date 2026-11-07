"use client";

import { Bell, Globe, Palette, User } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { ThemePicker } from "@/components/theme/theme-picker";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { useAppActions, useAppState } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";

const TIME_ZONES = [
  { value: "America/Los_Angeles", label: "Pacific Time (Los Angeles)" },
  { value: "America/Denver", label: "Mountain Time (Denver)" },
  { value: "America/Chicago", label: "Central Time (Chicago)" },
  { value: "America/New_York", label: "Eastern Time (New York)" },
  { value: "Europe/London", label: "London" },
  { value: "Asia/Tokyo", label: "Tokyo" },
];

export function SettingsView() {
  return (
    <>
      <PageHeader title="Settings" description="Make the Lair yours. Themes stay saved on this browser; profile and notification controls are still session-only prototypes." />
      <div className="mx-auto max-w-3xl space-y-5">
        <ProfileSection />
        <AppearanceSection />
        <TimeZoneSection />
        <NotificationSection />
      </div>
    </>
  );
}

function Section({ id, title, description, icon, children }: { id: string; title: string; description: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Card id={id} className="scroll-mt-24">
      <CardHeader title={title} description={description} icon={icon} />
      {children}
    </Card>
  );
}

function ProfileSection() {
  const { profile } = useAppState();
  const { updateProfile } = useAppActions();
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [saved, setSaved] = useState(false);
  const dirty = name.trim() !== profile.name || email.trim() !== profile.email;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    updateProfile({ name: name.trim(), email: email.trim() });
    setSaved(true);
  }

  return (
    <Section id="profile" title="Profile" description="How you appear around the app." icon={<User className="h-[18px] w-[18px]" />}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Display name" htmlFor="profile-name">
            <Input id="profile-name" value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} required />
          </Field>
          <Field label="Email" htmlFor="profile-email">
            <Input id="profile-email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setSaved(false); }} />
          </Field>
        </div>
        <div className="flex items-center justify-end gap-3">
          <p className="text-sm text-success" aria-live="polite">{saved && !dirty ? "Saved" : ""}</p>
          <Button type="submit" variant="primary" disabled={!dirty || !name.trim()}>
            Save profile
          </Button>
        </div>
      </form>
    </Section>
  );
}

function AppearanceSection() {
  return (
    <Section id="appearance" title="Appearance" description="A familiar layout, a different atmosphere." icon={<Palette className="h-[18px] w-[18px]" />}>
      <ThemePicker />
    </Section>
  );
}

function TimeZoneSection() {
  const { profile } = useAppState();
  const { updateProfile } = useAppActions();
  return (
    <Section id="timezone" title="Time zone" description="Prototype preference. Tasks and habits currently follow this device’s time zone." icon={<Globe className="h-[18px] w-[18px]" />}>
      <Field label="Time zone" htmlFor="tz" hint="Kept for this session only; it does not change the device’s tracking date.">
        <Select id="tz" value={profile.timeZone} onChange={(e) => updateProfile({ timeZone: e.target.value })} className="sm:max-w-sm">
          {TIME_ZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </Select>
      </Field>
    </Section>
  );
}

const NOTIFICATION_PREFS = [
  { id: "reminders", label: "Task reminders", description: "Due today and overdue tasks." },
  { id: "habits", label: "Habit nudges", description: "An evening reminder if you haven't checked in." },
  { id: "events", label: "Saved event alerts", description: "The day before a saved event." },
  { id: "digest", label: "Weekly digest email", description: "Sunday summary of local events." },
] as const;

function NotificationSection() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({ reminders: true, habits: true, events: true, digest: false });
  return (
    <Section id="notifications" title="Notifications" description="Choose what Lane's Lair tells you about." icon={<Bell className="h-[18px] w-[18px]" />}>
      <ul className="divide-y divide-line/70">
        {NOTIFICATION_PREFS.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <div>
              <p id={`pref-${p.id}`} className="text-sm font-medium">{p.label}</p>
              <p className="text-xs text-subtle">{p.description}</p>
            </div>
            <Switch checked={prefs[p.id]} labelledBy={`pref-${p.id}`} onChange={() => setPrefs((s) => ({ ...s, [p.id]: !s[p.id] }))} />
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Switch({ checked, onChange, labelledBy }: { checked: boolean; onChange: () => void; labelledBy: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      onClick={onChange}
      className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-accent" : "bg-line-strong")}
    >
      <span
        aria-hidden="true"
        className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-fg shadow transition-transform", checked ? "translate-x-[22px]" : "translate-x-0.5")}
      />
    </button>
  );
}
