/** Routes reachable without signing in. */
export const PUBLIC_PATHS = ["/login"] as const;

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Only allow redirects back to a path inside this app. Rejects absolute URLs,
 * protocol-relative URLs ("//evil.com") and backslash tricks, which would
 * otherwise turn `?next=` into an open redirect.
 */
export function safeNextPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  if (isPublicPath(value.split("?")[0])) return fallback;
  return value;
}
