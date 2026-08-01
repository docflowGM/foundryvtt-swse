import { DSPEngine } from "/systems/foundryvtt-swse/scripts/engine/darkside/dsp-engine.js";
import { DarkSideScoreAccessPolicy } from "/systems/foundryvtt-swse/scripts/engine/darkside/dark-side-score-access-policy.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";

/**
 * Set-Dark-Side-Score click handler, extracted from character-sheet.js so
 * the authorization-check-and-mutate logic is independently testable
 * without loading the full sheet class. Recomputes authorization fresh on
 * every call — never trusts a caller-supplied "already authorized" flag,
 * the DOM's disabled attribute, or cached render context.
 *
 * @param {Actor} actor
 * @param {*} rawIndex - typically event.currentTarget.dataset.index
 * @param {object} [options]
 * @param {boolean} [options.sheetEditable=true]
 * @param {object} [options.user] - defaults to game.user
 * @returns {Promise<{applied: boolean, value?: number, reason?: string}>}
 */
export async function handleSetDarkSideScore(actor, rawIndex, { sheetEditable = true, user = game?.user } = {}) {
  const accessOptions = { user, sheetEditable };

  if (!DarkSideScoreAccessPolicy.canEdit(actor, accessOptions)) {
    ui?.notifications?.warn?.(DarkSideScoreAccessPolicy.getReadOnlyReason(actor, accessOptions));
    return { applied: false, reason: 'not-authorized' };
  }

  const index = Number(rawIndex);
  if (!Number.isFinite(index)) {
    return { applied: false, reason: 'malformed-index' };
  }

  const max = DSPEngine.getMax(actor);
  const value = Math.max(0, Math.min(Math.trunc(index), max));

  try {
    await ActorEngine.apply(actor, { update: { "system.darkSide.value": value } });
    return { applied: true, value };
  } catch (err) {
    ui?.notifications?.error?.(`Failed to set Dark Side Score: ${err.message}`);
    return { applied: false, reason: 'mutation-error' };
  }
}
