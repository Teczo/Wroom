import type { GitHubStatus } from '@wroom/shared';

import { ProjectModel } from '../models/Project.js';
import { ConflictError, NotFoundError, UnprocessableError } from '../utils/errors.js';
import {
  assertGitHubConfigured,
  branchNames,
  fileText,
  lastCommit,
  openPullRequests,
} from './githubService.js';

/**
 * A hands-off project's progress, read live from its repo (docs/DATA_MODEL.md:
 * "hands-off progress is read live from GitHub. Nothing is stored for it").
 *
 * Read only. The answer is kept in this process's memory for five minutes per
 * project, so opening the page repeatedly asks GitHub once. A failure is never
 * kept — the next request tries again — and it does not evict the last good
 * answer either, which simply expires on time.
 */

const CACHE_MS = 5 * 60_000;

type Entry = { key: string; at: number; status: GitHubStatus };

/** Keyed by project; `key` also names the repo, so changing it misses the cache. */
const cache = new Map<string, Entry>();

/**
 * `## Phase 3 — done — 2026-10-20`, as the kickoff prompt asks a session to
 * write it. The dashes are matched loosely — an en dash or a hyphen typed in
 * its place still counts — because a session is not a typesetter.
 */
const PHASE_HEADING = /^##\s+Phase\s+(\d+)\s+[—–-]\s+done\s+[—–-]\s+(\S.*?)\s*$/gim;

/** The highest phase marked done; on a tie, the one further down the file. */
export function latestPhaseHeading(changelog: string): GitHubStatus['latestPhase'] {
  let latest: GitHubStatus['latestPhase'] = null;

  for (const match of changelog.matchAll(PHASE_HEADING)) {
    const phase = Number(match[1]);
    if (latest === null || phase >= latest.phase) {
      latest = { phase, date: match[2] ?? '', heading: match[0].trim() };
    }
  }

  return latest;
}

/** `owner/name`, from the free-text `repo.fullName` — a pasted URL included. */
function ownerAndName(fullName: string): string | null {
  const cleaned = fullName
    .trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/^\/+|\/+$/g, '');

  return /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(cleaned) ? cleaned : null;
}

export async function getGitHubStatus(projectId: string): Promise<GitHubStatus> {
  const project = await ProjectModel.findById(projectId).select('workMode repo');
  if (!project) throw new NotFoundError('That project');

  if (project.workMode !== 'hands-off') {
    throw new ConflictError('Progress from GitHub is shown for hands-off projects only.');
  }

  const fullName = ownerAndName(project.repo.fullName);
  if (!fullName) {
    throw new UnprocessableError(
      'This project has no GitHub repo recorded, or it is not in the owner/name form.',
    );
  }

  const branch = project.repo.defaultBranch.trim() || 'main';
  const key = `${fullName}@${branch}`;

  const cached = cache.get(projectId);
  if (cached && cached.key === key && Date.now() - cached.at < CACHE_MS) return cached.status;

  assertGitHubConfigured();

  const [commit, branches, pullRequests, changelog] = await Promise.all([
    lastCommit(fullName, branch),
    branchNames(fullName),
    openPullRequests(fullName),
    fileText(fullName, 'CHANGELOG.md', branch),
  ]);

  const status: GitHubStatus = {
    repo: { fullName, defaultBranch: branch, url: `https://github.com/${fullName}` },
    lastCommit: commit,
    branches: branches.filter((name) => name !== branch),
    pullRequests,
    latestPhase: changelog === null ? null : latestPhaseHeading(changelog),
    fetchedAt: new Date().toISOString(),
  };

  cache.set(projectId, { key, at: Date.now(), status });
  return status;
}
