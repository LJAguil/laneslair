/** Minute precision matches the native task time input. Foreground events catch up
 * after mobile browsers suspend timers; no timer promises background delivery. */
export const taskClockSnapshot = () => Math.floor(Date.now() / 60000) * 60000;
export function subscribeTaskClock(onChange: () => void) {
  let timer: ReturnType<typeof setTimeout>;
  const tick = () => { onChange(); timer = setTimeout(tick, 60000 - Date.now() % 60000); };
  timer = setTimeout(tick, 60000 - Date.now() % 60000);
  window.addEventListener("focus", onChange);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    clearTimeout(timer);
    window.removeEventListener("focus", onChange);
    document.removeEventListener("visibilitychange", onChange);
  };
}
