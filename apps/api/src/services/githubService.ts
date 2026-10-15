import { env } from '../config/env.js';
import { AppError, ConflictError, UnprocessableError } from '../utils/errors.js';

/**
 * The only code in Wroom that talks to GitHub (CLAUDE.md §8, "GitHub writes").
 *
 * It writes three things, and they are the whole of it: find out whose token
 * this is, create a new private repo in that personal account, and put the
 * first file into a repo it has just created. Everything else here only reads
 * — a hands-off project's progress (WRM-106). There is deliberately no
 * function here that writes into a repo by name alone — the push service only
 * ever hands `putFile` a repo `createPrivateRepo` returned a moment earlier.
 *
 * Plain `fetch`, no SDK (no new dependency). The token is read from `env` and
 * goes nowhere but the Authorization header; no message built here quotes a
 * request or a header.
 */

const API = 'https://api.github.com';

type GitHubResponse = { status: number; body: Record<string, unknown> | null };

export type CreatedRepo = { fullName: string; owner: string; name: string; htmlUrl: string };

export function assertGitHubConfigured(): void {
  if (!env.github.configured) {
    throw new AppError(
      503,
      'INTERNAL',
      'GitHub is not connected on this environment yet. GITHUB_TOKEN is not set — see docs/GITHUB_TOKEN.md.',
    );
  }
}

/**
 * `timeoutMs` is for reads only. A write is left to finish: abandoning a repo
 * creation halfway would leave nobody knowing whether it happened.
 */
async function call(
  method: string,
  path: string,
  body?: unknown,
  timeoutMs?: number,
): Promise<GitHubResponse> {
  let response: Response;

  try {
    response = await fetch(`${API}${path}`, {
      method,
      signal: timeoutMs === undefined ? null : AbortSignal.timeout(timeoutMs),
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${env.github.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        // GitHub refuses a request with no User-Agent.
        'User-Agent': 'wroom-api',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new AppError(500, 'INTERNAL', 'GitHub could not be reached. Try again in a minute.');
  }

  const parsed = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  // A token GitHub will not accept, or one without the permission asked for.
  if (response.status === 401) {
    throw new UnprocessableError(
      'GitHub refused the token. It may have expired or been revoked — see docs/GITHUB_TOKEN.md.',
    );
  }
  if (response.status === 403) {
    throw new UnprocessableError(
      'GitHub says the token is not allowed to do this. It needs Administration and Contents write on all repositories — see docs/GITHUB_TOKEN.md.',
    );
  }

  return { status: response.status, body: parsed };
}

/** GitHub's own wording, which never contains the token. */
function githubMessage(response: GitHubResponse): string {
  const message = response.body?.message;
  return typeof message === 'string' ? message : `status ${response.status}`;
}

function unexpected(what: string, response: GitHubResponse): AppError {
  return new AppError(500, 'INTERNAL', `GitHub would not ${what} (${githubMessage(response)}).`);
}

/** The personal account the token belongs to — where every repo is created. */
export async function tokenOwner(): Promise<string> {
  const response = await call('GET', '/user');
  const login = response.body?.login;

  if (response.status !== 200 || typeof login !== 'string') {
    throw unexpected('say whose token this is', response);
  }
  return login;
}

export async function repoExists(owner: string, name: string): Promise<boolean> {
  const response = await call(
    'GET',
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
  );

  if (response.status === 200) return true;
  if (response.status === 404) return false;
  throw unexpected(`say whether ${owner}/${name} exists`, response);
}

/**
 * A new, empty, private repo in the token owner's personal account. Empty means
 * no README, licence or .gitignore, so the first commit is the only file.
 *
 * A name that is taken is a 409 — that is GitHub deciding, so two presses at
 * once cannot both create one.
 */
export async function createPrivateRepo(name: string): Promise<CreatedRepo> {
  const response = await call('POST', '/user/repos', {
    name,
    private: true,
    auto_init: false,
  });

  if (response.status === 422) {
    throw new ConflictError(
      `A repo called ${name} already exists on this GitHub account. Wroom only creates new repos — choose another name.`,
    );
  }

  const fullName = response.body?.full_name;
  const htmlUrl = response.body?.html_url;
  const owner = (response.body?.owner as { login?: unknown } | undefined)?.login;

  if (
    response.status !== 201 ||
    typeof fullName !== 'string' ||
    typeof htmlUrl !== 'string' ||
    typeof owner !== 'string'
  ) {
    throw unexpected(`create the repo ${name}`, response);
  }

  return { fullName, owner, name: fullName.split('/')[1] ?? name, htmlUrl };
}

/**
 * The first commit into a repo `createPrivateRepo` has just made. On an empty
 * repo the contents API creates the branch it is given, so this is what makes
 * `main` exist. Returns the commit sha.
 */
export async function putFirstFile(
  repo: CreatedRepo,
  input: { path: string; content: string; message: string; branch: string },
): Promise<string> {
  const response = await call(
    'PUT',
    `/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}/contents/${input.path}`,
    {
      message: input.message,
      content: Buffer.from(input.content, 'utf8').toString('base64'),
      branch: input.branch,
    },
  );

  const sha = (response.body?.commit as { sha?: unknown } | undefined)?.sha;
  if (response.status !== 201 || typeof sha !== 'string') {
    throw unexpected(`commit ${input.path} to ${repo.fullName}`, response);
  }
  return sha;
}

/**
 * Makes `branch` the repo's default. The account's own default branch setting
 * decides what an empty repo starts with, and it may not be `main`.
 */
export async function setDefaultBranch(repo: CreatedRepo, branch: string): Promise<void> {
  const response = await call(
    'PATCH',
    `/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}`,
    { default_branch: branch },
  );

  if (response.status !== 200 || response.body?.default_branch !== branch) {
    throw unexpected(`make ${branch} the default branch of ${repo.fullName}`, response);
  }
}

// --- Reads -----------------------------------------------------------------

/** A page that has not answered in this long is treated as unreachable. */
const READ_TIMEOUT_MS = 8_000;

/** GitHub's own ceiling for one page of a list. */
const PER_PAGE = 100;

function repoPath(fullName: string): string {
  const [owner = '', name = ''] = fullName.split('/');
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
}

async function read(path: string): Promise<GitHubResponse> {
  return call('GET', path, undefined, READ_TIMEOUT_MS);
}

export type LastCommit = { sha: string; message: string; date: string | null; url: string | null };

/** The newest commit on `branch`, or null when the branch has none yet. */
export async function lastCommit(fullName: string, branch: string): Promise<LastCommit | null> {
  const response = await read(`${repoPath(fullName)}/commits/${encodeURIComponent(branch)}`);

  // 409 is an empty repo; 422 and 404 are a branch that does not exist.
  if ([404, 409, 422].includes(response.status)) return null;

  const body = response.body as {
    sha?: unknown;
    html_url?: unknown;
    commit?: { message?: unknown; committer?: { date?: unknown }; author?: { date?: unknown } };
  } | null;

  if (response.status !== 200 || typeof body?.sha !== 'string') {
    throw unexpected(`read the last commit on ${branch}`, response);
  }

  const date = body.commit?.committer?.date ?? body.commit?.author?.date;
  return {
    sha: body.sha,
    message: typeof body.commit?.message === 'string' ? body.commit.message : '',
    date: typeof date === 'string' ? date : null,
    url: typeof body.html_url === 'string' ? body.html_url : null,
  };
}

/** Every branch name, first page only — a hands-off repo has a handful. */
export async function branchNames(fullName: string): Promise<string[]> {
  const response = await read(`${repoPath(fullName)}/branches?per_page=${PER_PAGE}`);
  if (response.status === 409) return []; // empty repo
  if (response.status !== 200 || !Array.isArray(response.body)) {
    throw unexpected('list the branches', response);
  }
  return (response.body as Array<{ name?: unknown }>)
    .map((branch) => branch.name)
    .filter((name): name is string => typeof name === 'string');
}

export type OpenPullRequest = { number: number; title: string; url: string | null };

export async function openPullRequests(fullName: string): Promise<OpenPullRequest[]> {
  const response = await read(`${repoPath(fullName)}/pulls?state=open&per_page=${PER_PAGE}`);
  if (response.status === 409) return []; // empty repo
  if (response.status !== 200 || !Array.isArray(response.body)) {
    throw unexpected('list the open pull requests', response);
  }
  return (response.body as Array<{ number?: unknown; title?: unknown; html_url?: unknown }>)
    .filter((pull) => typeof pull.number === 'number')
    .map((pull) => ({
      number: pull.number as number,
      title: typeof pull.title === 'string' ? pull.title : '',
      url: typeof pull.html_url === 'string' ? pull.html_url : null,
    }));
}

/** A text file's contents on `branch`, or null when it is not there. */
export async function fileText(
  fullName: string,
  path: string,
  branch: string,
): Promise<string | null> {
  const response = await read(
    `${repoPath(fullName)}/contents/${path}?ref=${encodeURIComponent(branch)}`,
  );
  if (response.status === 404 || response.status === 409) return null;

  const content = response.body?.content;
  if (response.status !== 200 || typeof content !== 'string') {
    throw unexpected(`read ${path}`, response);
  }
  return Buffer.from(content, 'base64').toString('utf8');
}
