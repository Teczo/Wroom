import type { Asset } from '@wroom/shared';
import { UPLOAD_LIMITS } from '@wroom/shared';
import { useState } from 'react';

import { ApiRequestError } from '../../lib/api';
import { kindFor, measure } from './measure';

/**
 * Uploading a file to Azure Blob straight from the browser.
 *
 * The file never passes through the API. The server checks its type and size,
 * signs a URL for one blob with a short expiry, and the browser PUTs to that.
 * The storage connection string stays on the server.
 *
 * This is the flow itself, with the two requests handed in, because there are
 * two owners now: a project's media panel and the site's own portrait. They
 * differ in which endpoints they call and in nothing else — the checks, the
 * progress, and what each failure means are the same either way.
 */

/** A courtesy only — the server check is the one that counts. */
export function localProblem(file: File): string | null {
  if (!(UPLOAD_LIMITS.allowedMimeTypes as readonly string[]).includes(file.type)) {
    return `${file.type || 'That file type'} is not one Wroom accepts.`;
  }

  if (file.size > UPLOAD_LIMITS.maxSizeBytes) {
    const limit = Math.round(UPLOAD_LIMITS.maxSizeBytes / (1024 * 1024));
    return `That file is ${Math.round(file.size / (1024 * 1024))}MB. The limit is ${limit}MB.`;
  }

  return null;
}

/** Where the upload got to, and which half failed if it did. */
export type Phase =
  | { at: 'idle' }
  | { at: 'requesting'; filename: string }
  | { at: 'uploading'; filename: string; percent: number }
  | { at: 'saving'; filename: string }
  | { at: 'rejected'; message: string }
  | { at: 'failed'; message: string };

/**
 * `fetch` cannot report upload progress, so this one request uses XHR — on a
 * phone connection a 40MB video with no progress bar looks like a hang.
 */
function putToBlob(url: string, file: File, onProgress: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.open('PUT', url);
    request.setRequestHeader('x-ms-blob-type', 'BlockBlob');
    request.setRequestHeader('Content-Type', file.type);

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };

    request.onload = () =>
      request.status >= 200 && request.status < 300
        ? resolve()
        : reject(new Error(`Azure refused the upload (${request.status}).`));

    request.onerror = () =>
      reject(new Error('The upload could not reach storage. Check the connection and try again.'));

    request.send(file);
  });
}

export type UploadTicketRequest = {
  mutateAsync: (input: {
    filename: string;
    mimeType: string;
    sizeBytes: number;
  }) => Promise<{ uploadUrl: string; blobName: string }>;
};

export type AssetCreateRequest = {
  mutateAsync: (input: Record<string, unknown>) => Promise<Asset>;
};

export function useBlobUpload({
  requestUrl,
  createAsset,
  onCreated,
}: {
  requestUrl: UploadTicketRequest;
  createAsset: AssetCreateRequest;
  /** Handed the new record, for a caller that wants to select it. */
  onCreated?: (asset: Asset) => void;
}) {
  const [phase, setPhase] = useState<Phase>({ at: 'idle' });
  const busy = phase.at === 'requesting' || phase.at === 'uploading' || phase.at === 'saving';

  async function upload(file: File): Promise<void> {
    const problem = localProblem(file);
    if (problem) {
      setPhase({ at: 'rejected', message: problem });
      return;
    }

    try {
      setPhase({ at: 'requesting', filename: file.name });

      const ticket = await requestUrl.mutateAsync({
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      });

      setPhase({ at: 'uploading', filename: file.name, percent: 0 });

      const measured = await measure(file);
      await putToBlob(ticket.uploadUrl, file, (percent) =>
        setPhase({ at: 'uploading', filename: file.name, percent }),
      );

      setPhase({ at: 'saving', filename: file.name });

      const asset = await createAsset.mutateAsync({
        blobName: ticket.blobName,
        kind: kindFor(file.type),
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        ...measured,
      });

      onCreated?.(asset);
      setPhase({ at: 'idle' });
    } catch (error) {
      // Refused before the file moved, or the transfer itself broke — the two
      // mean different things and get different messages.
      const rejected = error instanceof ApiRequestError && error.status === 400;
      const message =
        error instanceof ApiRequestError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Something went wrong.';

      setPhase(rejected ? { at: 'rejected', message } : { at: 'failed', message });
    }
  }

  return { phase, busy, upload };
}
