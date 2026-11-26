export interface UndoAction { expiresAt: number; run: () => Promise<void> }
/** One compensating action at a time; retryable errors never claim success. */
export function undoAction(work: () => Promise<void>, clock = () => Date.now()): UndoAction {
  const expiresAt = clock() + 15000;
  let busy = false, used = false;
  return { expiresAt, async run() {
    if (used || busy || clock() > expiresAt) throw new Error("Undo has expired or is already running.");
    busy = true;
    try { await work(); used = true; } finally { busy = false; }
  } };
}
export type Notify = (kind: "success" | "error", message: string, undo?: UndoAction) => void;
