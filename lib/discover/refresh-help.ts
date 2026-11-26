/** Public instructions only. Refresh authority stays in GitHub, never in the browser bundle. */
export const discoverRefreshUrl = "https://github.com/LJAguil/laneslair/actions/workflows/discover-daily.yml";
export const discoverRefreshSteps = [
  "Ask for “Refresh Discover” in the Discover project chat to request a review of local outings, news and food offers.",
  "After feed setup is complete, open refresh controls, choose Run workflow on main, leave refresh-now selected, then run it.",
  "Wait for the run to finish. A successful run saves feed headlines and events; repeated runs respect the daily request limit.",
  "Reload Discover after a few minutes. First-time feed setup must be complete for new results to appear; refreshing this page alone does not check sources.",
] as const;
