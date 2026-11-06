// Public Supabase settings. Both values are safe to ship to the browser:
// the publishable key only grants what Row Level Security allows.
// They must be read as literal `process.env.NEXT_PUBLIC_*` expressions so
// Next.js can inline them into client bundles at build time.

export function getSupabaseEnv(): { url: string; publishableKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error(
      "Missing Supabase settings. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local, then restart the dev server.",
    );
  }
  return { url, publishableKey };
}
