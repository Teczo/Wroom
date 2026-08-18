import type { Credential } from '@wroom/shared';

/**
 * How close a credential is to expiring, judged against its own
 * `alertDaysBefore` — a certificate you want 90 days' warning on and a key you
 * want a week's warning on are not the same urgency at the same date.
 */

export type ExpiryState = 'expired' | 'due' | 'fine' | 'none';

/**
 * Whole days between today and the expiry date, both taken as calendar days —
 * an expiry at noon tomorrow is one day away, not 1.5. Rounding rather than
 * truncating keeps it right across a daylight-saving change.
 */
export function daysUntil(expiresAt: string | null): number | null {
  if (!expiresAt) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(expiresAt);
  target.setHours(0, 0, 0, 0);

  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function expiryState(credential: Credential): ExpiryState {
  const days = daysUntil(credential.expiresAt);
  if (days === null) return 'none';
  if (days < 0) return 'expired';
  return days <= credential.alertDaysBefore ? 'due' : 'fine';
}

export function expiryLabel(credential: Credential): string {
  const days = daysUntil(credential.expiresAt);
  if (days === null) return 'No expiry recorded';
  if (days < 0) return `Expired ${Math.abs(days)} ${Math.abs(days) === 1 ? 'day' : 'days'} ago`;
  if (days === 0) return 'Expires today';
  return `${days} ${days === 1 ? 'day' : 'days'} left`;
}

const ORDER: Record<ExpiryState, number> = { expired: 0, due: 1, fine: 2, none: 3 };

/** Expired first, then those inside their alert window, then the rest. */
export function byUrgency(a: Credential, b: Credential): number {
  const byState = ORDER[expiryState(a)] - ORDER[expiryState(b)];
  if (byState !== 0) return byState;

  const left = daysUntil(a.expiresAt);
  const right = daysUntil(b.expiresAt);
  if (left === null) return right === null ? 0 : 1;
  if (right === null) return -1;

  return left - right;
}
