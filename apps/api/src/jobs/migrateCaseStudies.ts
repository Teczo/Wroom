/**
 * Moves each project's old singular `portfolio.caseStudy` into
 * `portfolio.caseStudies[0]`.
 *
 * The v0.1 shape held one case study per project, inline. v0.2 holds many, each
 * with a slug, a title and a sector. This carries the old one across so nothing
 * anyone wrote is lost when the model stops describing the old field.
 *
 * **Read through the raw driver, deliberately.** `portfolio.caseStudy` is no
 * longer on the Mongoose schema, and `config/db.ts` sets `strictQuery: true` —
 * so a Mongoose read would neither return the field nor let it be filtered on.
 * Going to the collection is the only way to see data the model has stopped
 * describing, which is exactly the situation a migration exists for.
 *
 * Safe to re-run. A project that already has `caseStudies` is left alone, and a
 * project whose old case study was blank has nothing to move, so a second run
 * reports the same thing the first one finished with.
 *
 * The old `portfolio.caseStudy` is **not** unset. It costs nothing to leave, it
 * is invisible to the application now that the model has dropped it, and it is
 * the only copy of the data if something about this migration turns out to be
 * wrong. Removing it is a separate decision, taken once this has been seen to
 * be right.
 *
 * Run with: npm run migrate-case-studies --workspace @wroom/api
 */

import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { ProjectModel } from '../models/Project.js';

type LegacyMetric = { label?: unknown; value?: unknown };

type LegacyCaseStudy = {
  problem?: unknown;
  role?: unknown;
  approach?: unknown;
  outcome?: unknown;
  metrics?: unknown;
  testimonial?: { quote?: unknown; attribution?: unknown } | null;
};

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Whether the old object held anything worth carrying across.
 *
 * A project that was created and never had its case study written has an object
 * of empty strings, not a missing one. Those become an empty `caseStudies`
 * rather than one blank entry — an empty section renders as nothing, which is
 * right, whereas a blank case study would render as an empty card.
 */
function hasContent(legacy: LegacyCaseStudy | null | undefined): boolean {
  if (!legacy) return false;

  const prose = [legacy.problem, legacy.role, legacy.approach, legacy.outcome].some(
    (value) => text(value).trim() !== '',
  );
  const metrics = Array.isArray(legacy.metrics) && legacy.metrics.length > 0;
  const quote = text(legacy.testimonial?.quote).trim() !== '';

  return prose || metrics || quote;
}

function metricsFrom(value: unknown): Array<{ label: string; value: string }> {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      const metric = entry as LegacyMetric;
      return { label: text(metric.label), value: text(metric.value) };
    })
    .filter((metric) => metric.label !== '' || metric.value !== '');
}

async function migrate(): Promise<void> {
  await connectDatabase();

  const projects = ProjectModel.collection;

  // Only projects that still have the old object and nothing in the new array.
  // Both halves matter: the first skips projects created after the rewrite, the
  // second is what makes a second run a no-op.
  const candidates = await projects
    .find({
      'portfolio.caseStudy': { $exists: true },
      $or: [
        { 'portfolio.caseStudies': { $exists: false } },
        { 'portfolio.caseStudies': { $size: 0 } },
      ],
    })
    .toArray();

  console.log(`[migrate-case-studies] ${candidates.length} project(s) to look at`);

  let moved = 0;
  let blank = 0;
  const failures: Array<{ slug: string; message: string }> = [];

  for (const project of candidates) {
    const slug = text(project.slug) || String(project._id);

    try {
      const legacy = (project.portfolio as { caseStudy?: LegacyCaseStudy } | undefined)?.caseStudy;

      if (!hasContent(legacy)) {
        // Write the empty array so the field exists in the new shape. This one
        // does still match the query on a later run — `$size: 0` matches an
        // empty array — so a blank project is looked at again and written the
        // same empty value. Same result, and cheap: no project has more than
        // one old case study to weigh up.
        await projects.updateOne(
          { _id: project._id },
          { $set: { 'portfolio.caseStudies': [] } },
        );
        blank += 1;
        console.log(`[migrate-case-studies] ${slug} — case study was blank, nothing to move`);
        continue;
      }

      const migrated = {
        // Derived from the project slug: it is already unique across projects,
        // already a valid slug, and with one case study there is nothing to
        // collide with inside the project.
        slug,
        sector: '',
        // The old shape had no title. The project's own name is the only
        // honest source for one — nothing here is invented.
        title: text(project.name),
        summary: '',
        heroAssetId: null,
        problem: text(legacy?.problem),
        role: text(legacy?.role),
        approach: text(legacy?.approach),
        outcome: text(legacy?.outcome),
        metrics: metricsFrom(legacy?.metrics),
        testimonial:
          text(legacy?.testimonial?.quote).trim() !== ''
            ? {
                quote: text(legacy?.testimonial?.quote),
                attribution: text(legacy?.testimonial?.attribution),
              }
            : null,
        sortOrder: 0,
      };

      await projects.updateOne(
        { _id: project._id },
        { $set: { 'portfolio.caseStudies': [migrated] } },
      );

      moved += 1;
      console.log(`[migrate-case-studies] ${slug} — moved into caseStudies[0] as '${migrated.slug}'`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[migrate-case-studies] ${slug} — FAILED: ${message}`);
      failures.push({ slug, message });
    }
  }

  console.log(
    `[migrate-case-studies] ${moved} moved, ${blank} were blank, ${failures.length} failed`,
  );
  console.log('[migrate-case-studies] the old portfolio.caseStudy is left in place as a backup');

  await disconnectDatabase();

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`[migrate-case-studies] unresolved — ${failure.slug}: ${failure.message}`);
    }
    process.exit(1);
  }
}

migrate().catch((error: unknown) => {
  console.error('[migrate-case-studies] failed', error);
  process.exit(1);
});
