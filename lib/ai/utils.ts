// Shared AI utility functions

// Clamp a confidence score to 0-1 range. Returns 0 for invalid/missing values.
export function clampConfidence(value: unknown): number {
  if (typeof value !== "number" || !isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}
