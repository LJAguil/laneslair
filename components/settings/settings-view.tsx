"use client";

import { Palette, User } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { ThemePicker } from "@/components/theme/theme-picker";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { useAppActions, useAppState } from "@/lib/store/app-store";
import { PushSettings } from "./push-settings";

export function SettingsView() {
  return (
    <>
      <PageHeader title="Settings" description="Make the Lair yours. Themes stay on this browser; reminder settings sync across your devices. Profile controls remain a prototype." />
      <div className="mx-auto max-w-3xl space-y-5">
        <ProfileSection />
        <AppearanceSection />
        <PushSettings />
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
