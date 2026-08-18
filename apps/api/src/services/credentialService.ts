import type { Infer, credentialCreateShape } from '@wroom/shared';

import { AccountModel } from '../models/Account.js';
import { CredentialModel, type CredentialDocument } from '../models/Credential.js';
import { ServiceModel } from '../models/Service.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { getProject } from './projectService.js';

type CredentialInput = Infer<typeof credentialCreateShape>;

/**
 * The registry of where credentials live. Every field here is a pointer or a
 * date — there is no value field, and the schemas refuse a request that tries
 * to add one.
 */

export type CredentialListFilters = {
  projectId?: string;
  /** Only those expiring between now and this many days out. */
  expiringWithinDays?: number;
};

export async function listCredentials(
  filters: CredentialListFilters,
): Promise<CredentialDocument[]> {
  const query: Record<string, unknown> = {};
  if (filters.projectId) query.projectId = filters.projectId;

  if (filters.expiringWithinDays !== undefined) {
    const until = new Date();
    until.setDate(until.getDate() + filters.expiringWithinDays);
    // A credential with no expiry never appears in an expiring-soon query.
    query.expiresAt = { $ne: null, $lte: until };
  }

  // Soonest first. Nulls sort first ascending in Mongo, so they are pushed to
  // the end explicitly — a key with no expiry is not the most urgent thing.
  const items = await CredentialModel.find(query).sort({ expiresAt: 1 });

  return [
    ...items.filter((credential) => credential.expiresAt !== null),
    ...items.filter((credential) => credential.expiresAt === null),
  ];
}

export async function getCredential(id: string): Promise<CredentialDocument> {
  const credential = await CredentialModel.findById(id);
  if (!credential) throw new NotFoundError('That credential');
  return credential;
}

export async function createCredential(input: CredentialInput): Promise<CredentialDocument> {
  await getProject(input.projectId);
  await assertAccountExists(input.accountId);
  await assertServiceExists(input.serviceId);

  return CredentialModel.create(input);
}

export async function updateCredential(
  id: string,
  input: Partial<CredentialInput>,
): Promise<CredentialDocument> {
  const credential = await getCredential(id);

  if (input.projectId) await getProject(input.projectId);
  if (input.accountId) await assertAccountExists(input.accountId);
  if (input.serviceId) await assertServiceExists(input.serviceId);

  credential.set(input);
  await credential.save();
  return credential;
}

export async function deleteCredential(id: string): Promise<void> {
  const credential = await getCredential(id);
  await credential.deleteOne();
}

async function assertAccountExists(accountId: string | null | undefined): Promise<void> {
  if (!accountId) return;

  const exists = await AccountModel.exists({ _id: accountId });
  if (!exists) {
    throw new ValidationError('That account does not exist.', {
      accountId: 'That account does not exist.',
    });
  }
}

/** Services exist as of WRM-015, so a reference to one is checked rather than ignored. */
async function assertServiceExists(serviceId: string | null | undefined): Promise<void> {
  if (!serviceId) return;

  const exists = await ServiceModel.exists({ _id: serviceId });
  if (!exists) {
    throw new ValidationError('That service does not exist.', {
      serviceId: 'That service does not exist.',
    });
  }
}
