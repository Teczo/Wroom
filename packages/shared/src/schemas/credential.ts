import { CREDENTIAL_KINDS } from '../constants.js';
import {
  enumOf,
  isoDate,
  nullable,
  number,
  objectId,
  strictObject,
  strictPartial,
  string,
  withDefault,
} from '../validate.js';

/**
 * `credentials` records where a key lives and when it dies. It never records
 * the key.
 *
 * These are the only schemas in the codebase built on `strictObject`: anywhere
 * else an unknown property is dropped, but here a dropped `value` or `token`
 * would look to whoever sent it like their secret had been stored. So the
 * request is refused instead, naming the offending field.
 */
export const credentialCreateShape = {
  projectId: objectId(),
  serviceId: withDefault(nullable(objectId()), null),
  accountId: withDefault(nullable(objectId()), null),
  label: string({ min: 1, max: 140 }),
  kind: enumOf(CREDENTIAL_KINDS),
  /** A location — "Azure Key Vault", "1Password", "Render env". Not a value. */
  storedIn: string({ min: 1, max: 200 }),
  expiresAt: withDefault(nullable(isoDate()), null),
  renewalCostAud: withDefault(number({ min: 0 }), 0),
  alertDaysBefore: withDefault(number({ min: 0, max: 365, integer: true }), 30),
  lastRotatedAt: withDefault(nullable(isoDate()), null),
  notes: withDefault(string({ max: 2000, allowEmpty: true }), ''),
};

export const credentialCreateSchema = strictObject(credentialCreateShape);
export const credentialUpdateSchema = strictPartial(credentialCreateShape);
