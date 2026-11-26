"use client";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { HabitRow } from "@/components/habits/habit-row";
import { useShell } from "@/components/shell/shell-context";
import { useAppState } from "@/lib/store/app-store";
import { defaultPreferences, sections, shortcuts, type Section, type Shortcut } from "@/lib/daily-preferences";
import { useDailyPreferences } from "./daily-preferences-provider";
const sectionLabels: Record<Section, string> = { capture: "Quick capture", habits: "Habits", reminders: "Next reminders", radar: "On your radar", play: "Daily puzzle", wrap: "Evening wrap-up" };
const shortcutLinks: Record<Shortcut, { label: string; href: string }> = {
  inbox: { label: "Capture", href: "/inbox" }, water: { label: "Log water / an amount", href: "/habits" }, journal: { label: "Journal", href: "/journal" }, casebook: { label: "Casebook", href: "/play/detective" }, tasks: { label: "Tasks", href: "/tasks" }, projects: { label: "Projects", href: "/projects" }, review: { label: "Weekly review", href: "/review" },
};
export function TodayShortcuts() {
  const prefs = useDailyPreferences(), { openQuickAdd } = useShell();
  const { habits, habitsStatus } = useAppState();
  const [logging, setLogging] = useState(false);
  const amounts = habits.filter(habit => habit.isActive && habit.trackingType === "quantity");
  return <>
    <nav aria-label="Your shortcuts" className="flex flex-wrap gap-2">{prefs.value.shortcuts.map(id => id === "inbox" ? <Button className="min-h-11" key={id} onClick={openQuickAdd}>Capture</Button> : id === "water" ? <Button className="min-h-11" key={id} onClick={() => setLogging(true)}>Log water / an amount</Button> : <Link key={id} href={shortcutLinks[id].href} className="inline-flex min-h-11 items-center rounded-lg border border-line px-3 text-sm text-accent-strong hover:bg-hover">{shortcutLinks[id].label}</Link>)}</nav>
    <Dialog open={logging} onClose={() => setLogging(false)} title="Log water or another amount" description="Choose one of your quantity habits. Targets are your own.">
      {habitsStatus !== "ready" ? <p role="status" className="text-sm text-muted">Habits haven’t loaded successfully. Retry on the Habits page.</p> : amounts.length ? <ul className="divide-y divide-line">{amounts.map(habit => <HabitRow key={habit.id} habit={habit} />)}</ul> : <p className="text-sm text-muted">Create a quantity habit for water or another amount first.</p>}
      <Link href="/habits" onClick={() => setLogging(false)} className="mt-3 inline-flex min-h-11 items-center text-sm text-accent-strong underline">Manage habits</Link>
    </Dialog>
  </>;
}
export function TodayCustomization() {
  const prefs = useDailyPreferences(), { today } = useAppState();
  return <details className="rounded-xl border border-line bg-panel p-4"><summary className="cursor-pointer text-sm text-muted">Customize Today</summary><div className="mt-4 space-y-4">
    <p role="status" className="text-xs text-muted">{!prefs.ready ? "Checking your preferences…" : prefs.durable ? "Changes save on this browser for this account." : "Storage unavailable. Changes last for this session."} Your focus and planning stay visible.</p>
    <fieldset disabled={!prefs.ready}><legend className="mb-2 text-sm font-medium">Shortcuts</legend><div className="flex flex-wrap gap-x-5 gap-y-1">{shortcuts.map(id => <label key={id} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={prefs.value.shortcuts.includes(id)} onChange={event => prefs.update({ shortcuts: event.target.checked ? [...prefs.value.shortcuts, id] : prefs.value.shortcuts.filter(value => value !== id) })} />{shortcutLinks[id].label}</label>)}</div></fieldset>
    <fieldset disabled={!prefs.ready}><legend className="mb-2 text-sm font-medium">Today sections</legend><div className="flex flex-wrap gap-x-5 gap-y-1">{sections.map(id => <label key={id} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={!prefs.value.hidden.includes(id)} onChange={event => prefs.update({ hidden: event.target.checked ? prefs.value.hidden.filter(value => value !== id) : [...prefs.value.hidden, id] })} />{sectionLabels[id]}</label>)}</div></fieldset>
    <Button className="min-h-11" disabled={!prefs.ready} onClick={() => { const defaults = defaultPreferences(today); prefs.update({ shortcuts: defaults.shortcuts, hidden: defaults.hidden }); }}>Reset layout</Button>
  </div></details>;
}
