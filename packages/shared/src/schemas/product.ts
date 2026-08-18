import { PRODUCT_STATUSES } from '../constants.js';
import {
  boolean,
  enumOf,
  nullable,
  object,
  partial,
  slug,
  string,
  withDefault,
} from '../validate.js';

export const productCreateShape = {
  name: string({ min: 1, max: 120 }),
  slug: slug(),
  description: withDefault(string({ max: 2000, allowEmpty: true }), ''),
  isClientWork: withDefault(boolean(), false),
  clientName: withDefault(nullable(string({ max: 120 })), null),
  ndaRestricted: withDefault(boolean(), false),
  status: withDefault(enumOf(PRODUCT_STATUSES), 'active' as const),
};

export const productCreateSchema = object(productCreateShape);
export const productUpdateSchema = partial(productCreateShape);
