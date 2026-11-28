# Personal goals

The Goals section on **Habits & Goals** now uses the signed-in account's existing `public.goals` table. Overview shows up to four active goals from the same store. No samples are seeded, no new dependencies or database migration are needed, with publication authorized by the owner.

## Using goals

Choose **New goal**, enter a title, a positive target and a unit such as books, miles, hours or `$`. Optionally add why it matters and a target date. Current progress starts at zero and can include work already done. Existing themes use the same cards, buttons, inputs and progress styling.

**Update progress** sets the total so far; it does not add to the previous total. Repeating the same value is safe. Progress can exceed the target; the bar stops at 100%. Reaching an active goal's target marks it completed. Reducing a completed goal's total below the target through Update progress reopens it. Paused and archived goals keep their status when progress changes.

**Edit** changes details, progress, deadline or status. Clear the date to remove the deadline. Select Paused or Archived to put a goal aside; select Active to restore it. Completed, paused and archived goals remain available in their status tabs. **Delete** requires confirmation and permanently removes the goal.

## Persistence and account boundary

- The data layer maps `target_value`, `current_value`, `due_date`, `description` and `status` to the UI model. Numeric strings are converted to numbers; dates remain date-only. Color is derived from the UUID, like projects, because the table has no color column.
- Each read/write verifies the signed-in account with the existing production Auth verifier before querying. Reads and writes filter ownership explicitly; the existing database RLS policy enforces `auth.uid() = user_id` with both USING and WITH CHECK. Goals use ordinary account storage, outside the paused journal encryption prototype.
- Loading, empty and failed states are separate. Writes update the UI only after confirmation; a failed form stays open with its input. Pending writes disable the affected controls. Older reads cannot overwrite writes or resurrect goals deleted during the read.
- A new-goal form keeps one UUID across retries. A duplicate insert recovers an identical committed goal; it never overwrites a changed record. Progress updates set absolute values. Concurrent devices use last-confirmed-write behavior; there is no goal revision/history ledger.
- Legacy rows with no positive target or no unit remain visible and editable. Fill those fields through Edit before using Update progress.
- Statistics continues to exclude goals; this change does not add a goals history or change statistics meanings.

## Validation and release

TypeScript and targeted tests cover payload validation, numeric/date mapping, owner filters, failed writes, uncertain insert retries, in-flight duplicate prevention, stale account rejection, load/write races and rendered loading/empty/error/form states. The live schema and RLS were checked using metadata and a zero-row column query; no personal records were read or modified.

Validation on 2026-11-28: all 894 tests across 109 suites passed, TypeScript passed, and the production build passed. The initial sandbox build failed while cleaning an old `.next` directory; the permitted rerun succeeded.

Authenticated browser and physical-phone acceptance remain to be performed: create a goal, reload, update progress to its target, inspect Completed, lower progress to reopen it, pause/archive/restore, clear a deadline, and confirm deletion. Verify the same active goal appears on Overview. The owner authorized commit and deployment on 2026-11-28. This release is based on the latest main and excludes the paused privacy/account-fence changes.
