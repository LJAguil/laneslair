"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * The signed-in user's email, for display only (e.g. "Signed in as …").
 * Access control never relies on this; proxy.ts verifies the session server-side.
 */
export function useSignedInEmail(): string | null {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    createClient()
      .auth.getClaims()
      .then(({ data }) => {
        const value = data?.claims?.email;
        if (active) setEmail(typeof value === "string" ? value : null);
      })
      .catch(() => {
        // Display-only; leave the email blank if it can't be read.
      });
    return () => {
      active = false;
    };
  }, []);

  return email;
}
