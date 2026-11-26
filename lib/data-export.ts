export type ExportCollection = "tasks" | "projects" | "habits";
export type ExportRow = Record<string, string | number | boolean | null>;
export const exportColumns = (collection: ExportCollection, notes: boolean): string[] => collection === "tasks"
  ? ["id", "project_id", "title", "status", "priority", "due_at", "due_has_time", "completed_at", "created_at", ...(notes ? ["description"] : [])]
  : collection === "projects" ? ["id", "name", "status", "due_date", "created_at", "updated_at", ...(notes ? ["description"] : [])]
  : ["id", "name", "frequency", "target_per_week", "tracking_type", "daily_target", "unit", "is_active", "created_at"];
/** Allowlist even when transport returns more columns than requested. */
export function exportRows(rows: Record<string, unknown>[], columns: string[]): ExportRow[] {
  return rows.map(row => Object.fromEntries(columns.map(key => {
    const value = row[key]; return [key, typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? value : null];
  })));
}
function csvCell(value: unknown): string {
  let text = value == null ? "" : String(value);
  if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function exportDocument(collection: ExportCollection, rows: ExportRow[], columns: string[], format: "json" | "csv", now: Date) {
  return format === "json" ? JSON.stringify({ formatVersion: 1, collection, exportedAt: now.toISOString(),
    scope: "Selected saved records only; excludes Inbox, Journal, credentials, recovery material and unsaved drafts. Not an importable full backup.",
    timestamps: "UTC. Task due_at is a time deadline only when due_has_time is true; otherwise interpret it as the existing date-only task representation.", records: exportRows(rows, columns) }, null, 2)
    : "\uFEFF" + [columns.map(csvCell).join(","), ...exportRows(rows, columns).map(row => columns.map(key => csvCell(row[key])).join(","))].join("\r\n");
}
