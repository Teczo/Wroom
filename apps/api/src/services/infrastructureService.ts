import type { Infer, environmentCreateShape, serviceCreateShape } from '@wroom/shared';

import { EnvironmentModel, type EnvironmentDocument } from '../models/Environment.js';
import { ServiceModel, type ServiceDocument } from '../models/Service.js';
import { ConflictError, NotFoundError, UnprocessableError } from '../utils/errors.js';
import { getProject } from './projectService.js';

type EnvironmentInput = Infer<typeof environmentCreateShape>;
type ServiceInput = Infer<typeof serviceCreateShape>;

/**
 * Environments and the services inside them. This is the fix for a flattened
 * infrastructure spreadsheet: one project has several environments, and each
 * hosted thing belongs to exactly one of them.
 */

// --- environments -----------------------------------------------------------

export async function listEnvironments(projectId: string): Promise<EnvironmentDocument[]> {
  await getProject(projectId);
  return EnvironmentModel.find({ projectId }).sort({ isPrimary: -1, name: 1 });
}

export async function getEnvironment(
  projectId: string,
  id: string,
): Promise<EnvironmentDocument> {
  const environment = await EnvironmentModel.findOne({ _id: id, projectId });
  if (!environment) throw new NotFoundError('That environment');
  return environment;
}

export async function createEnvironment(
  projectId: string,
  input: EnvironmentInput,
): Promise<EnvironmentDocument> {
  await getProject(projectId);

  const clash = await EnvironmentModel.findOne({ projectId, name: input.name }).select('_id');
  if (clash) {
    throw new ConflictError(`This project already has a '${input.name}' environment.`);
  }

  const environment = await EnvironmentModel.create({ ...input, projectId });
  if (environment.isPrimary) await demoteOtherPrimaries(projectId, String(environment._id));

  return environment;
}

export async function updateEnvironment(
  projectId: string,
  id: string,
  input: Partial<EnvironmentInput>,
): Promise<EnvironmentDocument> {
  const environment = await getEnvironment(projectId, id);

  if (input.name && input.name !== environment.name) {
    const clash = await EnvironmentModel.findOne({ projectId, name: input.name }).select('_id');
    if (clash) throw new ConflictError(`This project already has a '${input.name}' environment.`);
  }

  environment.set(input);
  await environment.save();

  if (input.isPrimary) await demoteOtherPrimaries(projectId, id);

  return environment;
}

export async function deleteEnvironment(projectId: string, id: string): Promise<void> {
  const environment = await getEnvironment(projectId, id);
  const serviceCount = await ServiceModel.countDocuments({ environmentId: environment._id });

  if (serviceCount > 0) {
    throw new ConflictError(
      `This environment still has ${serviceCount} service(s). Remove them first.`,
      { serviceCount },
    );
  }

  await environment.deleteOne();
}

/** Exactly one environment per project is the one shown on the project card. */
async function demoteOtherPrimaries(projectId: string, keepId: string): Promise<void> {
  await EnvironmentModel.updateMany(
    { projectId, _id: { $ne: keepId } },
    { $set: { isPrimary: false } },
  );
}

// --- services ---------------------------------------------------------------

export async function listServices(
  projectId: string,
  filters: { environmentId?: string; role?: string },
): Promise<ServiceDocument[]> {
  await getProject(projectId);

  const query: Record<string, unknown> = { projectId };
  if (filters.environmentId) query.environmentId = filters.environmentId;
  if (filters.role) query.role = filters.role;

  return ServiceModel.find(query).sort({ role: 1, resourceName: 1 });
}

export async function getService(projectId: string, id: string): Promise<ServiceDocument> {
  const service = await ServiceModel.findOne({ _id: id, projectId });
  if (!service) throw new NotFoundError('That service');
  return service;
}

export async function createService(
  projectId: string,
  input: ServiceInput,
): Promise<ServiceDocument> {
  await getProject(projectId);
  await assertEnvironmentBelongsToProject(projectId, input.environmentId);

  return ServiceModel.create({ ...input, projectId });
}

export async function updateService(
  projectId: string,
  id: string,
  input: Partial<ServiceInput>,
): Promise<ServiceDocument> {
  const service = await getService(projectId, id);

  if (input.environmentId && input.environmentId !== String(service.environmentId)) {
    await assertEnvironmentBelongsToProject(projectId, input.environmentId);
  }

  service.set(input);
  await service.save();
  return service;
}

export async function deleteService(projectId: string, id: string): Promise<void> {
  const service = await getService(projectId, id);
  await service.deleteOne();
}

async function assertEnvironmentBelongsToProject(
  projectId: string,
  environmentId: string,
): Promise<void> {
  const exists = await EnvironmentModel.exists({ _id: environmentId, projectId });
  if (!exists) {
    throw new UnprocessableError('That environment does not belong to this project.', {
      environmentId,
    });
  }
}
