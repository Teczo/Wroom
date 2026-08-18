import { PROJECT_LINK_TYPES } from '@wroom/shared';
import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

/**
 * Relationships between projects. "What breaks if I kill this?" is every link
 * where `toProjectId` is the project and `type` is "depends-on".
 */
const projectLinkSchema = new Schema(
  {
    fromProjectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    toProjectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    type: { type: String, enum: PROJECT_LINK_TYPES as unknown as string[], required: true },
    note: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'projectLinks' },
);

projectLinkSchema.index({ fromProjectId: 1 });
projectLinkSchema.index({ toProjectId: 1 });

export type ProjectLink = InferSchemaType<typeof projectLinkSchema>;
export type ProjectLinkDocument = HydratedDocument<ProjectLink>;

export const ProjectLinkModel = model('ProjectLink', projectLinkSchema);
