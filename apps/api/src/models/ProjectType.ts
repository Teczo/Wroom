import { FIELD_DEF_TYPES, SERVICE_ROLES } from '@wroom/shared';
import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

/**
 * Drives the schema-driven project forms — adding a project type is data, not a
 * code change. Portal forms render from `fieldDefs`; nothing is hardcoded per type.
 */
const fieldDefSchema = new Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, enum: FIELD_DEF_TYPES as unknown as string[], required: true },
    options: { type: [String], default: [] },
    required: { type: Boolean, default: false },
    group: { type: String, default: '' },
    helpText: { type: String, default: '' },
    /** e.g. { field: "usesOTA", equals: true } — hides the field until it matches. */
    showIf: {
      type: new Schema(
        { field: { type: String, required: true }, equals: { type: Schema.Types.Mixed } },
        { _id: false },
      ),
      default: null,
    },
  },
  { _id: false },
);

const projectTypeSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    label: { type: String, required: true },
    icon: { type: String, default: '' },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    fieldDefs: { type: [fieldDefSchema], default: [] },
    expectedServiceRoles: { type: [String], enum: SERVICE_ROLES as unknown as string[], default: [] },
    defaultTechStack: {
      frontend: { type: [String], default: [] },
      backend: { type: [String], default: [] },
    },
  },
  { timestamps: true, collection: 'projectTypes' },
);

export type ProjectType = InferSchemaType<typeof projectTypeSchema>;
export type ProjectTypeDocument = HydratedDocument<ProjectType>;

export const ProjectTypeModel = model('ProjectType', projectTypeSchema);
