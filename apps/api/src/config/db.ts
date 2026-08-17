import mongoose from 'mongoose';

import { env } from './env.js';

/**
 * A single Mongo connection for the process. Indexes declared on the schemas are
 * built on connect in development; in production they are expected to exist
 * already, so a deploy does not block on an index build.
 */
export async function connectDatabase(): Promise<void> {
  mongoose.set('strictQuery', true);
  mongoose.set('autoIndex', !env.isProduction);

  await mongoose.connect(env.mongodbUri);
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

export type DatabaseState =
  | 'disconnected'
  | 'connected'
  | 'connecting'
  | 'disconnecting'
  | 'uninitialized';

export function databaseState(): DatabaseState {
  switch (mongoose.connection.readyState) {
    case 1:
      return 'connected';
    case 2:
      return 'connecting';
    case 3:
      return 'disconnecting';
    case 99:
      return 'uninitialized';
    default:
      return 'disconnected';
  }
}
