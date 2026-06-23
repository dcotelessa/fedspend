export interface DisasterRecoveryRatio {
  ratio: number;
}

export function computeRecoveryRatio(
  femaCents: number,
  fedCents: number,
): number {
  if (femaCents === 0 && fedCents === 0) return 1.0;
  if (femaCents === 0) return Infinity;
  if (fedCents === 0) return 0;
  return fedCents / femaCents;
}
