/** Second precision plus foreground catch-up; does not fetch or verify content. */
export const discoverClockSnapshot = () => Math.floor(Date.now() / 1000) * 1000;
export const discoverServerClockSnapshot = () => null;
export function subscribeDiscoverClock(onChange: () => void) {
  const timer = setInterval(onChange, 1000);
  window.addEventListener("focus", onChange);
  window.addEventListener("pageshow", onChange);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    clearInterval(timer);
    window.removeEventListener("focus", onChange);
    window.removeEventListener("pageshow", onChange);
    document.removeEventListener("visibilitychange", onChange);
  };
}
