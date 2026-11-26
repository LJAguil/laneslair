import { beforeEach, expect, it, vi } from "vitest";
import { emptyInput } from "./model";
const mock = vi.hoisted(() => ({ client: { auth: { getUser: vi.fn() }, from: vi.fn() } }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => mock.client }));
import { repository } from "./repository";
const row = { ...emptyInput, title: "Orbit of Cinders", id: "stable-id", user_id: "owner-a" };
function query(result: object) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const key of ["select", "eq", "order", "range", "upsert", "delete", "single"]) builder[key] = vi.fn(() => builder);
  builder.then = vi.fn((resolve: (result: object) => void) => Promise.resolve(resolve(result)));
  mock.client.from.mockReturnValue(builder);
  return builder;
}
beforeEach(() => { vi.clearAllMocks(); mock.client.auth.getUser.mockResolvedValue({ data: { user: { id: "owner-a" } }, error: null }); });
it("scopes reads and destructive writes by owner and item", async () => {
  const builder = query({ data: [row], error: null });
  expect(await repository("owner-a").load()).toEqual([row]);
  expect(builder.eq).toHaveBeenCalledWith("user_id", "owner-a");
  expect(builder.range).toHaveBeenCalledWith(0, 499);
  await repository("owner-a").remove(row.id);
  expect(builder.eq).toHaveBeenCalledWith("id", row.id);
  expect(mock.client.from).toHaveBeenCalledWith("entertainment_items");
});
it("reuses identity on retry, forces the owner and sends normalized progress", async () => {
  const builder = query({ data: row, error: null });
  await repository("owner-a").save(row.id, { ...row, season: 3 });
  expect(builder.upsert).toHaveBeenCalledWith(expect.objectContaining({ id: row.id, user_id: "owner-a", season: null }), { onConflict: "id" });
});
it("does not issue requests for another account and rejects a late account change", async () => {
  query({ data: [row], error: null });
  mock.client.auth.getUser.mockResolvedValueOnce({ data: { user: { id: "owner-b" } }, error: null });
  await expect(repository("owner-a").load()).rejects.toThrow(/account changed/);
  expect(mock.client.from).not.toHaveBeenCalled();
  mock.client.auth.getUser.mockResolvedValueOnce({ data: { user: { id: "owner-a" } }, error: null }).mockResolvedValueOnce({ data: { user: { id: "owner-b" } }, error: null });
  await expect(repository("owner-a").load()).rejects.toThrow(/account changed/);
});
it("sanitizes provider failures and rejects missing-row writes", async () => {
  query({ data: null, error: { message: "private provider detail" } });
  await expect(repository("owner-a").save(row.id, row)).rejects.toThrow(/input is kept/);
  await expect(repository("owner-a").load()).rejects.not.toThrow(/private provider detail/);
  query({ data: null, error: null });
  await expect(repository("owner-a").save(row.id, row)).rejects.toThrow();
});
it("loads beyond the first page without accepting a partial failed read", async () => {
  const builder = query({ data: [], error: null });
  builder.range.mockReturnValueOnce(Promise.resolve({ data: Array.from({ length: 500 }, (_, i) => ({ ...row, id: String(i) })), error: null }));
  expect(await repository("owner-a").load()).toHaveLength(500);
  expect(builder.range).toHaveBeenNthCalledWith(2, 500, 999);
  builder.range.mockReturnValueOnce(Promise.resolve({ data: Array.from({ length: 500 }, () => row), error: null })).mockReturnValueOnce(Promise.resolve({ data: null, error: { message: "offline" } }));
  await expect(repository("owner-a").load()).rejects.toThrow();
});
