import {
  PROJECT_DOC_KINDS,
  type ProjectDocCreateInput,
  type ProjectDocPushInput,
  type ProjectDocKind,
  type ProjectDocSource,
} from '@wroom/shared';
import { MongoServerError } from 'mongodb';
import type { Types } from 'mongoose';

import { ProjectModel } from '../models/Project.js';
import { ProjectDocModel, type ProjectDocDocument } from '../models/ProjectDoc.js';
import {
  AppError,
  ConflictError,
  NotFoundError,
  UnprocessableError,
  ValidationError,
} from '../utils/errors.js';
import {
  assertGitHubConfigured,
  createPrivateRepo,
  putFirstFile,
  repoExists,
  setDefaultBranch,
  tokenOwner,
  type CreatedRepo,
} from './githubService.js';

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

/** The branch every hands-off repo starts on. */
const DEFAULT_BRANCH = 'main';

export type PushResult = {
  doc: ProjectDocDocument;
  repo: { fullName: string; defaultBranch: string; url: string };
};

/**
 * Creates the project's repo and pushes the newest CLAUDE.md into it as the
 * first commit. After this the repo copy is the real one, and Wroom never
 * writes to that repo again (CLAUDE.md §8 and §13).
 *
 * The order is what keeps it safe:
 *
 * 1. Everything that can be refused without touching GitHub is refused first.
 * 2. The version is claimed by setting `pushedAt` before any GitHub call. That
 *    closes saves (they refuse once any version is pushed) and makes a second
 *    press lose here rather than at GitHub. The claim is released if anything
 *    after it fails.
 * 3. The repo is created new. A name that exists is refused before and, should
 *    one appear in between, by GitHub itself — never written into.
 */
export async function pushProjectDoc(
  projectId: string,
  kind: ProjectDocKind,
  input: ProjectDocPushInput,
): Promise<PushResult> {
  const project = await ProjectModel.findById(projectId);
  if (!project) throw new NotFoundError('That project');

  if (project.workMode !== 'hands-off') {
    throw new ConflictError(
      'Only a hands-off project gets a repo made from its CLAUDE.md. Switch the project to hands-off first.',
    );
  }

  await assertNotPushed(projectId, kind);

  const latest = await ProjectDocModel.findOne({ projectId, kind }).sort({ version: -1 });
  if (!latest) throw new UnprocessableError('There is no CLAUDE.md to push yet.');

  assertGitHubConfigured();

  const name = input.name ?? project.slug;
  const owner = await tokenOwner();

  if (await repoExists(owner, name)) {
    throw new ConflictError(
      `${owner}/${name} already exists on GitHub. Wroom only creates new repos — choose another name.`,
    );
  }

  await claim(projectId, kind, latest._id);

  let repo: CreatedRepo | null = null;
  let sha: string;

  try {
    repo = await createPrivateRepo(name);
    sha = await putFirstFile(repo, {
      path: 'CLAUDE.md',
      content: latest.body,
      message: `Add CLAUDE.md (version ${latest.version} from Wroom)`,
      branch: DEFAULT_BRANCH,
    });
    await setDefaultBranch(repo, DEFAULT_BRANCH);
  } catch (error: unknown) {
    await release(latest._id);

    // The repo exists but is not finished. Wroom will not write into it, so a
    // retry under the same name would only be refused — say what to do instead.
    if (repo) {
      const reason = error instanceof Error ? error.message : 'GitHub did not answer as expected.';
      throw new AppError(
        500,
        'INTERNAL',
        `${repo.fullName} was created, but the push did not finish: ${reason} Delete that repo on GitHub, or push again under another name.`,
      );
    }
    throw error;
  }

  latest.set({ pushedAt: new Date(), pushedCommitSha: sha });
  await latest.save();

  // Dotted paths, so the provider and the webhook flag are left as they were.
  await ProjectModel.updateOne(
    { _id: project._id },
    { $set: { 'repo.fullName': repo.fullName, 'repo.defaultBranch': DEFAULT_BRANCH } },
  );

  // Without the body — the caller already has it, and it can be 200 kB.
  const doc = await ProjectDocModel.findById(latest._id).select('-body');

  return {
    doc: doc ?? latest,
    repo: { fullName: repo.fullName, defaultBranch: DEFAULT_BRANCH, url: repo.htmlUrl },
  };
}

/**
 * Marks the version pushed before anything is sent to GitHub. Only one press
 * can move `pushedAt` off null, and if two presses claimed two different
 * versions, both see a second claim and both back out.
 */
async function claim(
  projectId: string,
  kind: ProjectDocKind,
  docId: Types.ObjectId,
): Promise<void> {
  const claimed = await ProjectDocModel.findOneAndUpdate(
    { _id: docId, pushedAt: null },
    { $set: { pushedAt: new Date() } },
  );
  if (!claimed) throw new ConflictError(PUSHED_MESSAGE);

  const pushed = await ProjectDocModel.countDocuments({
    projectId,
    kind,
    pushedAt: { $ne: null },
  });
  if (pushed > 1) {
    await release(docId);
    throw new ConflictError(PUSHED_MESSAGE);
  }
}

async function release(docId: Types.ObjectId): Promise<void> {
  await ProjectDocModel.updateOne(
    { _id: docId, pushedCommitSha: null },
    { $set: { pushedAt: null } },
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
