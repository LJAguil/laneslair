import type { Task } from "@/lib/types";

export interface TaskWrite { revision: number; task: Task | null }
/** Preserve writes that completed after a task-list read began. Null is a deletion. */
export function mergeTaskRead(rows: Task[], writes: Map<string, TaskWrite>, startedAt: number): Task[] {
  const merged = new Map(rows.map((t) => [t.id, t]));
  writes.forEach((write, id) => {
    if (write.revision <= startedAt) return;
    if (write.task) merged.set(id, write.task);
    else merged.delete(id);
  });
  return Array.from(merged.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
