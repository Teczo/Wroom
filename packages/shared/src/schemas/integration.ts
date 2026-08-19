import { STRIPE_KEY_PREFIXES, VENDOR_AUTH_TYPES } from '../constants.js';
import {
  boolean,
  enumOf,
  isoDate,
  nullable,
  optional,
  strictObject,
  string,
  withDefault,
  type Validator,
} from '../validate.js';

/**
 * `vendorConnections` says where a credential lives and whether sync is on. It
 * never says what the credential is.
 *
 * Like `credentials`, these are `strictObject` schemas: an unknown property is
 * refused rather than dropped, because a dropped `apiKey` would look to whoever
 * sent it like their key had been saved somewhere.
 */

/**
 * A pointer to a secret, never the secret.
 *
 * Two rules, both cheap and both worth having. It must look like a location —
 * `scheme://path`, e.g. `kv://teczo/stripe`. And it must not start with a
 * prefix Stripe uses for its own keys, which is what a paste-by-mistake looks
 * like. The generic `looksLikeSecretField` guard cannot help here: the *field*
 * is legitimately named `secretRef`, so only its value can be judged.
 */
export function secretPointer(): Validator<string> {
  const inner = string({ min: 3, max: 200 });

  return {
    run(input, path, issues) {
      const value = inner.run(input, path, issues);
      if (value === '') return value;

      if (STRIPE_KEY_PREFIXES.some((prefix) => value.startsWith(prefix))) {
        issues.push({
          path,
          message:
            'That is the key itself. This field records where the key lives — a pointer such as kv://teczo/stripe. The key is read from STRIPE_SECRET_KEY in the environment.',
        });
        return value;
      }

      if (!/^[a-z][a-z0-9+.-]*:\/\/\S+$/i.test(value)) {
        issues.push({
          path,
          message: 'must be a pointer to where the key lives, e.g. kv://teczo/stripe',
        });
      }

      return value;
    },
  };
}

/**
 * Creating or updating the connection. `lastSyncAt`, `lastSyncStatus` and
 * `lastSyncError` are absent on purpose — the sync writes those, not a client.
 */
export const vendorConnectionShape = {
  /** The Stripe account this connects to, e.g. `acct_1P...`. Shown, not used to authenticate. */
  accountId: withDefault(string({ max: 140, allowEmpty: true }), ''),
  authType: withDefault(enumOf(VENDOR_AUTH_TYPES), 'api-key' as const),
  secretRef: secretPointer(),
  syncEnabled: withDefault(boolean(), false),
};

export const vendorConnectionSchema = strictObject(vendorConnectionShape);

/**
 * The sync's only input: how far back to look. Absent means "since the last
 * successful sync", which is what the button sends.
 */
export const stripeSyncQuerySchema = strictObject({
  since: optional(nullable(isoDate())),
});
