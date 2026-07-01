export function computeRecoveryRatio(
  femaCents: number,
  fedCents: number,
): number {
  if (Number.isNaN(femaCents) || Number.isNaN(fedCents)) return 0;
  if (femaCents === 0 && fedCents === 0) return 1.0;
  if (femaCents === 0) return 0;
  if (fedCents === 0) return 0;
  return fedCents / femaCents;
}
