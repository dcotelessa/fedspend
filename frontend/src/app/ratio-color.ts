export type RatioColor = 'warn' | 'accent' | 'primary';

export function getRatioColor(ratio: number): RatioColor {
  if (ratio < 0.5) return 'warn';
  if (ratio > 1.0) return 'primary';
  return 'accent';
}
