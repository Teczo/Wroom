import {
  PROJECT_DOC_KINDS,
  type ProjectDocCreateInput,
  type ProjectDocKind,
  type ProjectDocSource,
} from '@wroom/shared';
import { MongoServerError } from 'mongodb';
import type { Types } from 'mongoose';

import { ProjectModel } from '../models/Project.js';
import { ProjectDocModel, type ProjectDocDocument } from '../models/ProjectDoc.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.js';

/**
 * Versioned planning documents for hands-off projects (docs/DATA_MODEL.md).
 *
 * Append-only: nothing here edits or deletes a version. Once any version of a
 * project + kind has been pushed, the repo copy is the real one and Wroom stops
 * taking new versions.
 */

const PUSHED_MESSAGE = 'This CLAUDE.md now lives in the repo.';

export async function listProjectDocs(
  projectId: string,
  kind: ProjectDocKind,
): Promise<ProjectDocDocument[]> {
  await assertProjectFound(projectId);

  // Newest first, and without the body — a list can carry many 200 kB versions.
  return ProjectDocModel.find({ projectId, kind }).select('-body').sort({ version: -1 });
}

export async function getProjectDoc(
  projectId: string,
  kind: ProjectDocKind,
  rawVersion: string,
): Promise<ProjectDocDocument> {
  const version = Number(rawVersion);
  if (!Number.isInteger(version) || version < 1) {
    throw new ValidationError('A version is a whole number from 1 up.', {
      version: 'must be a whole number from 1 up',
    });
  }

  await assertProjectFound(projectId);

  const doc = await ProjectDocModel.findOne({ projectId, kind, version });
  if (!doc) throw new NotFoundError(`Version ${version}`);
  return doc;
}

/**
 * Saves the next version.
 *
 * The number is read as "highest so far, plus one", which two saves at once
 * can both arrive at. The unique index on { projectId, kind, version } decides
 * between them: the loser re-reads and tries once more, and if it collides
 * again it gets a 409 rather than looping.
 */
export async function createProjectDoc(
  projectId: string,
  input: ProjectDocCreateInput,
  author: { source: ProjectDocSource; userId: Types.ObjectId | null },
): Promise<ProjectDocDocument> {
  await assertProjectFound(projectId);

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    await assertNotPushed(projectId, input.kind);

    const latest = await ProjectDocModel.findOne({ projectId, kind: input.kind })
      .sort({ version: -1 })
      .select('version');

    try {
      return await ProjectDocModel.create({
        projectId,
        kind: input.kind,
        version: (latest?.version ?? 0) + 1,
        body: input.body,
        source: author.source,
        createdByUserId: author.userId,
      });
    } catch (error: unknown) {
      if (!(error instanceof MongoServerError && error.code === 11000)) throw error;
    }
  }

  throw new ConflictError(
    'Another version was saved at the same moment. Reload to see it, then save again.',
  );
}

/** Reads `?kind=`, defaulting to the only kind there is today. */
export function parseKind(raw: string | undefined): ProjectDocKind {
  if (raw === undefined) return 'claude-md';
  if ((PROJECT_DOC_KINDS as readonly string[]).includes(raw)) return raw as ProjectDocKind;
  throw new ValidationError('Those filters are not valid.', {
    kind: `must be one of: ${PROJECT_DOC_KINDS.join(', ')}`,
  });
}

async function assertNotPushed(projectId: string, kind: ProjectDocKind): Promise<void> {
  const pushed = await ProjectDocModel.exists({ projectId, kind, pushedAt: { $ne: null } });
  if (pushed) throw new ConflictError(PUSHED_MESSAGE);
}

async function assertProjectFound(projectId: string): Promise<void> {
  const exists = await ProjectModel.exists({ _id: projectId });
  if (!exists) throw new NotFoundError('That project');
}
