/**
 * Seeds the reference data a fresh database needs to be usable: the project
 * types listed in docs/DATA_MODEL.md.
 *
 * Only `projectTypes` is seeded. The data model also suggests seeding accounts
 * from the infrastructure sheet, but those rows carry real login emails and
 * CLAUDE.md §2 forbids committing one — add accounts through the portal instead.
 *
 * Safe to re-run: every type is upserted on `key`, and `fieldDefs` you have
 * edited in the portal are left alone.
 *
 * Run with: npm run seed --workspace @wroom/api
 */

import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { ProjectTypeModel } from '../models/ProjectType.js';

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
  await disconnectDatabase();
}

seed().catch((error: unknown) => {
  console.error('[seed] failed', error);
  process.exit(1);
});
