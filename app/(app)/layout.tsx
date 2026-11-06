import { AppShell } from "@/components/shell/app-shell";
import { LogoMark } from "@/components/shell/logo";
import { AppStoreProvider } from "@/lib/store/app-store";

// Layout for the signed-in app. The "(app)" folder is a route group: it
// doesn't appear in URLs, it just lets /login render without the shell.
// Access is enforced in /proxy.ts before any of these routes render.
//
// The store needs the browser's local date, so the server sends this light
// placeholder and the app renders immediately after hydration. That also
// means no user-specific content is ever prerendered or cached on the server.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <AppStoreProvider fallback={<AppLoading />}>
      <AppShell>{children}</AppShell>
    </AppStoreProvider>
  );
}

function AppLoading() {
  return (
    <div className="grid min-h-dvh place-items-center" role="status">
      <div className="flex flex-col items-center gap-3">
        <LogoMark className="h-10 w-10 animate-pulse" />
        <span className="text-sm text-subtle">Loading Lane&apos;s Lair…</span>
      </div>
    </div>
  );
}
