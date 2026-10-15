/**
 * The prompt that starts a session on a hands-off project.
 *
 * A hands-off project has no feature cards to copy a ticket from. Its plan is
 * the CLAUDE.md in its repo, phases and all, so the prompt is the same every
 * time: read the plan, build the next phase, stop. Which phase is next is
 * worked out by the session from CHANGELOG.md — nothing in Wroom tracks it.
 *
 * String templating and nothing else, like `renderFeatureTicket`: no request,
 * no model, nothing stored. `<n>`, `<short-name>` and `<YYYY-MM-DD>` are left
 * in the text on purpose — the session fills them in, not Wroom.
 *
 * The input type names only the fields read, so this module does not churn
 * every time `Project` grows a field.
 */

export type KickoffPromptProject = {
  name: string;
  repo?: { fullName?: string | null } | null;
};

export function renderKickoffPrompt(project: KickoffPromptProject): string {
  const fullName = project.repo?.fullName?.trim() ?? '';

  return [
    `PROJECT  ${project.name}`,
    `REPO     ${fullName === '' ? '(not recorded)' : fullName}`,
    '',
    'Read CLAUDE.md in full before writing any code.',
    '',
    'HOW TO WORK',
    '1. Go back to main, pull the latest code, then create a new branch: phase-<n>-<short-name>.',
    '2. Build ONE phase only — the first phase not yet marked done in CHANGELOG.md.',
    '3. Do not start the next phase. Stop when this phase is done.',
    '4. If you are blocked, or a fix fails twice, stop and report. Do not retry.',
    '5. Never add a secret to the repo.',
    '',
    'WHEN THE PHASE IS DONE',
    '1. Add to CHANGELOG.md:  ## Phase <n> — done — <YYYY-MM-DD>',
    '   with a few plain lines on what a user can now do.',
    '2. Commit, push the branch, open a pull request.',
    '3. Report in plain language: DONE / NOT DONE / BLOCKED / NOTICED',
    '',
  ].join('\n');
}
