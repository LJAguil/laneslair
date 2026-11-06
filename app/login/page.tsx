import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { LogoMark } from "@/components/shell/logo";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoMark className="h-10 w-10" />
          <h1 className="mt-4 text-xl font-semibold tracking-tight">Sign in to Lane&apos;s Lair</h1>
          <p className="mt-1 text-sm text-muted">Your personal command center.</p>
        </div>
        <div className="rounded-2xl border border-line bg-panel p-6">
          {/* The form reads ?next= from the URL, which is only known at request time. */}
          <Suspense fallback={<div className="h-56" aria-hidden="true" />}>
            <LoginForm />
          </Suspense>
        </div>
        <p className="mt-4 text-center text-xs text-subtle">Personal app — accounts are created by the owner.</p>
      </div>
    </main>
  );
}
