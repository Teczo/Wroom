import type { Infer, accountCreateShape } from '@wroom/shared';

import { AccountModel, type AccountDocument } from '../models/Account.js';
import { ServiceModel } from '../models/Service.js';
import { ConflictError, NotFoundError } from '../utils/errors.js';

type AccountInput = Infer<typeof accountCreateShape>;

export async function listAccounts(filters: { vendor?: string }): Promise<AccountDocument[]> {
  const query: Record<string, unknown> = {};
  if (filters.vendor) query.vendor = filters.vendor;

  return AccountModel.find(query).sort({ vendor: 1, label: 1 });
}

export async function getAccount(id: string): Promise<AccountDocument> {
  const account = await AccountModel.findById(id);
  if (!account) throw new NotFoundError('That account');
  return account;
}

export async function createAccount(input: AccountInput): Promise<AccountDocument> {
  return AccountModel.create(input);
}

export async function updateAccount(
  id: string,
  input: Partial<AccountInput>,
): Promise<AccountDocument> {
  const account = await getAccount(id);
  account.set(input);
  await account.save();
  return account;
}

/** Refused while services still point at it — that link is how costs get attributed. */
export async function deleteAccount(id: string): Promise<void> {
  const account = await getAccount(id);
  const serviceCount = await ServiceModel.countDocuments({ accountId: account._id });

  if (serviceCount > 0) {
    throw new ConflictError(
      `${serviceCount} service(s) still use this account. Point them somewhere else first.`,
      { serviceCount },
    );
  }

  await account.deleteOne();
}
