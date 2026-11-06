"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { signIn, type SignInState } from "@/lib/auth/actions";

const initialState: SignInState = { error: null, email: "" };

export function LoginForm() {
  const next = useSearchParams().get("next") ?? "/";
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />

      {state.error && (
        <div role="alert" className="flex gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {state.error}
        </div>
      )}

      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={state.email}
          required
          autoFocus
          aria-invalid={!!state.error}
        />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required aria-invalid={!!state.error} />
      </Field>

      <Button type="submit" variant="primary" className="w-full" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
