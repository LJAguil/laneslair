# Everyday usability milestone

Release implementation, 2026-11-26. Owner approved commit and deployment after local verification; exact release commit and hosting outcome are reported in the chat handoff.

## Delivered

- Capture drafts are shared across Today, Inbox and quick capture during app navigation. Editing an existing capture has a separate draft. Text stays on a failed save, retries retain their request ID, and only a confirmed save clears a new capture. Inline states distinguish unsaved, saving, saved and failed. Drafts live in app memory only: closing or refreshing can lose them; the UI says so and a best-effort unload warning is included. Existing native typing attributes are preserved.
- Open tasks have a compact Move control: Today, Tomorrow, Next week, a chosen date, or no due date. The database update contains only deadline fields and updated_at. Existing local due time is retained when moving a date; clearing the date removes its time. Push reminder schedules remain separate, as explicitly explained in the form.
- Project cards and task project chips open a project detail route. It shows existing project notes, progress, the next open task using the existing task ordering, and linked tasks. Existing edit forms are reused; new tasks default to the current project. Loading, failure, unavailable and archived states are explicit.

## Files and coordination

Capture: `components/inbox/capture-form.tsx`, new `capture-draft-provider.tsx`, `components/shell/app-shell.tsx`, new `lib/store/capture-drafts.ts`, and `lib/store/inbox-state.ts`.

Rescheduling: new `components/tasks/task-reschedule.tsx`, `components/tasks/task-list.tsx`, `lib/data/tasks.ts`, and `lib/store/app-store.tsx`.

Projects: new `app/(app)/projects/[id]/page.tsx` and `components/projects/project-detail-view.tsx`, plus `project-card.tsx` and `components/tasks/task-form-dialog.tsx`.

Tests: capture controller, Inbox write scope, deadline payload, synthetic component rendering, and the existing journal rendering fixtures.

Paused privacy changes remain in the other checkout. The shell, app store and Inbox state are coordination overlaps: merge them deliberately with that work. Capture account scope checks only protect these new memory drafts and capture writes; they do not implement the broader paused privacy milestone. No encryption, privacy schema, journal persistence, permissions, SQL or migration changes are included. Account identity changes clear capture drafts; switching accounts within the same mounted shell requires reloading before capture resumes.

## Verification and remaining checks

Passed: 94 test files / 812 tests after fast-forwarding the isolated checkout to the latest published Discover update, TypeScript through the production build, production build with invented public configuration, and ESLint. Tests use invented records and mocked transport. Coverage includes failed and repeated capture saves, account changes and late responses, isolated draft keys, narrow deadline updates, time preservation, project scoping, progress and error states. The journal rendering fixture now provides the shared draft context.

No authenticated deployed data was read. No browser interaction or physical iPhone behavior was verified for this milestone. Before publication, check on an iPhone: type multiline capture text, navigate Today to Inbox and back, save once; simulate a failed save and retry; open Move, use Tomorrow and a custom date with an existing due time; open a project and create a linked task. Confirm keyboard dismissal, focus return, date picker, modal scrolling and bottom navigation. Closing the app is not a durable draft-storage guarantee. Concurrent edits from another device are not newly resolved by this milestone.

Completion criteria for local code are implemented and automated checks pass. The owner authorized publication before physical phone acceptance, which remains outstanding. Release uses the existing GitHub main → Vercel integration; no database action is needed.
