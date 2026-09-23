/**
 * Roll Contribution Contracts — Roll Expression / Transformation Authority.
 *
 * Establishes the three-way distinction this module family exists to keep
 * separate, forever:
 *
 *   - a STATIC MODIFIER changes a number (ModifierEngine/ModifierUtils
 *     already own this; nothing here duplicates it — see
 *     legacy-keyword-adapter.js for the one place a legacy `*ModifierFormula`
 *     keyword resolves INTO a plain number for that existing pipeline);
 *   - a FORMULA TERM adds dice (a Foundry-formula-shaped string, e.g. "1d6",
 *     kept as a string until actual Roll execution — never rolled during
 *     preparation, never coerced to an expected/average integer);
 *   - a ROLL TRANSFORM changes how the base dice are rolled (keep-highest,
 *     keep-lowest, drop, explode, reroll — expressed as a canonical Foundry
 *     dice-term modifier, e.g. "kh1", never a competing SWSE syntax).
 *
 * `docs/audits/v2-roll-expression-transform-authority.md` is the full
 * record: current-system audit, confirmed Foundry grammar, classification
 * inventory, and migration log. This file is only the typed contract.
 */

/** The three RollContribution kinds this authority recognizes. */
export const ROLL_CONTRIBUTION_KIND = Object.freeze({
  STATIC_MODIFIER: 'staticModifier',
  FORMULA_TERM: 'formulaTerm',
  BASE_ROLL_TRANSFORM: 'baseRollTransform',
  RESULT_TRANSFORM: 'resultTransform'
});

/**
 * Classification labels used by the Phase A3 audit inventory (documented in
 * the audit, not enforced at runtime — this repo's actual `*ModifierFormula`
 * fields and dice producers are tagged with these in
 * docs/audits/v2-roll-expression-transform-authority.md's inventory table).
 */
export const FORMULA_SURFACE_CLASSIFICATION = Object.freeze({
  STATIC_MODIFIER: 'STATIC_MODIFIER',
  FORMULA_TERM: 'FORMULA_TERM',
  BASE_ROLL_TRANSFORM: 'BASE_ROLL_TRANSFORM',
  RESULT_TRANSFORM: 'RESULT_TRANSFORM',
  SPECIAL_EXECUTION: 'SPECIAL_EXECUTION',
  LEGACY_KEYWORD: 'LEGACY_KEYWORD',
  DEAD_UNWIRED: 'DEAD/UNWIRED'
});

/** Canonical, Foundry-native base-roll transform operations this authority understands. */
export const ROLL_TRANSFORM_OPERATION = Object.freeze({
  KEEP_HIGHEST: 'keepHighest',
  KEEP_LOWEST: 'keepLowest',
  DROP_HIGHEST: 'dropHighest',
  DROP_LOWEST: 'dropLowest',
  EXPLODE: 'explode',
  EXPLODE_ONCE: 'explodeOnce',
  // Foundry's documented reroll grammar has exactly two reroll modifiers:
  // "r" (reroll once) and "rr" (reroll recursively/repeatedly while the
  // threshold keeps matching) -- see foundryvtt.com's "Dice Modifiers"
  // reference. There is no ambiguous bare "reroll" and no "ro" ("explode
  // once" is "xo"; reroll's single-application form is bare "r", not
  // "ro" -- an earlier draft of this authority conflated the two).
  REROLL_ONCE: 'rerollOnce',
  REROLL_RECURSIVE: 'rerollRecursive'
});

/**
 * Build one RollContribution record. `kind`-specific payload fields
 * (`value`/`modifierType` for staticModifier, `formula`/`category` for
 * formulaTerm, `operation`/… for baseRollTransform/resultTransform) are
 * passed through `payload` verbatim — this function only normalizes the
 * shared envelope (provenance, target, priority, conditions) so every
 * producer emits a structurally consistent record.
 */
export function makeRollContribution({
  kind,
  sourceId = null,
  sourceName = 'Unknown Source',
  sourceType = null,
  target = null,
  priority = 0,
  conditions = null,
  provenance = null,
  ...payload
} = {}) {
  if (!Object.values(ROLL_CONTRIBUTION_KIND).includes(kind)) {
    throw new Error(`makeRollContribution: unknown kind "${kind}"`);
  }
  return {
    kind,
    sourceId,
    sourceName,
    sourceType,
    target,
    priority,
    conditions,
    provenance: provenance ?? sourceName,
    ...payload
  };
}

/**
 * One contribution-ledger entry, matching the ledger philosophy already
 * established for Attack/Damage ("Why did this roll apply/not apply this
 * source?"). `applied` is the only field callers should branch on;
 * `reason` is always present, even when applied === true (e.g. "kept as
 * the winning keep-highest transform").
 */
export function makeLedgerEntry({
  sourceId = null,
  sourceName = 'Unknown Source',
  sourceType = null,
  kind,
  detail = null,
  target = null,
  applied,
  reason
} = {}) {
  return { sourceId, sourceName, sourceType, kind, detail, target, applied: Boolean(applied), reason: reason ?? (applied ? 'applied' : 'not applied') };
}

export default {
  ROLL_CONTRIBUTION_KIND,
  FORMULA_SURFACE_CLASSIFICATION,
  ROLL_TRANSFORM_OPERATION,
  makeRollContribution,
  makeLedgerEntry
};
