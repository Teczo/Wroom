/**
 * Generates the 400 / 800 / 1600px variants for assets uploaded before there
 * were any.
 *
 * Safe to re-run, and cheap to re-run: the query only picks up assets whose
 * `variants` is still null, and the service checks again per asset before doing
 * any work. A second run downloads nothing and writes nothing.
 *
 * Assets are handled one at a time rather than in parallel. This reads whole
 * images into memory and resizes them three times each; doing fifty at once
 * would be a quicker way to run an App Service instance out of memory than to
 * finish the job.
 *
 * A single asset that cannot be resized — its blob is gone, or it was never
 * really an image — is reported and the run carries on, then exits non-zero so
 * a scripted run does not look clean. Nothing is deleted and nothing is
 * overwritten either way.
 *
 * Run with: npm run backfill-asset-variants --workspace @wroom/api
 */

import { VARIANT_ASSET_KINDS } from '@wroom/shared';

import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { AssetModel } from '../models/Asset.js';
import { backfillVariantsFor } from '../services/assetService.js';

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function backfill(): Promise<void> {
  await connectDatabase();

  const candidates = await AssetModel.find({
    variants: null,
    kind: { $in: VARIANT_ASSET_KINDS as unknown as string[] },
  }).sort({ createdAt: 1 });

  console.log(`[backfill-variants] ${candidates.length} asset(s) with no variants`);

  const failures: Array<{ id: string; filename: string; message: string }> = [];
  let generated = 0;
  let skipped = 0;

  for (const asset of candidates) {
    try {
      const outcome = await backfillVariantsFor(asset);

      if (outcome === 'generated') {
        generated += 1;
        console.log(`[backfill-variants] ${asset.filename} — three variants written`);
      } else {
        skipped += 1;
        console.log(`[backfill-variants] ${asset.filename} — nothing to resize, skipped`);
      }
    } catch (error: unknown) {
      const message = describe(error);
      console.error(`[backfill-variants] ${asset.filename} — FAILED: ${message}`);
      failures.push({ id: String(asset._id), filename: asset.filename, message });
    }
  }

  console.log(
    `[backfill-variants] ${generated} generated, ${skipped} skipped, ${failures.length} failed`,
  );

  await disconnectDatabase();

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`[backfill-variants] unresolved — ${failure.filename} (${failure.id}): ${failure.message}`);
    }
    process.exit(1);
  }
}

backfill().catch((error: unknown) => {
  console.error('[backfill-variants] failed', error);
  process.exit(1);
});
