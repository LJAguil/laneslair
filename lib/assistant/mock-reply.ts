// Prototype-only "assistant". It builds canned replies from local sample data
// with simple keyword matching — there is no AI model and nothing leaves the browser.
// Later this can be replaced by a server route that calls a real model.
import { formatDueLabel } from "@/lib/dates";
import { habitStreak, isCheckedIn, isOverdue, priorityTasks, upcomingEvents } from "@/lib/selectors";
import type { AppState } from "@/lib/store/app-store";

export function mockAssistantReply(prompt: string, state: AppState): string {
  const q = prompt.toLowerCase();

  if (q.includes("overdue")) {
    const overdue = state.tasks.filter((t) => isOverdue(t));
    if (overdue.length === 0) return "Nothing is overdue right now. Nice work.";
    return `You have ${overdue.length} overdue: ${overdue.map((t) => `“${t.title}” (${formatDueLabel(t.dueDate!)})`).join(", ")}. I'd knock those out first.`;
  }

  if (q.includes("habit") || q.includes("streak")) {
    const lines = state.habits.map((h) => `• ${h.name}: ${habitStreak(h)}-day streak${isCheckedIn(h) ? " ✓ today" : ""}`);
    return `Here's how your habits look:\n\n${lines.join("\n")}`;
  }

  if (q.includes("event") || q.includes("weekend") || q.includes("free")) {
    const free = upcomingEvents(state.events).filter((e) => e.price.toLowerCase().includes("free")).slice(0, 3);
    return free.length
      ? `A few free picks coming up:\n\n${free.map((e) => `• ${e.title} — ${formatDueLabel(e.startsAt.slice(0, 10))}, ${e.venue}`).join("\n")}\n\nYou can save any of them on the Discover page.`
      : "I couldn't find free events in the sample listings.";
  }

  if (q.includes("focus") || q.includes("today") || q.includes("plan")) {
    const top = priorityTasks(state.tasks).filter((t) => t.status !== "done").slice(0, 3);
    return top.length
      ? `For today I'd focus on:\n\n${top.map((t, i) => `${i + 1}. ${t.title} (${t.priority} priority)`).join("\n")}\n\nStart with the first one while your energy is highest.`
      : "Your priority list is clear — maybe a good day to get ahead on a project.";
  }

  return "I'm a prototype, so I can only answer from sample data for now. Try asking about today's focus, overdue tasks, habits, or events.";
}
