import { UPLOAD_LIMITS } from '@wroom/shared';
import {
  BlobSASPermissions,
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
} from '@azure/storage-blob';
import { randomUUID } from 'node:crypto';

import { env } from '../config/env.js';
import { AppError, UnprocessableError } from '../utils/errors.js';

/**
 * Issues a short-lived SAS URL so the browser uploads straight to Azure Blob
 * Storage. The connection string never leaves the server, and mime type and
 * size are checked here — before a URL exists — not after the bytes arrive.
 */

const SAS_MINUTES = 15;

export type UploadTicket = {
  /** PUT the file here. Expires shortly. */
  uploadUrl: string;
  /** The permanent URL to store on the asset once the upload succeeds. */
  blobUrl: string;
  expiresAt: string;
};

function assertAllowed(mimeType: string, sizeBytes: number): void {
  if (!(UPLOAD_LIMITS.allowedMimeTypes as readonly string[]).includes(mimeType)) {
    throw new UnprocessableError(`Files of type ${mimeType} cannot be uploaded.`, {
      allowed: UPLOAD_LIMITS.allowedMimeTypes,
    });
  }

  if (sizeBytes > UPLOAD_LIMITS.maxSizeBytes) {
    const limitMb = Math.round(UPLOAD_LIMITS.maxSizeBytes / (1024 * 1024));
    throw new UnprocessableError(`Files must be ${limitMb}MB or smaller.`, {
      maxSizeBytes: UPLOAD_LIMITS.maxSizeBytes,
    });
  }
}

/** Keeps the original name readable but strips anything path-like. */
function safeBlobName(projectId: string, filename: string): string {
  const cleaned = filename
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(-80);

  return `${projectId}/${randomUUID()}-${cleaned}`;
}

export async function createUploadTicket(input: {
  projectId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}): Promise<UploadTicket> {
  assertAllowed(input.mimeType, input.sizeBytes);

  if (!env.azureStorage.configured) {
    throw new AppError(
      503,
      'INTERNAL',
      'File storage is not configured on this environment yet.',
    );
  }

  const client = BlobServiceClient.fromConnectionString(env.azureStorage.connectionString);
  const container = client.getContainerClient(env.azureStorage.container);
  const blobName = safeBlobName(input.projectId, input.filename);
  const blob = container.getBlockBlobClient(blobName);

  const credential = client.credential;
  if (!(credential instanceof StorageSharedKeyCredential)) {
    throw new AppError(
      503,
      'INTERNAL',
      'File storage is configured without a key that can sign upload URLs.',
    );
  }

  const expiresOn = new Date(Date.now() + SAS_MINUTES * 60 * 1000);
  const sas = generateBlobSASQueryParameters(
    {
      containerName: env.azureStorage.container,
      blobName,
      permissions: BlobSASPermissions.parse('cw'),
      startsOn: new Date(Date.now() - 60 * 1000),
      expiresOn,
      contentType: input.mimeType,
    },
    credential,
  ).toString();

  return {
    uploadUrl: `${blob.url}?${sas}`,
    blobUrl: blob.url,
    expiresAt: expiresOn.toISOString(),
  };
}
