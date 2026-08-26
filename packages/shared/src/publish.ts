/**
 * The three publish gates (CLAUDE.md §8, DATA_MODEL.md `assets`).
 *
 * An asset appears in the portfolio only if all three are true. This is the one
 * implementation — never inline the check anywhere else.
 */

import type { Visibility } from './constants.js';

export type PublishGateInput = {
  /** `asset.visibility` */
  assetVisibility: Visibility;
  /** `project.portfolio.visibility` */
  projectVisibility: Visibility;
  /** `product.ndaRestricted` */
  productNdaRestricted: boolean;
};

export type PublishGateResult = {
  publishable: boolean;
  /** Every gate that failed, so the UI can say why rather than just refusing. */
  blockedBy: PublishGateReason[];
};

export type PublishGateReason =
  | 'asset-not-public'
  | 'project-not-public'
  | 'product-nda-restricted';

export const PUBLISH_GATE_MESSAGES: Record<PublishGateReason, string> = {
  'asset-not-public': 'This asset is not marked public.',
  'project-not-public': 'This project is not published to the portfolio.',
  'product-nda-restricted': 'The product is NDA restricted, so nothing under it can be published.',
};

/** Full result, including which gates failed. */
export function checkPublishGates(input: PublishGateInput): PublishGateResult {
  const blockedBy: PublishGateReason[] = [];
  if (input.assetVisibility !== 'public') blockedBy.push('asset-not-public');
  if (input.projectVisibility !== 'public') blockedBy.push('project-not-public');
  if (input.productNdaRestricted) blockedBy.push('product-nda-restricted');
  return { publishable: blockedBy.length === 0, blockedBy };
}

/** The boolean form — use this when filtering assets for a published snapshot. */
export function isAssetPublishable(input: PublishGateInput): boolean {
  return checkPublishGates(input).publishable;
}

/**
 * The gate for an asset that belongs to the site rather than to a project.
 *
 * A portrait on the about page has no project and no product, so two of the
 * three gates have nothing to read: there is no `project.portfolio.visibility`
 * and no `product.ndaRestricted` to consult. What is left is the asset's own
 * visibility, and that is the whole gate.
 *
 * It lives here, beside the three, so there is still exactly one file that
 * decides whether bytes may be copied into a container the whole internet can
 * read (CLAUDE.md §8). It returns the same shape, so a caller shows the reason
 * the same way.
 *
 * `client-only` is not a state a site asset can be in — there is no client to
 * scope it to — and it is refused here rather than quietly treated as public.
 */
export function checkSiteAssetGates(input: { assetVisibility: Visibility }): PublishGateResult {
  return input.assetVisibility === 'public'
    ? { publishable: true, blockedBy: [] }
    : { publishable: false, blockedBy: ['asset-not-public'] };
}

/** The boolean form, for filtering. */
export function isSiteAssetPublishable(input: { assetVisibility: Visibility }): boolean {
  return checkSiteAssetGates(input).publishable;
}

/**
 * Whether the project itself may be published at all. An NDA-restricted product
 * blocks every child project regardless of the project's own visibility.
 */
export function isProjectPublishable(input: {
  projectVisibility: Visibility;
  productNdaRestricted: boolean;
}): boolean {
  return input.projectVisibility === 'public' && !input.productNdaRestricted;
}
