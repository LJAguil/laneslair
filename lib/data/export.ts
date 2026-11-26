import { createClient } from "@/lib/supabase/client";
import { getVerifiedUserId, TaskDataError } from "./tasks";
import { exportColumns, exportRows, type ExportCollection } from "@/lib/data-export";
export async function fetchExport(collection: ExportCollection, notes: boolean, expectedAccount: string, current: () => boolean) {
  if (!["tasks", "projects", "habits"].includes(collection)) throw new TaskDataError("Choose a supported collection.");
  const account = await getVerifiedUserId();
  if (account !== expectedAccount || !current()) throw new TaskDataError("Your account changed. Reload before exporting.");
  const columns = exportColumns(collection, notes), rows: Record<string, unknown>[] = [];
  for (let offset = 0; ; offset += 500) {
    if (!current()) throw new TaskDataError("Your account changed. Reload before exporting.");
    const result = await createClient().from(collection).select(columns.join(",")).eq("user_id", account).order("id").range(offset, offset + 499);
    if (result.error) throw new TaskDataError("Couldn't load a complete export. No file was created. Check your connection and retry.");
    const page = result.data as unknown as Record<string, unknown>[];
    rows.push(...page);
    if (rows.length > 100000) throw new TaskDataError("This collection is too large for a browser export. No partial file was created.");
    if (page.length < 500) break;
  }
  if (!current() || await getVerifiedUserId() !== account) throw new TaskDataError("Your account changed. Reload before exporting.");
  return { rows: exportRows(rows, columns), columns };
}
