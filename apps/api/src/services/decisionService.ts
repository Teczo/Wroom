import type { Infer, decisionCreateShape } from '@wroom/shared';
import type { Types } from 'mongoose';

import { DecisionModel, type DecisionDocument } from '../models/Decision.js';
import { ProjectModel } from '../models/Project.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.js';

type DecisionInput = Infer<typeof decisionCreateShape>;

/**
 * ADR-lite: what was chosen, why, and what was turned down.
 *
 * Superseding writes both fields onto the *same* decision — the one being
 * replaced — so it is a single document save and cannot half-apply. No
 * transaction is involved, and none is needed.
 */

export async function listDecisions(
  projectId: string,
  filters: { status?: string },
): Promise<DecisionDocument[]> {
  await assertProjectFound(projectId);

  const query: Record<string, unknown> = { projectId };
  if (filters.status) query.status = filters.status;

  // Newest decision first. Anything not yet dated falls to the bottom, which is
  // where an undated proposal belongs.
  return DecisionModel.find(query).sort({ decidedAt: -1, createdAt: -1 });
}

export async function getDecision(id: string): Promise<DecisionDocument> {
  const decision = await DecisionModel.findById(id);
  if (!decision) throw new NotFoundError('That decision');
  return decision;
}

export async function createDecision(
  projectId: string,
  input: DecisionInput,
  authorUserId: Types.ObjectId,
): Promise<DecisionDocument> {
  await assertProjectFound(projectId);

  if (input.supersededByDecisionId) {
    await assertReplacementUsable(projectId, input.supersededByDecisionId, null);
  }
  assertSupersededHasReplacement(input.status, input.supersededByDecisionId ?? null);

  return DecisionModel.create({ ...input, projectId, authorUserId });
}

export async function updateDecision(
  id: string,
  input: Partial<DecisionInput>,
): Promise<DecisionDocument> {
  const decision = await getDecision(id);

  const replacementId =
    input.supersededByDecisionId !== undefined
      ? input.supersededByDecisionId
      : decision.supersededByDecisionId
        ? String(decision.supersededByDecisionId)
        : null;

  if (replacementId) {
    await assertReplacementUsable(String(decision.projectId), replacementId, id);
  }

  const status = input.status ?? decision.status;
  assertSupersededHasReplacement(status, replacementId);

  decision.set(input);
  await decision.save();
  return decision;
}

/**
 * The whole supersede action: mark A replaced, and say what replaced it. Both
 * values live on A, so one save applies them together or not at all.
 */
export async function supersedeDecision(
  id: string,
  replacementId: string,
): Promise<DecisionDocument> {
  const decision = await getDecision(id);
  await assertReplacementUsable(String(decision.projectId), replacementId, id);

  decision.set({ status: 'superseded', supersededByDecisionId: replacementId });
  await decision.save();
  return decision;
}

export async function deleteDecision(id: string): Promise<void> {
  const decision = await getDecision(id);

  const replaces = await DecisionModel.countDocuments({ supersededByDecisionId: decision._id });
  if (replaces > 0) {
    throw new ConflictError(
      `${replaces} other ${replaces === 1 ? 'decision names' : 'decisions name'} this one as what replaced it. Point ${replaces === 1 ? 'it' : 'them'} elsewhere before deleting this.`,
      { supersedes: replaces },
    );
  }

  await decision.deleteOne();
}

async function assertProjectFound(projectId: string): Promise<void> {
  const exists = await ProjectModel.exists({ _id: projectId });
  if (!exists) throw new NotFoundError('That project');
}

/** A superseded decision has to say what replaced it, or the record lies. */
function assertSupersededHasReplacement(
  status: string | undefined,
  replacementId: string | null,
): void {
  if (status === 'superseded' && !replacementId) {
    throw new ValidationError('A superseded decision has to name what replaced it.', {
      supersededByDecisionId: 'Name the decision that replaced this one.',
    });
  }
}

async function assertReplacementUsable(
  projectId: string,
  replacementId: string,
  selfId: string | null,
): Promise<void> {
  if (selfId && replacementId === selfId) {
    throw new ValidationError('A decision cannot supersede itself.', {
      supersededByDecisionId: 'Pick a different decision — this one cannot replace itself.',
    });
  }

  const replacement = await DecisionModel.findById(replacementId).select('projectId');

  if (!replacement) {
    throw new ValidationError('That decision does not exist.', {
      supersededByDecisionId: 'That decision does not exist.',
    });
  }

  if (String(replacement.projectId) !== projectId) {
    throw new ValidationError('A decision can only be superseded by one on the same project.', {
      supersededByDecisionId: 'That decision belongs to a different project.',
    });
  }
}
