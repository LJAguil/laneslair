/** Frozen v1 seed: only puzzle identity, never personal app data. */
export function randomFor(identity: string) {
  let state = 2166136261;
  for (const char of identity) state = Math.imul(state ^ char.charCodeAt(0), 16777619) >>> 0;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}
export function shuffled<T>(values: readonly T[], random: () => number): T[] {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
  return copy;
}
export function permutations(values: number[]): number[][] {
  return values.length ? values.flatMap((value, i) => permutations(values.filter((_, j) => i !== j)).map(rest => [value, ...rest])) : [[]];
}
