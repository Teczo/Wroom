import type { Infer, enquiryManualCreateShape, enquiryUpdateShape } from '@wroom/shared';
import type { Types } from 'mongoose';

import { EnquiryModel, type EnquiryDocument } from '../models/Enquiry.js';
import { NoteModel } from '../models/Note.js';
import { ProductModel } from '../models/Product.js';
import { NotFoundError, UnprocessableError } from '../utils/errors.js';
import type { Pagination } from '../utils/http.js';

type EnquiryUpdate = Partial<Infer<typeof enquiryUpdateShape>>;
type ManualEnquiry = Infer<typeof enquiryManualCreateShape>;

/**
 * Reading and working through enquiries, behind auth.
 *
 * Kept apart from `enquiryService`, which is the public write and reads
 * nothing. That module's guarantee is easy to check precisely because nothing
 * like the queries below shares a file with it.
 */

export type EnquiryListFilters = { status?: string };

/**
 * Spam is hidden unless you ask for it by name. It is a status rather than a
 * deletion so the evidence survives, but the inbox is for things that need
 * answering.
 */
export async function listEnquiries(
  filters: EnquiryListFilters,
  pagination: Pagination,
): Promise<{ items: EnquiryDocument[]; total: number }> {
  const query: Record<string, unknown> = filters.status
    ? { status: filters.status }
    : { status: { $ne: 'spam' } };

  const [items, total] = await Promise.all([
    EnquiryModel.find(query)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    EnquiryModel.countDocuments(query),
  ]);

  return { items, total };
}

export async function getEnquiry(id: string): Promise<EnquiryDocument> {
  const enquiry = await EnquiryModel.findById(id);
  if (!enquiry) throw new NotFoundError('That enquiry');
  return enquiry;
}

export async function createManualEnquiry(
  input: ManualEnquiry,
  ownerUserId: Types.ObjectId,
): Promise<EnquiryDocument> {
  return EnquiryModel.create({
    name: input.name,
    email: input.email,
    phone: orNull(input.phone),
    company: orNull(input.company),
    message: input.message,
    source: input.source,
    requirement: {
      budgetRange: orNull(input.requirement.budgetRange),
      timeline: orNull(input.requirement.timeline),
      interest: orNull(input.requirement.interest),
    },
    // Typed in by whoever is signed in, so it is theirs from the start.
    ownerUserId,
    status: 'new',
    relatedProjectId: null,
    convertedToProductId: null,
    meta: { ip: '', userAgent: '', submittedInMs: null },
  });
}

export async function updateEnquiry(
  id: string,
  input: EnquiryUpdate,
): Promise<EnquiryDocument> {
  const enquiry = await getEnquiry(id);

  /*
   * The rule is about creating the link, not about every edit afterwards.
   *
   * Checking it against the status this save will leave behind means marking
   * won and linking the product in one request is allowed. Checking it only
   * when the link is being set means an enquiry that was won and later went
   * wrong can still be moved to lost or spam — enforcing the pairing forever
   * would strand the record with no way out but unlinking first.
   */
  const settingLink =
    input.convertedToProductId !== undefined && input.convertedToProductId !== null;

  if (settingLink) {
    const productId = input.convertedToProductId as string;
    await assertProductExists(productId);

    const status = input.status ?? enquiry.status;
    if (status !== 'won') {
      throw new UnprocessableError(
        'An enquiry can only be linked to a product once it is marked won.',
        {
          convertedToProductId:
            'Mark this enquiry won first — a link to a product is what winning means.',
        },
      );
    }
  }

  if (input.requirement) {
    enquiry.set({
      requirement: {
        budgetRange: orNull(input.requirement.budgetRange),
        timeline: orNull(input.requirement.timeline),
        interest: orNull(input.requirement.interest),
      },
    });
  }

  if (input.status !== undefined) enquiry.set({ status: input.status });
  if (input.ownerUserId !== undefined) enquiry.set({ ownerUserId: input.ownerUserId });
  if (input.convertedToProductId !== undefined) {
    enquiry.set({ convertedToProductId: input.convertedToProductId });
  }

  await enquiry.save();
  return enquiry;
}

/** Removes the enquiry and the follow-ups written against it. */
export async function deleteEnquiry(id: string): Promise<void> {
  const enquiry = await getEnquiry(id);

  await NoteModel.deleteMany({ enquiryId: enquiry._id });
  await enquiry.deleteOne();
}

async function assertProductExists(productId: string): Promise<void> {
  const exists = await ProductModel.exists({ _id: productId });
  if (!exists) {
    throw new UnprocessableError('That product does not exist.', {
      convertedToProductId: 'Pick a product that exists, or create it first.',
    });
  }
}

function orNull(value: string | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed === '' ? null : trimmed;
}
