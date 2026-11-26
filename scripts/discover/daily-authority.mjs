// No credentials or network access. Both workflow YAML and CLI enforce this boundary.
export function dailyAuthority(env) {
  if (env.GITHUB_ACTIONS !== "true" || env.GITHUB_REPOSITORY !== "LJAguil/laneslair" ||
      env.GITHUB_REF !== "refs/heads/main" || env.DISCOVER_REPOSITORY_PRIVATE !== "false") {
    throw Error("daily-workflow-disabled");
  }
  if (env.GITHUB_EVENT_NAME === "schedule" && env.DISCOVER_DAILY_ENABLED === "true") return "scheduled";
  if (env.GITHUB_EVENT_NAME === "workflow_dispatch" && env.DISCOVER_RUN_MODE === "controlled-pilot" &&
      env.DISCOVER_DAILY_ENABLED !== "true") return "pilot";
  if (env.GITHUB_EVENT_NAME === "workflow_dispatch" && env.DISCOVER_RUN_MODE === "refresh-now" &&
      env.DISCOVER_DAILY_ENABLED !== "true") return "manual";
  throw Error("daily-workflow-disabled");
}

export function assertPilotStore(authority, head) {
  // A rerun must not silently turn the approved first capture into repeated ingestion.
  // A failed/pending pilot requires inspection and a separately reviewed recovery.
  if (authority === "pilot" && head !== null) throw Error("pilot-already-initialized");
}

export function assertManualBaseline(authority, snapshot) {
  if (authority === "manual" && (!snapshot || snapshot.sources.some(source => source.checkedAt === null))) {
    throw Error("complete-first-pilot-before-manual-refresh");
  }
}
