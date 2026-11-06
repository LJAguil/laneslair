"use client";

import { Loader2, LogOut } from "lucide-react";
import { useFormStatus } from "react-dom";
import { signOut } from "@/lib/auth/actions";

/** Submits the signOut Server Action, which clears the session and redirects to /login. */
export function SignOutButton() {
  return (
    <form action={signOut}>
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm text-muted transition-colors hover:bg-hover hover:text-fg disabled:opacity-60"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LogOut className="h-4 w-4" aria-hidden="true" />}
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
