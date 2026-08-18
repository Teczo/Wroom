import { GLOBAL_ROLES, type GlobalRole } from '@wroom/shared';
import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const userSchema = new Schema(
  {
    authProviderId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    avatarUrl: { type: String, default: null },
    globalRole: {
      type: String,
      enum: GLOBAL_ROLES as unknown as GlobalRole[],
      default: 'viewer',
    },
    /** Used to value timeEntries. 0 means "don't cost my own hours". */
    defaultHourlyRateAud: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'users' },
);

export type User = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<User>;

export const UserModel = model('User', userSchema);
