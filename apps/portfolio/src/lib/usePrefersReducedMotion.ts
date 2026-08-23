import { useEffect, useState } from 'react';

/**
 * Whether this visitor has asked their operating system for reduced motion.
 *
 * `index.css` already disables every transition, animation and transform under
 * `prefers-reduced-motion: reduce`, and that is deliberately the enforcement
 * point (§7.5) — a component cannot forget a rule it never has to remember.
 *
 * What CSS cannot reach is motion that lives in JavaScript: a character-by-
 * character type-out is not a transition, and `scrollBy({ behavior: 'smooth' })`
 * ignores the `scroll-behavior` property entirely because the option passed in
 * JavaScript wins over the stylesheet. This hook is how those two paths ask.
 *
 * It reads the query during the first render rather than in an effect, so a
 * component that must start at its finished state starts there, instead of
 * painting the animated state once and correcting it.
 */
const QUERY = '(prefers-reduced-motion: reduce)';

function currentPreference(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(QUERY).matches;
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(currentPreference);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const list = window.matchMedia(QUERY);

    // Re-read on mount: the preference can change between the first render and
    // this effect, and it can change while the page is open.
    setReduced(list.matches);

    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    list.addEventListener('change', onChange);

    return () => list.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
