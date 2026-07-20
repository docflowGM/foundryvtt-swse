import { FeatStep } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/steps/feat-step.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

const REGISTERED = Symbol.for('swse.progressionFeatChainHotfix.v1');
const PATCHED = Symbol.for('swse.progressionFeatChainHotfix.featStep.v1');

function normalizeChoice(choice) {
  if (choice == null) return '';
  if (typeof choice === 'string' || typeof choice === 'number') return String(choice);
  if (Array.isArray(choice)) return choice.map(normalizeChoice).sort().join('|');
  if (typeof choice === 'object') {
    return Object.entries(choice)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${key}:${normalizeChoice(value)}`)
      .join('|');
  }
  return String(choice);
}

function featSelectionSignature(shell) {
  const feats = Array.isArray(shell?.progressionSession?.draftSelections?.feats)
    ? shell.progressionSession.draftSelections.feats
    : [];

  return feats.map((feat, index) => {
    const id = feat?.id || feat?._id || feat?.name || index;
    const slot = feat?.slotKey || feat?.stepId || feat?.slotType || '';
    const choice = feat?.system?.selectedChoice
      ?? feat?.system?.selectedChoices
      ?? feat?.selectedChoice
      ?? null;
    return `${id}::${slot}::${normalizeChoice(choice)}`;
  }).join('||');
}

async function refreshFeatAvailability(step, shell) {
  const actor = shell?.actor;
  if (!actor || typeof step?._getLegalFeats !== 'function') return;

  const legalFeats = await step._getLegalFeats(actor, shell);
  step._legalFeats = Array.isArray(legalFeats) ? legalFeats : [];
  step._noChoicesAvailable = step._legalFeats.length === 0;

  if (typeof step._getSuggestedFeats === 'function') {
    step._suggestedFeats = await step._getSuggestedFeats(actor, step._legalFeats, shell);
  }
  step._refreshGroupedFeats?.();
  step._ensureDefaultFocusedFeat?.();
  step._ensureActiveCategory?.();

  swseLogger.debug('[FeatStep] Refreshed prerequisite legality after feat selection', {
    stepId: step?.descriptor?.stepId || null,
    selectedCount: step?._getCommittedFeatsForSlot?.(shell)?.length || 0,
    legalCount: step._legalFeats.length,
  });
}

function patchFeatStep() {
  const proto = FeatStep?.prototype;
  if (!proto || proto[PATCHED] || typeof proto.onItemCommitted !== 'function') return;

  const originalOnItemCommitted = proto.onItemCommitted;
  proto.onItemCommitted = async function patchedFeatCommit(item, shell) {
    const before = featSelectionSignature(shell);
    const result = await originalOnItemCommitted.call(this, item, shell);
    const after = featSelectionSignature(shell);

    // Cancelled, rejected, or focus-only interactions do not need a full legality pass.
    if (before === after) return result;

    try {
      await refreshFeatAvailability(this, shell);
    } catch (error) {
      swseLogger.error('[FeatStep] Failed to refresh chained feat prerequisites', {
        stepId: this?.descriptor?.stepId || null,
        feat: item?.name || item?.id || item?._id || null,
        error: error?.message || String(error),
      });
    }

    return result;
  };

  Object.defineProperty(proto, PATCHED, { value: true });
}

export function registerProgressionFeatChainHotfix() {
  if (globalThis[REGISTERED]) return;
  globalThis[REGISTERED] = true;
  patchFeatStep();
}
