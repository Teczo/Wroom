import { UPLOAD_LIMITS } from '@wroom/shared';
import {
  BlobSASPermissions,
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
} from '@azure/storage-blob';
import { randomUUID } from 'node:crypto';

import { env } from '../config/env.js';
import { AppError, UnprocessableError, ValidationError } from '../utils/errors.js';

/**
 * Issues a short-lived SAS URL so the browser uploads straight to Azure Blob
 * Storage. The connection string never leaves the server, and mime type and
 * size are checked here — before a URL exists — not after the bytes arrive.
 */

const SAS_MINUTES = 15;

export type UploadTicket = {
  /** PUT the file here. Expires shortly. */
  uploadUrl: string;
  /**
   * The path inside the container. Send this back when registering the asset —
   * the server rebuilds the permanent URL from it, so the client never gets to
   * name where a record points.
   */
  blobName: string;
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
    blobName,
    expiresAt: expiresOn.toISOString(),
  };
}

/** The container client, or a 503 that says storage is not set up yet. */
function containerClient() {
  if (!env.azureStorage.configured) {
    throw new AppError(503, 'INTERNAL', 'File storage is not configured on this environment yet.');
  }

  return BlobServiceClient.fromConnectionString(
    env.azureStorage.connectionString,
  ).getContainerClient(env.azureStorage.container);
}

/**
 * Turns a blob name back into its permanent URL, having checked that it is one
 * this project was given and that something was actually uploaded to it.
 *
 * This is what stops a hand-edited request registering an asset that points at
 * another project's file, or at nothing at all.
 */
export async function resolveUploadedBlob(
  projectId: string,
  blobName: string,
): Promise<string> {
  if (!blobName.startsWith(`${projectId}/`)) {
    throw new ValidationError('That upload does not belong to this project.', {
      blobName: 'This is not a path the project was given.',
    });
  }

  const blob = containerClient().getBlockBlobClient(blobName);

  if (!(await blob.exists())) {
    throw new ValidationError('Nothing has been uploaded to that path.', {
      blobName: 'The upload did not arrive. Try uploading the file again.',
    });
  }

  return blob.url;
}

/** Removes the file itself. Missing is not an error — the goal is that it is gone. */
export async function deleteBlobByUrl(blobUrl: string): Promise<void> {
  if (!env.azureStorage.configured) return;

  const container = containerClient();
  const prefix = `${container.url}/`;
  if (!blobUrl.startsWith(prefix)) return;

  const blobName = decodeURIComponent(blobUrl.slice(prefix.length));
  await container.getBlockBlobClient(blobName).deleteIfExists();
}
