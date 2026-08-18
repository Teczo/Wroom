const audFormatter = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  maximumFractionDigits: 2,
});

/** All money in Wroom is AUD — converted at entry, never at display. */
export function money(amountAud: number | null | undefined): string {
  return audFormatter.format(amountAud ?? 0);
}

export function hours(value: number | null | undefined): string {
  const total = value ?? 0;
  return `${total % 1 === 0 ? total : total.toFixed(2)}h`;
}

export function shortDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function relativeDate(value: string | null | undefined): string {
  if (!value) return 'no activity yet';

  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return shortDate(value);
}

/** "in-development" → "In development" */
export function humanise(value: string): string {
  const spaced = value.replace(/-/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
