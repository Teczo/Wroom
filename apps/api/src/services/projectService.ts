import type { Infer, projectCreateShape } from '@wroom/shared';

import { AssetModel } from '../models/Asset.js';
import { CostModel } from '../models/Cost.js';
import { CredentialModel } from '../models/Credential.js';
import { DecisionModel } from '../models/Decision.js';
import { EnvironmentModel } from '../models/Environment.js';
import { FeatureModel } from '../models/Feature.js';
import { NoteModel } from '../models/Note.js';
import { ProductModel } from '../models/Product.js';
import { ProjectModel, type ProjectDocument } from '../models/Project.js';
import { ServiceModel } from '../models/Service.js';
import { TimeEntryModel } from '../models/TimeEntry.js';
import { ConflictError, NotFoundError, UnprocessableError } from '../utils/errors.js';
import type { Pagination } from '../utils/http.js';
import { containsFilter } from '../utils/query.js';
import { deleteLinksForProject } from './projectLinkService.js';
import { validateProjectDetails } from './projectTypeService.js';

type ProjectInput = Infer<typeof projectCreateShape>;

/**
 * Values within one field are an OR; the fields AND together. Empty arrays mean
 * "no opinion", not "match nothing".
 */
export type ProjectListFilters = {
  productId?: string[];
  status?: string[];
  projectTypeKey?: string[];
  tag?: string[];
  search?: string;
  includeArchived?: boolean;
};

/** Everything a delete would orphan. Nothing here is ever cascade-deleted. */
export type DeleteBlockers = Record<string, number>;

/** A project as it goes out over the wire, with its primary environment on it. */
export type ProjectResponse = Record<string, unknown> & {
  primaryEnvironment: { name: string; publicUrl: string | null } | null;
};

/**
 * Attaches each project's primary environment in one extra query for the whole
 * page, rather than a lookup per project. Nothing is denormalised onto
 * `projects` — the environment stays the single source of its own URL.
 */
async function withPrimaryEnvironments(
  projects: ProjectDocument[],
): Promise<ProjectResponse[]> {
  if (projects.length === 0) return [];

  const primaries = await EnvironmentModel.find({
    projectId: { $in: projects.map((project) => project._id) },
    isPrimary: true,
  }).select('projectId name publicUrl');

  const byProject = new Map(
    primaries.map((environment) => [
      String(environment.projectId),
      { name: environment.name, publicUrl: environment.publicUrl ?? null },
    ]),
  );

  return projects.map((project) => ({
    ...(project.toJSON() as Record<string, unknown>),
    primaryEnvironment: byProject.get(String(project._id)) ?? null,
  }));
}

/** The read path for a single project — same shape as a row of the list. */
export async function getProjectResponse(id: string): Promise<ProjectResponse> {
  const project = await getProject(id);
  const [response] = await withPrimaryEnvironments([project]);
  return response!;
}

export async function listProjects(
  filters: ProjectListFilters,
  pagination: Pagination,
): Promise<{ items: ProjectResponse[]; total: number }> {
  const query: Record<string, unknown> = {};
  if (filters.productId?.length) query.productId = { $in: filters.productId };
  if (filters.projectTypeKey?.length) query.projectTypeKey = { $in: filters.projectTypeKey };
  if (filters.tag?.length) query.tags = { $in: filters.tag };
  if (filters.search) query.name = containsFilter(filters.search);

  // Archived projects are out of the working list unless asked for. Filtering by
  // status explicitly wins, so `?status=archived` still returns them.
  if (filters.status?.length) query.status = { $in: filters.status };
  else if (!filters.includeArchived) query.status = { $ne: 'archived' };

  const [items, total] = await Promise.all([
    ProjectModel.find(query)
      .sort({ updatedAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    ProjectModel.countDocuments(query),
  ]);

  return { items: await withPrimaryEnvironments(items), total };
}

/**
 * The tags actually in use, for the filter list. There is no tags collection —
 * `docs/DATA_MODEL.md` keeps tags as an array on the project, so this is a
 * distinct over that array rather than a lookup.
 */
export async function listProjectTags(): Promise<string[]> {
  const tags = await ProjectModel.distinct('tags');
  return (tags as string[]).filter(Boolean).sort((a, b) => a.localeCompare(b));
}

export async function getProject(id: string): Promise<ProjectDocument> {
  const project = await ProjectModel.findById(id);
  if (!project) throw new NotFoundError('That project');
  return project;
}

export async function createProject(input: ProjectInput): Promise<ProjectDocument> {
  await assertProductExists(input.productId);
  await assertSlugFree(input.slug);

  const { details } = await validateProjectDetails(input.projectTypeKey, input.details);

  return ProjectModel.create({ ...input, details });
}

/** An update also reports what a type change threw away — see WRM-011. */
export type ProjectUpdateResult = {
  project: ProjectDocument;
  droppedDetailKeys: string[];
};

export async function updateProject(
  id: string,
  input: Partial<ProjectInput>,
): Promise<ProjectUpdateResult> {
  const project = await getProject(id);

  if (input.productId && input.productId !== String(project.productId)) {
    await assertProductExists(input.productId);
  }
  if (input.slug && input.slug !== project.slug) {
    await assertSlugFree(input.slug, id);
  }

  // Details are validated against whichever type the project will end up on.
  const nextTypeKey = input.projectTypeKey ?? project.projectTypeKey;
  const patch: Record<string, unknown> = { ...input };
  let droppedDetailKeys: string[] = [];

  if (input.details !== undefined || input.projectTypeKey !== undefined) {
    const merged = {
      ...(project.details as Record<string, unknown>),
      ...(input.details ?? {}),
    };
    const validated = await validateProjectDetails(nextTypeKey, merged);
    patch.details = validated.details;
    droppedDetailKeys = validated.droppedKeys;
  }

  // Archiving is a status change, and it stamps the date the model expects.
  if (input.status === 'archived' && project.status !== 'archived') {
    patch.archivedAt = new Date();
  } else if (input.status && input.status !== 'archived') {
    patch.archivedAt = null;
  }

  project.set(patch);
  await project.save();
  return { project, droppedDetailKeys };
}

/**
 * Refused while the project still owns records. Archiving is the intended way
 * to retire a project — deleting one is meant to be rare and deliberate.
 */
export async function deleteProject(id: string): Promise<void> {
  const project = await getProject(id);
  const owner = { projectId: project._id };

  // Every collection that carries a projectId. Anything missing from this list
  // would be silently orphaned by the delete below.
  const [features, costs, timeEntries, assets, environments, services, credentials, notes, decisions] =
    await Promise.all([
      FeatureModel.countDocuments(owner),
      CostModel.countDocuments(owner),
      TimeEntryModel.countDocuments(owner),
      AssetModel.countDocuments(owner),
      EnvironmentModel.countDocuments(owner),
      ServiceModel.countDocuments(owner),
      CredentialModel.countDocuments(owner),
      NoteModel.countDocuments(owner),
      DecisionModel.countDocuments(owner),
    ]);

  const blocking: DeleteBlockers = Object.fromEntries(
    Object.entries({
      features,
      costs,
      timeEntries,
      assets,
      environments,
      services,
      credentials,
      notes,
      decisions,
    }).filter(([, count]) => count > 0),
  );

  if (Object.keys(blocking).length > 0) {
    throw new ConflictError(
      'This project still has records attached. Set it to archived instead, or remove those records first.',
      blocking,
    );
  }

  if (project.portfolio.publishedAt) {
    throw new UnprocessableError(
      'This project is published to the portfolio. Unpublish it before deleting.',
    );
  }

  // Links are the one exception to refusing on reference: a link with one end
  // missing is not a record worth keeping, so it goes with the project. Every
  // other collection above still blocks the delete.
  await deleteLinksForProject(id);

  await project.deleteOne();
}

async function assertProductExists(productId: string): Promise<void> {
  const exists = await ProductModel.exists({ _id: productId });
  if (!exists) throw new UnprocessableError('That product does not exist.', { productId });
}

async function assertSlugFree(slug: string, exceptId?: string): Promise<void> {
  const clash = await ProjectModel.findOne({ slug }).select('_id');
  if (clash && String(clash._id) !== exceptId) {
    throw new ConflictError(`The slug '${slug}' is already used by another project.`);
  }
}
