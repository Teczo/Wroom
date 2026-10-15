import { PROJECT_DOC_KINDS, PROJECT_DOC_MAX_BODY_BYTES } from '../constants.js';
import { enumOf, object, string, withRules, type Infer } from '../validate.js';

/**
 * The body of `POST /api/projects/:projectId/docs`.
 *
 * `version`, `source`, `createdByUserId` and the push fields are all absent on
 * purpose. The service numbers the version, the caller's token says where it
 * came from, and only the push action may stamp `pushedAt`.
 *
 * The body is kept exactly as sent — no trimming — because it is a file that
 * will be committed, and its whitespace is part of it.
 */
export const projectDocCreateShape = {
  kind: enumOf(PROJECT_DOC_KINDS),
  body: withRules(string({ min: 1, trim: false }), (body, path, fail) => {
    const bytes = new TextEncoder().encode(body).length;

    if (bytes > PROJECT_DOC_MAX_BODY_BYTES) {
      fail(
        path,
        `This CLAUDE.md is ${Math.ceil(bytes / 1000)}kB. The limit is ${PROJECT_DOC_MAX_BODY_BYTES / 1000}kB.`,
      );
    }
  }),
};

export const projectDocCreateSchema = object(projectDocCreateShape);
export type ProjectDocCreateInput = Infer<typeof projectDocCreateShape>;
