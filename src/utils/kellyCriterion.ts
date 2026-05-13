/**
 * Kelly criterion and American → decimal odds (matches legacy Python).
 */
export function americanToDecimal(americanOdds: number): number {
  const decimalOdds =
    americanOdds >= 100 ? americanOdds / 100 : 100 / Math.abs(americanOdds);
  return Math.round(decimalOdds * 100) / 100;
}

export function calculateKellyCriterion(americanOdds: number, modelProb: number): number {
  const decimalOdds = americanToDecimal(americanOdds);
  const bankrollFraction =
    Math.round((100 * (decimalOdds * modelProb - (1 - modelProb))) / decimalOdds * 100) /
    100;
  return bankrollFraction > 0 ? bankrollFraction : 0;
}
