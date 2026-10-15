import { PROJECT_DOC_KINDS, PROJECT_DOC_SOURCES } from '@wroom/shared';
import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

/**
 * One version of a hands-off project's planning document. Versions are never
 * edited — a change is a new version — so there is no `updatedAt`.
 */
const projectDocSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    kind: { type: String, enum: PROJECT_DOC_KINDS as unknown as string[], required: true },
    version: { type: Number, required: true, min: 1 },
    body: { type: String, required: true },
    source: { type: String, enum: PROJECT_DOC_SOURCES as unknown as string[], required: true },
    /** Null when a machine token saved it — a machine is not a `users` row. */
    createdByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    pushedAt: { type: Date, default: null },
    pushedCommitSha: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'projectDocs' },
);

/** What makes two saves at once safe: the second to land on a number loses. */
projectDocSchema.index({ projectId: 1, kind: 1, version: 1 }, { unique: true });

export type ProjectDoc = InferSchemaType<typeof projectDocSchema>;
export type ProjectDocDocument = HydratedDocument<ProjectDoc>;

export const ProjectDocModel = model('ProjectDoc', projectDocSchema);
