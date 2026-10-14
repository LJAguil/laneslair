"use client";

import { Bell, Globe, Palette, User } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
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
      <PageHeader title="Settings" description="Changes last for this browser session only — accounts arrive in a later phase." />
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
    <Section id="appearance" title="Appearance" description="Lane's Lair is dark-first. More options are planned." icon={<Palette className="h-[18px] w-[18px]" />}>
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-muted">Theme</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { value: "dark", label: "Dark", hint: "Current theme", available: true },
            { value: "light", label: "Light", hint: "Coming soon", available: false },
          ].map((opt) => (
            <label
              key={opt.value}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3 text-sm",
                opt.available ? "cursor-pointer border-accent/40 bg-accent-soft" : "cursor-not-allowed border-line opacity-60",
              )}
            >
              <input type="radio" name="theme" value={opt.value} defaultChecked={opt.available} disabled={!opt.available} className="accent-[var(--color-accent)]" />
              <span>
                <span className="block font-medium">{opt.label}</span>
                <span className="block text-xs text-subtle">{opt.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </Section>
  );
}

function TimeZoneSection() {
  const { profile } = useAppState();
  const { updateProfile } = useAppActions();
  return (
    <Section id="timezone" title="Time zone" description="Used for due dates, reminders, and event times." icon={<Globe className="h-[18px] w-[18px]" />}>
      <Field label="Time zone" htmlFor="tz" hint="Saved as soon as you pick one.">
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
