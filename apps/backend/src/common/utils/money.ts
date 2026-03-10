/**
 * Round a number to 2 decimal places (cents precision).
 * Uses integer math internally to avoid floating-point accumulation errors.
 *
 * Example: round2(10.005) = 10.01, round2(1.999999999) = 2.00
 */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
