import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { repository } from "@/lib/entertainment/repository";
import { guardState } from "./client";
import { makePlan, runChecks, verifyRefresh, type CheckResult, type RefreshReceipt } from "./checks";

const receiptKey = "lanes-lair.entertainment.hosted-check.receipt.v1";
const page = String(performance.timeOrigin);
function readReceipt(): RefreshReceipt | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(receiptKey) ?? "null");
    return value?.version === 1 && Array.isArray(value.expected) ? value : null;
  } catch { return null; }
}
export function HostedCheckPanel({ owner, onBusy, onFinished }: { owner: string; onBusy: (busy: boolean) => void; onFinished: () => void }) {
  const [results, setResults] = useState<CheckResult[]>([]);
  const [receipt, setReceipt] = useState(readReceipt);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const token = useRef(0), submitting = useRef(false);
  useEffect(() => () => { token.current++; onBusy(false); }, [onBusy]);
  async function perform(refreshOnly: boolean) {
    if (submitting.current) return;
    submitting.current = true; const run = ++token.current;
    const current = () => token.current === run;
    setBusy(true); onBusy(true); setMessage("");
    try {
      if (refreshOnly) {
        if (!receipt) return;
        await verifyRefresh(repository(owner), receipt, page);
        if (current()) setMessage("PASS: all three invented titles match their saved values after this page refresh.");
      } else {
        setResults([]); setReceipt(null); sessionStorage.removeItem(receiptKey);
        const expected = await runChecks({ repository: repository(owner), owner, plan: makePlan(), armFault: fault => { guardState.fault = fault; }, isCurrent: current,
          report: result => { if (current()) setResults(rows => [...rows.filter(row => row.label !== result.label), result]); } });
        if (current()) {
          const next: RefreshReceipt = { version: 1, page, expected };
          sessionStorage.setItem(receiptKey, JSON.stringify(next)); setReceipt(next);
          setMessage("Save/retry checks passed. Refresh this browser tab, then click Verify after page refresh. Three invented records remain; none were deleted.");
        }
      }
    } catch { if (current()) setMessage("Check stopped or did not match. Inspect the failed step and connection. No hosted pass is claimed; any partial test titles remain in the scoped library below."); }
    finally {
      guardState.fault = "none";
      if (current()) { submitting.current = false; setBusy(false); onBusy(false); onFinished(); }
    }
  }
  return <section className="space-y-3 rounded-xl border border-line bg-panel p-4" aria-label="Hosted repository checks">
    <h2 className="font-semibold">Run the hosted save and retry checks</h2>
    <p className="text-sm text-muted">This explicitly writes three invented titles to your existing account, cycles their statuses, tests failed/lost-response retries and restores an archived game. It does not delete records. Other personal records stay outside the test scope.</p>
    <div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => void perform(false)}>Run hosted checks</Button><Button disabled={busy || !receipt || receipt.page === page} onClick={() => void perform(true)}>Verify after page refresh</Button></div>
    {receipt?.page === page && <p className="text-sm text-muted">A real page refresh is required before the final read-only check.</p>}
    {receipt && receipt.page !== page && <p className="text-sm text-muted">A previous test receipt is ready for read-only verification. Use the same existing account.</p>}
    <ol className="space-y-1 text-sm" aria-live="polite">{results.map(result => <li key={result.label}>{result.status.toUpperCase()}: {result.label}</li>)}</ol>
    {message && <p role="status" className="text-sm">{message}</p>}
    <p className="text-xs text-subtle">A hosted pass appears only after the checks actually run. This page does not test the Next route, physical Safari keyboard or installed PWA.</p>
  </section>;
}
