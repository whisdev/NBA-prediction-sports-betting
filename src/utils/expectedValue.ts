/**
 * Mirrors Python 3 `round(value, ndigits)` for float inputs used in this project.
 */
export function pyFloatRound(value: number, ndigits: number): number {
  const n = 10 ** ndigits;
  const t = value * n;
  if (!Number.isFinite(t)) return value;
  const sign = t < 0 ? -1 : 1;
  let absT = Math.abs(t);
  const fp = absT % 1;
  if (Math.abs(fp - 0.5) < 1e-12) {
    absT -= 1e-9;
  }
  const truncated = Math.floor(absT);
  let frac = absT - truncated;
  if (Math.abs(frac - 0.5) < 1e-12) {
    frac = 0.5;
  }
  let rounded: number;
  if (frac < 0.5) {
    rounded = truncated;
  } else if (frac > 0.5) {
    rounded = truncated + 1;
  } else {
    rounded = truncated % 2 === 0 ? truncated : truncated + 1;
  }
  return (sign * rounded) / n;
}

function payout(odds: number): number {
  if (odds > 0) {
    return odds;
  }
  return (100 / (-odds)) * 100;
}

export function expectedValue(pWin: number, odds: number): number {
  const pLoss = 1 - pWin;
  const mWin = payout(odds);
  const raw = pWin * mWin - pLoss * 100;
  return pyFloatRound(raw, 2);
}
