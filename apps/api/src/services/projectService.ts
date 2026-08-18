import type { Infer, projectCreateShape } from '@wroom/shared';

import { AssetModel } from '../models/Asset.js';
import { CostModel } from '../models/Cost.js';
import { FeatureModel } from '../models/Feature.js';
import { ProductModel } from '../models/Product.js';
import { ProjectModel, type ProjectDocument } from '../models/Project.js';
import { TimeEntryModel } from '../models/TimeEntry.js';
import { ConflictError, NotFoundError, UnprocessableError } from '../utils/errors.js';
import type { Pagination } from '../utils/http.js';
import { containsFilter } from '../utils/query.js';
import { validateProjectDetails } from './projectTypeService.js';

type ProjectInput = Infer<typeof projectCreateShape>;

export type ProjectListFilters = {
  productId?: string;
  status?: string;
  projectTypeKey?: string;
  search?: string;
};

export async function listProjects(
  filters: ProjectListFilters,
  pagination: Pagination,
): Promise<{ items: ProjectDocument[]; total: number }> {
  const query: Record<string, unknown> = {};
  if (filters.productId) query.productId = filters.productId;
  if (filters.status) query.status = filters.status;
  if (filters.projectTypeKey) query.projectTypeKey = filters.projectTypeKey;
  if (filters.search) query.name = containsFilter(filters.search);

  const [items, total] = await Promise.all([
    ProjectModel.find(query)
      .sort({ updatedAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    ProjectModel.countDocuments(query),
  ]);

  return { items, total };
}

export async function getProject(id: string): Promise<ProjectDocument> {
  const project = await ProjectModel.findById(id);
  if (!project) throw new NotFoundError('That project');
  return project;
}

export async function createProject(input: ProjectInput): Promise<ProjectDocument> {
  await assertProductExists(input.productId);
  await assertSlugFree(input.slug);

  const details = await validateProjectDetails(input.projectTypeKey, input.details);

  return ProjectModel.create({ ...input, details });
}

export async function updateProject(
  id: string,
  input: Partial<ProjectInput>,
): Promise<ProjectDocument> {
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
  if (input.details !== undefined || input.projectTypeKey !== undefined) {
    const merged = {
      ...(project.details as Record<string, unknown>),
      ...(input.details ?? {}),
    };
    patch.details = await validateProjectDetails(nextTypeKey, merged);
  }

  // Archiving is a status change, and it stamps the date the model expects.
  if (input.status === 'archived' && project.status !== 'archived') {
    patch.archivedAt = new Date();
  } else if (input.status && input.status !== 'archived') {
    patch.archivedAt = null;
  }

  project.set(patch);
  await project.save();
  return project;
}

/**
 * Refused while the project still owns records. Archiving is the intended way
 * to retire a project — deleting one is meant to be rare and deliberate.
 */
export async function deleteProject(id: string): Promise<void> {
  const project = await getProject(id);

  const [features, costs, timeEntries, assets] = await Promise.all([
    FeatureModel.countDocuments({ projectId: project._id }),
    CostModel.countDocuments({ projectId: project._id }),
    TimeEntryModel.countDocuments({ projectId: project._id }),
    AssetModel.countDocuments({ projectId: project._id }),
  ]);

  const blocking = { features, costs, timeEntries, assets };
  const totalBlocking = features + costs + timeEntries + assets;

  if (totalBlocking > 0) {
    throw new ConflictError(
      'This project still has features, costs, time or media attached. Set it to archived instead, or remove those records first.',
      blocking,
    );
  }

  if (project.portfolio.publishedAt) {
    throw new UnprocessableError(
      'This project is published to the portfolio. Unpublish it before deleting.',
    );
  }

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
