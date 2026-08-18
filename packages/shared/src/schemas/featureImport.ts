import { boolean, object, string, withDefault } from '../validate.js';

/**
 * The CSV arrives as text in a JSON body rather than a multipart upload — the
 * portal reads the file with `FileReader`, which keeps the API free of an
 * upload dependency.
 */
export const featureImportShape = {
  csv: string({ min: 1, max: 2_000_000 }),
};

export const featureImportPreviewSchema = object(featureImportShape);

/**
 * Commit takes the same text back, not the parsed rows: re-running the parse
 * server-side means the write applies exactly what the server itself judged
 * valid, rather than trusting a shape the client could have edited in between.
 */
export const featureImportCommitSchema = object({
  ...featureImportShape,
  /** Required when invalid rows are present, so skipping them is deliberate. */
  acknowledgeSkipped: withDefault(boolean(), false),
});
