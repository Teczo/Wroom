/**
 * Creates the indexes declared on the Mongoose schemas.
 *
 * `config/db.ts` sets `autoIndex: false` in production, so a deploy never
 * blocks on an index build — which also means nothing creates the indexes.
 * Without them every query on the cluster is a collection scan. Run this once
 * against a new environment, and again after a release that adds an index.
 *
 * It uses `createIndexes()`, which only adds what is missing. Anything you
 * built by hand in the Atlas UI is left alone. That is the deliberate choice:
 * `syncIndexes()` would also drop whatever is not declared here, and dropping
 * an index nobody meant to lose is worse than carrying one nobody needs.
 *
 * Safe to re-run: an index that already exists is a no-op.
 *
 * A collection whose index conflicts with the schema — same name, different
 * keys or options — is reported and the run carries on to the rest, then exits
 * non-zero. Mongo will not redefine an index in place, so resolving one means
 * dropping it in Atlas and running this again.
 *
 * Building an index is foreground work on the cluster. On empty collections it
 * is instant; on full ones it takes time and holds a lock, so prefer running
 * it before an environment takes traffic.
 *
 * Run with: npm run ensure-indexes --workspace @wroom/api
 */

import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { AccountModel } from '../models/Account.js';
import { AssetModel } from '../models/Asset.js';
import { CostModel } from '../models/Cost.js';
import { CredentialModel } from '../models/Credential.js';
import { DecisionModel } from '../models/Decision.js';
import { EnquiryModel } from '../models/Enquiry.js';
import { EnvironmentModel } from '../models/Environment.js';
import { FeatureModel } from '../models/Feature.js';
import { NoteModel } from '../models/Note.js';
import { ProductModel } from '../models/Product.js';
import { ProjectModel } from '../models/Project.js';
import { ProjectLinkModel } from '../models/ProjectLink.js';
import { ProjectTypeModel } from '../models/ProjectType.js';
import { PublishedProjectModel } from '../models/PublishedProject.js';
import { RevenueModel } from '../models/Revenue.js';
import { ServiceModel } from '../models/Service.js';
import { SiteContentModel } from '../models/SiteContent.js';
import { TimeEntryModel } from '../models/TimeEntry.js';
import { UserModel } from '../models/User.js';
import { VendorConnectionModel } from '../models/VendorConnection.js';

/**
 * Only the parts of a model this job touches. The concrete models each have a
 * different document type, and none of that matters for building an index.
 */
type IndexableModel = {
  modelName: string;
  schema: { indexes(): unknown[] };
  createIndexes(): Promise<unknown>;
};

/**
 * Every collection in the system. A new model belongs here — nothing discovers
 * these automatically, so an omission is silent until a query gets slow.
 */
const models: IndexableModel[] = [
  AccountModel,
  AssetModel,
  CostModel,
  CredentialModel,
  DecisionModel,
  EnquiryModel,
  EnvironmentModel,
  FeatureModel,
  NoteModel,
  ProductModel,
  ProjectModel,
  ProjectLinkModel,
  ProjectTypeModel,
  PublishedProjectModel,
  RevenueModel,
  ServiceModel,
  SiteContentModel,
  TimeEntryModel,
  UserModel,
  VendorConnectionModel,
];

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function ensureIndexes(): Promise<void> {
  await connectDatabase();

  const failures: Array<{ modelName: string; message: string }> = [];
  let built = 0;
  let skipped = 0;

  for (const model of models) {
    const declared = model.schema.indexes().length;

    if (declared === 0) {
      console.log(`[ensure-indexes] ${model.modelName} — none declared`);
      skipped += 1;
      continue;
    }

    try {
      await model.createIndexes();
      console.log(`[ensure-indexes] ${model.modelName} — ${declared} in place`);
      built += 1;
    } catch (error: unknown) {
      const message = describe(error);
      console.error(`[ensure-indexes] ${model.modelName} — FAILED: ${message}`);
      failures.push({ modelName: model.modelName, message });
    }
  }

  console.log(
    `[ensure-indexes] ${built} collections done, ${skipped} with nothing to build, ${failures.length} failed`,
  );

  await disconnectDatabase();

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`[ensure-indexes] unresolved — ${failure.modelName}: ${failure.message}`);
    }
    process.exit(1);
  }
}

ensureIndexes().catch((error: unknown) => {
  console.error('[ensure-indexes] failed', error);
  process.exit(1);
});
