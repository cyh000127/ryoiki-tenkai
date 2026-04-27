export function formatLatency(latencyMs: number): string {
  return `${Math.max(0, Math.round(latencyMs))} ms`;
}
