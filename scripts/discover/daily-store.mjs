// Fixed public data branch. Called only by the gated GitHub workflow; never logs tokens.
const repository = "LJAguil/laneslair", branch = "discover-data";
function authorized() {
  if (process.env.GITHUB_ACTIONS !== "true" || process.env.GITHUB_REPOSITORY !== repository || !process.env.GITHUB_TOKEN) throw Error("workflow-only");
}
async function api(route, method = "GET", body) {
  authorized();
  const response = await fetch(`https://api.github.com/repos/${repository}/${route}`, {
    method, redirect: "error", signal: AbortSignal.timeout(15_000),
    headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (response.status === 404 && method === "GET") return null;
  if (!response.ok) throw Error(`data-store-http-${response.status}`);
  // API responses contain only public Git objects or metadata, never publisher bodies.
  return response.json();
}
export async function readStore() {
  const ref = await api(`git/ref/heads/${branch}`);
  if (!ref) return { head: null, text: null };
  const head = ref.object.sha;
  const file = await api(`contents/catalog.json?ref=${head}`);
  if (!file || file.encoding !== "base64" || file.size > 200_000) throw Error("invalid-data-store");
  return { head, text: Buffer.from(file.content, "base64").toString("utf8") };
}
export async function writeStore(text, expectedHead) {
  if (Buffer.byteLength(text) > 200_000) throw Error("snapshot-too-large");
  const current = await api(`git/ref/heads/${branch}`);
  if ((current?.object.sha ?? null) !== expectedHead) throw Error("data-store-conflict");
  const tree = await api("git/trees", "POST", { tree: [
    { path: "catalog.json", mode: "100644", type: "blob", content: text },
    { path: "vercel.json", mode: "100644", type: "blob", content: '{"git":{"deploymentEnabled":false}}\n' },
  ] });
  const commit = await api("git/commits", "POST", { message: "Update public Discover feed data", tree: tree.sha, parents: expectedHead ? [expectedHead] : [] });
  if (expectedHead) await api(`git/refs/heads/${branch}`, "PATCH", { sha: commit.sha, force: false });
  else await api("git/refs", "POST", { ref: `refs/heads/${branch}`, sha: commit.sha });
  return commit.sha;
}
