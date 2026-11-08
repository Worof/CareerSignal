/** A metric value that is either a real number or explicitly unavailable. Missing is never zero. */
export type MetricResult =
  | { available: true; value: number }
  | { available: false; reason: string };

export const unavailable = (reason: string): MetricResult => ({ available: false, reason });
export const available = (value: number): MetricResult => ({ available: true, value });
