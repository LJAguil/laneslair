"use server";

// Server Actions for signing in and out. They run only on the server: the
// password goes straight to Supabase from here and the session cookies are
// written on the server response.
import type { AuthError } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "./redirect";

export interface SignInState {
  error: string | null;
  email: string;
}

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(formData.get("next"));

  if (!email || !password) {
    return { email, error: "Enter your email and password." };
  }

  let errorMessage: string | null = null;
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) errorMessage = friendlyAuthError(error);
  } catch {
    errorMessage = "Couldn't reach the sign-in service. Check your connection and Supabase settings, then try again.";
  }

  if (errorMessage) return { email, error: errorMessage };

  // redirect() throws to finish the action, so it must sit outside the try/catch.
  redirect(next);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

function friendlyAuthError(error: AuthError): string {
  switch (error.code) {
    case "invalid_credentials":
      return "That email and password don't match. Check them and try again.";
    case "email_not_confirmed":
      return "This email address hasn't been confirmed yet. Confirm it in Supabase, then try again.";
    case "user_banned":
      return "This account has been disabled.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Too many attempts. Wait a minute, then try again.";
  }
  if (error.status === 0 || error.name === "AuthRetryableFetchError") {
    return "Couldn't reach the sign-in service. Check your connection and try again.";
  }
  return "Sign-in failed. Please try again.";
}
