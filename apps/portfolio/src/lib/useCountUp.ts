import { useEffect, useState } from 'react';

import { usePrefersReducedMotion } from './usePrefersReducedMotion';

/**
 * Counts a stat up to the number that was written in the portal.
 *
 * The values in a content record are strings, and deliberately so — "10+",
 * "6+", "15+" are what somebody typed, not measurements this app can compute.
 * So the number is picked out of the string and the rest of it is left exactly
 * as written: the plus stays put, and a value with no digits in it at all is
 * returned untouched rather than animated to zero.
 *
 * It runs once, when the band is first scrolled to, and never again. A figure
 * that re-counts every time it passes the viewport is a distraction sitting on
 * top of a credibility claim.
 *
 * Under reduced motion the final value is the first and only thing rendered —
 * this is JavaScript, so no stylesheet can switch it off (§7.5).
 */
const PARTS = /^(\D*)(\d[\d,]*)(.*)$/;

const DURATION_MS = 1100;

/** Ease-out cubic: fast off the mark, and settling rather than stopping. */
function ease(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function useCountUp(value: string, active: boolean): string {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (reduced || !active) {
      setShown(value);
      return;
    }

    const parts = PARTS.exec(value);
    if (!parts) {
      setShown(value);
      return;
    }

    const [, prefix = '', digits = '', suffix = ''] = parts;
    const target = Number(digits.replace(/,/g, ''));
    if (!Number.isFinite(target) || target === 0) {
      setShown(value);
      return;
    }

    // Grouping is copied from what was written rather than imposed: a record
    // saying "1500" should not start rendering as "1,500" half way through.
    const grouped = digits.includes(',');
    const format = (n: number) => (grouped ? n.toLocaleString('en-AU') : String(n));

    let frame = 0;
    const start = performance.now();

    const step = (now: number) => {
      const t = Math.min((now - start) / DURATION_MS, 1);
      setShown(`${prefix}${format(Math.round(target * ease(t)))}${suffix}`);
      if (t < 1) frame = requestAnimationFrame(step);
    };

    setShown(`${prefix}${format(0)}${suffix}`);
    frame = requestAnimationFrame(step);

    return () => cancelAnimationFrame(frame);
  }, [value, active, reduced]);

  return shown;
}
