import { StrictMode, useEffect, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import { EntertainmentView } from "@/components/entertainment/entertainment-view";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { createClient, guardState } from "./client";
import { TEST_PREFIX } from "./guard";
import { HostedCheckPanel } from "./check-panel";
function HostedCheck() {
  const [owner, setOwner] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const [automatedBusy, setAutomatedBusy] = useState(false);
  useEffect(() => {
    let live = true;
    const client = createClient();
    void client.auth.getUser().then(({ data }) => { if (live) { setOwner(data.user?.id ?? null); setChecking(false); } });
    const { data } = client.auth.onAuthStateChange((_event, session) => { if (live) { setOwner(session?.user.id ?? null); setChecking(false); } });
    return () => { live = false; data.subscription.unsubscribe(); };
  }, []);
  async function signIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget, fields = new FormData(form); setError(""); setChecking(true);
    try {
      const { error } = await createClient().auth.signInWithPassword({ email: String(fields.get("email") ?? ""), password: String(fields.get("password") ?? "") });
      if (error) setError("Sign-in failed. Check your existing account details and connection.");
    } catch { setError("Could not connect to sign in. Try again."); }
    finally { form.reset(); setChecking(false); }
  }
  return <main className="mx-auto max-w-3xl space-y-5 px-4 py-5"><aside className="space-y-3 rounded-xl border border-warning p-4 text-sm"><h1 className="text-lg font-semibold">Hosted Entertainment acceptance</h1><p>Local test page · real existing Supabase project · only this tab’s synthetic Entertainment IDs. Other tables and RPCs are blocked. No journal, Inbox, habits or tasks are loaded.</p><p>Use invented titles starting with <strong>{TEST_PREFIX}</strong>. Saves are real account-owned cloud writes. No account creation, provider, paid service or deployment.</p><p role="status">{checking ? "Checking existing sign-in…" : owner ? "Existing account signed in. Only scoped test titles are shown below." : "Sign in with your existing Lane’s Lair account to continue."}</p>{notice && <p role="status">{notice}</p>}
    {owner && <fieldset disabled={automatedBusy} className="flex flex-wrap gap-2"><Button onClick={() => { guardState.fault = "fail_save"; setNotice("Next save will fail before writing."); }}>Fail next test save</Button><Button onClick={() => { guardState.fault = "lose_response"; setNotice("Next successful save response will be hidden; retry the same title."); }}>Lose next test response</Button><Button onClick={() => setRevision(r => r + 1)}>Reload saved test titles</Button></fieldset>}
  </aside>{error && <p role="alert">{error}</p>}
    {!owner && <form onSubmit={signIn} className="mx-auto max-w-sm space-y-4 rounded-xl border border-line bg-panel p-4"><h2 className="font-semibold">Existing account sign-in</h2><p className="text-sm text-muted">Enter credentials here yourself. They go only to your existing Supabase Auth service; do not send them in chat.</p><Field label="Email" htmlFor="hosted-email"><Input id="hosted-email" type="email" name="email" required autoComplete="username" /></Field><Field label="Password" htmlFor="hosted-password"><Input id="hosted-password" type="password" name="password" required autoComplete="current-password" /></Field><Button type="submit" disabled={checking} variant="primary">Sign in</Button></form>}
    {owner && <HostedCheckPanel key={owner} owner={owner} onBusy={setAutomatedBusy} onFinished={() => setRevision(r => r + 1)} />}
    {owner && <fieldset disabled={automatedBusy} className="min-w-0"><EntertainmentView key={`${owner}-${revision}`} userId={owner} /></fieldset>}
  </main>;
}
createRoot(document.getElementById("root")!).render(<StrictMode><HostedCheck /></StrictMode>);
