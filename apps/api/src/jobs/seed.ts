/**
 * Seeds the reference data a fresh database needs to be usable: the project
 * types listed in docs/DATA_MODEL.md, the two portfolio content records, and
 * the platform and social marks in the media library.
 *
 * The data model also suggests seeding accounts from the infrastructure sheet,
 * but those rows carry real login emails and CLAUDE.md §2 forbids committing
 * one — add accounts through the portal instead.
 *
 * Safe to re-run: every type is upserted on `key`, and `fieldDefs` you have
 * edited in the portal are left alone. A content record that already exists is
 * never touched, because the words in it are yours.
 *
 * Run with: npm run seed --workspace @wroom/api
 */

import { SEEDED_SITE_CONTENT_KEYS, type MediaKind } from '@wroom/shared';

import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { MediaLibraryModel } from '../models/MediaLibrary.js';
import { ProjectTypeModel } from '../models/ProjectType.js';
import { SiteContentModel } from '../models/SiteContent.js';

type SeedType = {
  key: string;
  label: string;
  icon: string;
  sortOrder: number;
  expectedServiceRoles: string[];
  defaultTechStack: { frontend: string[]; backend: string[] };
  fieldDefs: Array<Record<string, unknown>>;
};

/**
 * Starting field definitions — a deliberately small set. They are data, not
 * code: add, rename and reorder them in the portal without a deploy.
 */
const projectTypes: SeedType[] = [
  {
    key: 'web',
    label: 'Web app',
    icon: 'globe',
    sortOrder: 10,
    expectedServiceRoles: ['frontend', 'backend', 'database', 'auth'],
    defaultTechStack: { frontend: ['React', 'Vite', 'Tailwind CSS'], backend: ['Express 5'] },
    fieldDefs: [
      {
        key: 'primaryDomain',
        label: 'Primary domain',
        type: 'url',
        required: false,
        group: 'Delivery',
        helpText: 'The address you would give someone to look at it.',
      },
      {
        key: 'browserSupport',
        label: 'Browser support',
        type: 'multiselect',
        options: ['Chrome', 'Safari', 'Firefox', 'Edge'],
        required: false,
        group: 'Build',
      },
    ],
  },
  {
    key: 'mobile-rn',
    label: 'Mobile (React Native)',
    icon: 'smartphone',
    sortOrder: 20,
    expectedServiceRoles: ['backend', 'database', 'storage', 'auth'],
    defaultTechStack: { frontend: ['React Native'], backend: ['Express 5'] },
    fieldDefs: [
      {
        key: 'targetPlatforms',
        label: 'Target platforms',
        type: 'multiselect',
        options: ['iOS', 'Android'],
        required: true,
        group: 'Build',
      },
      {
        key: 'usesOTA',
        label: 'Over-the-air updates',
        type: 'boolean',
        required: false,
        group: 'Build',
      },
      {
        key: 'otaChannel',
        label: 'OTA channel',
        type: 'text',
        required: false,
        group: 'Build',
        showIf: { field: 'usesOTA', equals: true },
      },
      {
        key: 'storeListingUrl',
        label: 'Store listing',
        type: 'url',
        required: false,
        group: 'Delivery',
      },
    ],
  },
  {
    key: 'unity',
    label: 'Unity',
    icon: 'gamepad',
    sortOrder: 30,
    expectedServiceRoles: ['backend', 'storage'],
    defaultTechStack: { frontend: ['Unity'], backend: [] },
    fieldDefs: [
      {
        key: 'unityVersion',
        label: 'Unity version',
        type: 'text',
        required: false,
        group: 'Build',
      },
      {
        key: 'targetPlatforms',
        label: 'Target platforms',
        type: 'multiselect',
        options: ['Windows', 'macOS', 'iOS', 'Android', 'WebGL', 'Quest'],
        required: true,
        group: 'Build',
      },
    ],
  },
  {
    key: 'api',
    label: 'API / service',
    icon: 'server',
    sortOrder: 40,
    expectedServiceRoles: ['backend', 'database'],
    defaultTechStack: { frontend: [], backend: ['Express 5', 'Node.js'] },
    fieldDefs: [
      {
        key: 'baseUrl',
        label: 'Base URL',
        type: 'url',
        required: false,
        group: 'Delivery',
      },
      {
        key: 'consumers',
        label: 'Who calls this',
        type: 'textarea',
        required: false,
        group: 'Context',
        helpText: 'Which apps depend on it — useful when deciding what breaks if it goes down.',
      },
    ],
  },
  {
    key: 'xr',
    label: 'XR',
    icon: 'headset',
    sortOrder: 50,
    expectedServiceRoles: ['backend', 'storage'],
    defaultTechStack: { frontend: ['Unity'], backend: [] },
    fieldDefs: [
      {
        key: 'headsets',
        label: 'Headsets',
        type: 'multiselect',
        options: ['Quest 2', 'Quest 3', 'Vision Pro', 'HoloLens 2', 'Pico'],
        required: true,
        group: 'Build',
      },
      {
        key: 'handTracking',
        label: 'Hand tracking',
        type: 'boolean',
        required: false,
        group: 'Build',
      },
    ],
  },
  {
    key: 'internal-tool',
    label: 'Internal tool',
    icon: 'wrench',
    sortOrder: 60,
    expectedServiceRoles: ['frontend', 'backend', 'database'],
    defaultTechStack: { frontend: ['React', 'Vite', 'Tailwind CSS'], backend: ['Express 5'] },
    fieldDefs: [
      {
        key: 'usedBy',
        label: 'Used by',
        type: 'text',
        required: false,
        group: 'Context',
      },
    ],
  },
];

/**
 * The two content records, created empty and unpublished.
 *
 * No copy is seeded: words on the public site are written in the portal, and a
 * placeholder sentence is the kind of thing that gets published by accident.
 * An existing record is left exactly as it is and reported rather than
 * overwritten — re-running this must never cost someone a page they wrote.
 */
async function seedSiteContent(): Promise<void> {
  const created: string[] = [];
  const existing: string[] = [];

  for (const key of SEEDED_SITE_CONTENT_KEYS) {
    if (await SiteContentModel.exists({ key })) {
      existing.push(key);
      continue;
    }

    await SiteContentModel.create({ key, published: null });
    created.push(key);
  }

  console.log(
    `[seed] site content — ${created.length} created${
      created.length > 0 ? ` (${created.join(', ')})` : ''
    }, ${existing.length} already present and left untouched${
      existing.length > 0 ? ` (${existing.join(', ')})` : ''
    }`,
  );
}

/**
 * The platform and social marks named in docs/DATA_MODEL.md.
 *
 * Keys and labels only — no artwork. Seeding invented SVG would be inventing
 * portfolio content (CLAUDE.md §2, rule 8), and a brand mark drawn from memory
 * is a wrong logo shipped under someone's trademark. What this creates is the
 * set of records, so the keys exist to be referenced; the marks themselves get
 * pasted in from the portal, which is where icons are curated (§7.3).
 *
 * `usageApproved` is left at the model default. These are platform and social
 * marks, not client logos.
 */
const mediaMarks: Array<{ kind: MediaKind; key: string; label: string; sortOrder: number }> = [
  { kind: 'platform', key: 'web', label: 'Web', sortOrder: 10 },
  { kind: 'platform', key: 'desktop', label: 'Desktop', sortOrder: 20 },
  { kind: 'platform', key: 'vr', label: 'VR', sortOrder: 30 },
  { kind: 'platform', key: 'mobile', label: 'Mobile', sortOrder: 40 },
  { kind: 'platform', key: 'tablet', label: 'Tablet', sortOrder: 50 },
  { kind: 'social', key: 'github', label: 'GitHub', sortOrder: 10 },
  { kind: 'social', key: 'linkedin', label: 'LinkedIn', sortOrder: 20 },
  { kind: 'social', key: 'email', label: 'Email', sortOrder: 30 },
];

/**
 * Created once and never touched again. A mark that already exists has had its
 * artwork and its label set by hand in the portal, and re-running the seed must
 * not cost someone that work.
 */
async function seedMediaLibrary(): Promise<void> {
  const created: string[] = [];
  const existing: string[] = [];

  for (const mark of mediaMarks) {
    if (await MediaLibraryModel.exists({ key: mark.key })) {
      existing.push(mark.key);
      continue;
    }

    await MediaLibraryModel.create(mark);
    created.push(mark.key);
  }

  console.log(
    `[seed] media library — ${created.length} created${
      created.length > 0 ? ` (${created.join(', ')})` : ''
    }, ${existing.length} already present and left untouched${
      existing.length > 0 ? ` (${existing.join(', ')})` : ''
    }`,
  );
  if (created.length > 0) {
    console.log('[seed] media library — the new marks have no artwork yet; add it in the portal');
  }
}

async function seed(): Promise<void> {
  await connectDatabase();

  let created = 0;
  let updated = 0;

  for (const type of projectTypes) {
    const existing = await ProjectTypeModel.findOne({ key: type.key });

    if (!existing) {
      await ProjectTypeModel.create(type);
      created += 1;
      continue;
    }

    // Labels and ordering are refreshed; fieldDefs are yours once the type exists.
    existing.set({
      label: type.label,
      icon: type.icon,
      sortOrder: type.sortOrder,
      expectedServiceRoles: type.expectedServiceRoles,
      defaultTechStack: type.defaultTechStack,
    });
    await existing.save();
    updated += 1;
  }

  console.log(`[seed] project types — ${created} created, ${updated} left in place`);

  await seedSiteContent();
  await seedMediaLibrary();

  await disconnectDatabase();
}

seed().catch((error: unknown) => {
  console.error('[seed] failed', error);
  process.exit(1);
});
