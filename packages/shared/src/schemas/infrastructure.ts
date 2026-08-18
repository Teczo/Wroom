import {
  ENVIRONMENT_NAMES,
  SERVICE_ROLES,
  SERVICE_STATUSES,
  VENDORS,
} from '../constants.js';
import {
  boolean,
  enumOf,
  nullable,
  object,
  objectId,
  partial,
  string,
  url,
  withDefault,
} from '../validate.js';

export const accountCreateShape = {
  vendor: enumOf(VENDORS),
  label: string({ min: 1, max: 120 }),
  loginEmail: string({ min: 3, max: 200, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }),
  accountRef: withDefault(string({ max: 200, allowEmpty: true }), ''),
  isPrimary: withDefault(boolean(), false),
  billingOwner: withDefault(string({ max: 140, allowEmpty: true }), ''),
  notes: withDefault(string({ max: 2000, allowEmpty: true }), ''),
};

export const accountCreateSchema = object(accountCreateShape);
export const accountUpdateSchema = partial(accountCreateShape);

export const environmentCreateShape = {
  name: enumOf(ENVIRONMENT_NAMES),
  branch: withDefault(string({ max: 140 }), 'main'),
  publicUrl: withDefault(nullable(url()), null),
  isPrimary: withDefault(boolean(), false),
  healthCheckUrl: withDefault(nullable(url()), null),
};

export const environmentCreateSchema = object(environmentCreateShape);
export const environmentUpdateSchema = partial(environmentCreateShape);

export const serviceCreateShape = {
  environmentId: objectId(),
  role: enumOf(SERVICE_ROLES),
  vendor: enumOf(VENDORS),
  accountId: withDefault(nullable(objectId()), null),
  resourceName: string({ min: 1, max: 200 }),
  region: withDefault(string({ max: 60, allowEmpty: true }), ''),
  url: withDefault(nullable(url()), null),
  plan: withDefault(string({ max: 60, allowEmpty: true }), ''),
  status: withDefault(enumOf(SERVICE_STATUSES), 'active' as const),
  /** How a vendor cost line gets attributed back to this project. */
  externalRef: withDefault(nullable(string({ max: 400 })), null),
};

export const serviceCreateSchema = object(serviceCreateShape);
export const serviceUpdateSchema = partial(serviceCreateShape);
