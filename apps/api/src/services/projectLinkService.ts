import type { Infer, ProjectLinks, ProjectLinkWithProject, projectLinkCreateShape } from '@wroom/shared';

import { ProjectLinkModel, type ProjectLinkDocument } from '../models/ProjectLink.js';
import { ProjectModel } from '../models/Project.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.js';

type LinkInput = Infer<typeof projectLinkCreateShape>;

/**
 * Typed edges between projects. Two lists rather than a graph: what this
 * project points at, and what points back at it.
 */

/** Attaches the project at the far end of each link, in one query for the set. */
async function withFarEnd(
  links: ProjectLinkDocument[],
  farEnd: (link: ProjectLinkDocument) => string,
): Promise<ProjectLinkWithProject[]> {
  if (links.length === 0) return [];

  const projects = await ProjectModel.find({
    _id: { $in: links.map(farEnd) },
  }).select('name slug status');

  const byId = new Map(projects.map((project) => [String(project._id), project]));

  return links.flatMap((link) => {
    const project = byId.get(farEnd(link));
    // A link whose far end no longer exists has nothing to show; deleting a
    // project removes its links, so this only guards against older data.
    if (!project) return [];

    return [
      {
        ...(link.toJSON() as Record<string, unknown>),
        project: {
          _id: String(project._id),
          name: project.name,
          slug: project.slug,
          status: project.status,
        },
      } as ProjectLinkWithProject,
    ];
  });
}

/**
 * Checked here rather than through `projectService` — that module deletes links
 * when a project goes, and importing it back would make the two circular.
 */
async function assertProjectFound(projectId: string): Promise<void> {
  const exists = await ProjectModel.exists({ _id: projectId });
  if (!exists) throw new NotFoundError('That project');
}

export async function listLinks(projectId: string): Promise<ProjectLinks> {
  await assertProjectFound(projectId);

  const [out, incoming] = await Promise.all([
    ProjectLinkModel.find({ fromProjectId: projectId }).sort({ createdAt: -1 }),
    ProjectLinkModel.find({ toProjectId: projectId }).sort({ createdAt: -1 }),
  ]);

  return {
    outgoing: await withFarEnd(out, (link) => String(link.toProjectId)),
    incoming: await withFarEnd(incoming, (link) => String(link.fromProjectId)),
    dependedOnByCount: incoming.filter((link) => link.type === 'depends-on').length,
  };
}

export async function createLink(
  fromProjectId: string,
  input: LinkInput,
): Promise<ProjectLinkDocument> {
  if (fromProjectId === input.toProjectId) {
    throw new ValidationError('A project cannot be linked to itself.', {
      toProjectId: 'Pick a different project — a project cannot be linked to itself.',
    });
  }

  await assertProjectFound(fromProjectId);
  await assertProjectExists(input.toProjectId);
  await assertNotDuplicate(fromProjectId, input.toProjectId, input.type);

  return ProjectLinkModel.create({ ...input, fromProjectId });
}

export async function getLink(id: string): Promise<ProjectLinkDocument> {
  const link = await ProjectLinkModel.findById(id);
  if (!link) throw new NotFoundError('That link');
  return link;
}

export async function updateLink(
  id: string,
  input: Partial<{ type: string; note: string }>,
): Promise<ProjectLinkDocument> {
  const link = await getLink(id);

  // Changing the type could otherwise produce exactly the duplicate that
  // creating one refuses.
  if (input.type && input.type !== link.type) {
    await assertNotDuplicate(
      String(link.fromProjectId),
      String(link.toProjectId),
      input.type,
      id,
    );
  }

  link.set(input);
  await link.save();
  return link;
}

export async function deleteLink(id: string): Promise<void> {
  const link = await getLink(id);
  await link.deleteOne();
}

/**
 * Links are the one thing a project delete takes with it. Everything else
 * refuses (CLAUDE.md, WRM-011), but half a link is not a record — it is a row
 * pointing at nothing.
 */
export async function deleteLinksForProject(projectId: string): Promise<number> {
  const { deletedCount } = await ProjectLinkModel.deleteMany({
    $or: [{ fromProjectId: projectId }, { toProjectId: projectId }],
  });

  return deletedCount;
}

async function assertProjectExists(projectId: string): Promise<void> {
  const exists = await ProjectModel.exists({ _id: projectId });
  if (!exists) {
    throw new ValidationError('That project does not exist.', {
      toProjectId: 'That project does not exist.',
    });
  }
}

async function assertNotDuplicate(
  fromProjectId: string,
  toProjectId: string,
  type: string,
  exceptId?: string,
): Promise<void> {
  const clash = await ProjectLinkModel.findOne({ fromProjectId, toProjectId, type }).select('_id');

  if (clash && String(clash._id) !== exceptId) {
    throw new ConflictError('These two projects are already linked that way.');
  }
}
