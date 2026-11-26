import { createClient } from "@/lib/supabase/client";
import { normalize, type EntertainmentInput, type EntertainmentItem } from "./model";
export interface EntertainmentRepository {
  load(): Promise<EntertainmentItem[]>;
  save(id: string, input: EntertainmentInput): Promise<EntertainmentItem>;
  remove(id: string): Promise<void>;
}
const columns = "id,user_id,title,media,status,tags,priority,platform,minutes,note,season,episode,progress,archived";
export function repository(userId: string): EntertainmentRepository {
  const client = createClient();
  async function verify() {
    const { data, error } = await client.auth.getUser();
    if (error || data.user?.id !== userId) throw new Error("Your account changed. Reload before continuing.");
  }
  function fail(): never { throw new Error("Entertainment could not be saved or loaded. Your input is kept. Check your connection and Entertainment database setup, then retry."); }
  return {
    async load() {
      await verify();
      const items: EntertainmentItem[] = [];
      // Explicit pagination avoids silently truncating larger personal libraries.
      for (let start = 0; ; start += 500) {
        const { data, error } = await client.from("entertainment_items").select(columns).eq("user_id", userId).order("created_at", { ascending: false }).order("id").range(start, start + 499);
        if (error || !data) fail();
        items.push(...(data as EntertainmentItem[]).filter(i => i.user_id === userId));
        if (data.length < 500) break;
      }
      await verify();
      return items;
    },
    async save(id, input) {
      const fields = normalize(input);
      await verify();
      // Stable UUID + owner-scoped upsert makes a lost-response retry nonduplicating.
      const { data, error } = await client.from("entertainment_items").upsert({ ...fields, id, user_id: userId }, { onConflict: "id" }).select(columns).single();
      if (error || !data || data.user_id !== userId) fail();
      await verify();
      return data as EntertainmentItem;
    },
    async remove(id) {
      await verify();
      const { error } = await client.from("entertainment_items").delete().eq("id", id).eq("user_id", userId);
      if (error) fail();
      await verify();
    },
  };
}
