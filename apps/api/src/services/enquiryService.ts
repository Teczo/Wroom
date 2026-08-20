import type { Infer, enquiryCreateShape } from '@wroom/shared';

import { EnquiryModel, type EnquiryDocument } from '../models/Enquiry.js';
import { isPublishedProjectId } from './publishedProjectCache.js';

type EnquiryInput = Infer<typeof enquiryCreateShape>;

export type EnquiryMeta = { ip: string; userAgent: string; submittedInMs: number | null };

/**
 * The one public write.
 *
 * This module writes and never reads. There is no find, no exists, no populate
 * and no aggregate anywhere in it — that is the property CLAUDE.md §8 asks for,
 * and it is what makes a bug here incapable of leaking anything, because there
 * is nothing loaded to leak.
 *
 * `relatedProjectId` is checked against a set held in memory, not against
 * `publishedProjects`. See publishedProjectCache for why that distinction is
 * the whole point rather than an optimisation.
 */

/** An empty optional field is stored as null, matching docs/DATA_MODEL.md. */
function orNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export async function createEnquiry(
  input: EnquiryInput,
  meta: EnquiryMeta,
): Promise<EnquiryDocument> {
  return EnquiryModel.create({
    name: input.name,
    email: input.email,
    phone: orNull(input.phone),
    company: orNull(input.company),
    message: input.message,

    requirement: {
      budgetRange: orNull(input.requirement.budgetRange),
      timeline: orNull(input.requirement.timeline),
      interest: orNull(input.requirement.interest),
    },

    // A project that is not currently published becomes null rather than an
    // error: the field is a hint about where the enquiry came from, and a
    // wrong one is not worth refusing an enquiry over.
    relatedProjectId: isPublishedProjectId(input.relatedProjectId)
      ? input.relatedProjectId
      : null,

    // Server-set, every time, regardless of what arrived in the body.
    source: 'portfolio-form',
    status: 'new',
    ownerUserId: null,
    convertedToProductId: null,
    meta,
  });
}
