import type { FieldDefInput, FieldDefType, Infer, projectTypeCreateShape } from '@wroom/shared';

import { ProjectModel } from '../models/Project.js';
import { ProjectTypeModel, type ProjectTypeDocument } from '../models/ProjectType.js';
import { ConflictError, NotFoundError, UnprocessableError, ValidationError } from '../utils/errors.js';

type ProjectTypeInput = Infer<typeof projectTypeCreateShape>;

export async function listProjectTypes(includeInactive = false): Promise<ProjectTypeDocument[]> {
  const filter = includeInactive ? {} : { active: true };
  return ProjectTypeModel.find(filter).sort({ sortOrder: 1, label: 1 });
}

export async function getProjectTypeByKey(key: string): Promise<ProjectTypeDocument> {
  const projectType = await ProjectTypeModel.findOne({ key });
  if (!projectType) throw new NotFoundError(`Project type '${key}'`);
  return projectType;
}

export async function getProjectType(id: string): Promise<ProjectTypeDocument> {
  const projectType = await ProjectTypeModel.findById(id);
  if (!projectType) throw new NotFoundError('That project type');
  return projectType;
}

/** What a write to a project type answers with, including anything it orphaned. */
export type ProjectTypeWriteResult = {
  projectType: ProjectTypeDocument;
  /**
   * Field keys that existed before and no longer do. Their values stay in
   * `projects.details` untouched — removing a field hides data, never deletes
   * it — and the caller is told so it can say as much.
   */
  removedFieldKeys: string[];
};

export async function createProjectType(input: ProjectTypeInput): Promise<ProjectTypeWriteResult> {
  const clash = await ProjectTypeModel.findOne({ key: input.key }).select('_id');
  if (clash) {
    throw new ConflictError(`A project type with the key '${input.key}' already exists.`);
  }

  assertFieldDefsCoherent(input.fieldDefs ?? []);

  return { projectType: await ProjectTypeModel.create(input), removedFieldKeys: [] };
}

export async function updateProjectType(
  id: string,
  input: Partial<ProjectTypeInput>,
): Promise<ProjectTypeWriteResult> {
  const projectType = await getProjectType(id);

  // The key is how projects point at their type; changing it would orphan every
  // one of them, so it is fixed at creation.
  if (input.key !== undefined && input.key !== projectType.key) {
    throw new ValidationError('A project type key cannot be changed once it exists.', {
      key: `This type is '${projectType.key}'. Projects reference it by that key, so it cannot be renamed.`,
    });
  }

  const before = projectType.fieldDefs.map((fieldDef) => fieldDef.key);

  if (input.fieldDefs) assertFieldDefsCoherent(input.fieldDefs);

  projectType.set(input);
  await projectType.save();

  const after = new Set(projectType.fieldDefs.map((fieldDef) => fieldDef.key));

  return {
    projectType,
    removedFieldKeys: before.filter((key) => !after.has(key)),
  };
}

/** Refused while any project is of this type — those forms would lose their shape. */
export async function deleteProjectType(id: string): Promise<void> {
  const projectType = await getProjectType(id);
  const projects = await ProjectModel.countDocuments({ projectTypeKey: projectType.key });

  if (projects > 0) {
    throw new ConflictError(
      `${projects} project${projects === 1 ? ' is' : 's are'} of this type. Deactivate it instead — that hides it from the create form and leaves those projects alone.`,
      { projects },
    );
  }

  await projectType.deleteOne();
}

/**
 * The rules that need the whole set of field definitions in view: keys have to
 * be unique within the type, and a `showIf` has to point at a sibling.
 */
function assertFieldDefsCoherent(fieldDefs: FieldDefInput[]): void {
  const seen = new Set<string>();

  for (const fieldDef of fieldDefs) {
    if (seen.has(fieldDef.key)) {
      throw new ValidationError(`Two fields both use the key '${fieldDef.key}'.`, {
        fieldDefs: `'${fieldDef.key}' is used by more than one field. Keys have to be unique within a type.`,
      });
    }
    seen.add(fieldDef.key);
  }

  for (const fieldDef of fieldDefs) {
    const showIf = fieldDef.showIf;
    if (!showIf) continue;

    if (showIf.field === fieldDef.key) {
      throw new ValidationError(`'${fieldDef.label}' cannot depend on itself.`, {
        fieldDefs: `'${fieldDef.key}' has a show-if pointing at itself.`,
      });
    }

    if (!seen.has(showIf.field)) {
      throw new ValidationError(
        `'${fieldDef.label}' is shown when '${showIf.field}' matches, but this type has no field called '${showIf.field}'.`,
        { fieldDefs: `Unknown field '${showIf.field}' in the show-if on '${fieldDef.key}'.` },
      );
    }
  }
}

function describeType(type: FieldDefType): string {
  switch (type) {
    case 'number':
      return 'a number';
    case 'boolean':
      return 'true or false';
    case 'multiselect':
      return 'a list of the allowed options';
    case 'date':
      return 'a date';
    case 'url':
      return 'a URL';
    default:
      return 'text';
  }
}

function valueMatchesType(value: unknown, type: FieldDefType, options: string[]): boolean {
  switch (type) {
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'select':
      return typeof value === 'string' && (options.length === 0 || options.includes(value));
    case 'multiselect':
      return (
        Array.isArray(value) &&
        value.every(
          (entry) =>
            typeof entry === 'string' && (options.length === 0 || options.includes(entry)),
        )
      );
    case 'date':
      return typeof value === 'string' && !Number.isNaN(new Date(value).getTime());
    case 'url':
      if (typeof value !== 'string') return false;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    default:
      return typeof value === 'string';
  }
}

function isVisible(
  showIf: { field: string; equals?: unknown } | null | undefined,
  details: Record<string, unknown>,
): boolean {
  if (!showIf) return true;
  return details[showIf.field] === showIf.equals;
}

function isEmptyValue(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  );
}

/** What a details validation kept, and what it had to throw away. */
export type ValidatedDetails = {
  details: Record<string, unknown>;
  /** Keys that held a real value but have no field on the target type. */
  droppedKeys: string[];
};

/**
 * Validates `projects.details` against the project type's `fieldDefs`.
 *
 * This is the schema-driven half of the form contract: the portal renders from
 * the same definitions, so the two cannot drift. Keys with no matching fieldDef
 * are dropped rather than stored — and reported back, because on a type change
 * that is data leaving the record and the caller has to be able to say so.
 */
export async function validateProjectDetails(
  projectTypeKey: string,
  details: Record<string, unknown>,
): Promise<ValidatedDetails> {
  const projectType = await getProjectTypeByKey(projectTypeKey);

  const clean: Record<string, unknown> = {};
  const problems: Record<string, string> = {};

  for (const fieldDef of projectType.fieldDefs) {
    const { key, label, type, options, required } = fieldDef;
    if (!isVisible(fieldDef.showIf, details)) continue;

    const value = details[key];
    const isEmpty = isEmptyValue(value);

    if (isEmpty) {
      if (required) problems[`details.${key}`] = `${label} is required.`;
      continue;
    }

    if (!valueMatchesType(value, type as FieldDefType, options)) {
      problems[`details.${key}`] = `${label} must be ${describeType(type as FieldDefType)}.`;
      continue;
    }

    clean[key] = value;
  }

  if (Object.keys(problems).length > 0) {
    throw new UnprocessableError(
      `Some ${projectType.label} fields need attention.`,
      problems,
    );
  }

  const droppedKeys = Object.keys(details).filter(
    (key) => !(key in clean) && !isEmptyValue(details[key]),
  );

  return { details: clean, droppedKeys };
}
