/**
 * Formula Term Authority — the one neutral collector for additional rolled
 * dice terms (Sneak Attack's "+1d6", Force Item's extra die, a critical
 * bonus formula, ...).
 *
 * A FORMULA_TERM contribution's `formula` stays a STRING all the way to
 * actual Roll execution:
 *   - never rolled during actor preparation;
 *   - never converted to an expected/average integer;
 *   - never made to participate in numeric Modifier stacking (that is
 *     ModifierEngine's domain — a formula term and a static modifier are
 *     structurally different contribution kinds, composed side by side,
 *     never merged into one number here).
 *
 * Where an existing specialized authority already correctly PRODUCES a
 * dice term (Sneak Attack's damage-talent-contributions.js, Force Item's
 * damage-item-dice-contributions.js, the critical-bonus-formula lookup in
 * combat-roll-math.js), this module does not replace that authority — it
 * is the shared validation/normalization seam a producer's raw formula
 * string passes through on its way into a RollContribution, so every
 * producer's dice terms carry the same structural guarantees (validated,
 * provenance-tagged, fail-closed on a malformed string) without
 * duplicating each other's collection logic.
 */

import { ROLL_CONTRIBUTION_KIND, makeRollContribution, makeLedgerEntry } from "/systems/foundryvtt-swse/scripts/engine/roll/expression/roll-contribution-types.js";
import { validateRollFormula } from "/systems/foundryvtt-swse/scripts/engine/roll/expression/roll-formula-validator.js";

/**
 * Normalize one raw producer-supplied dice term into a validated
 * FORMULA_TERM RollContribution, or a rejection ledger entry.
 *
 * @param {object} raw - { formula, sourceId, sourceName, sourceType, target, category, priority }
 * @returns {{ contribution: object|null, ledgerEntry: object }}
 */
export function resolveFormulaTerm(raw = {}) {
  const { formula, sourceId = null, sourceName = 'Unknown Source', sourceType = null, target = null, category = null, priority = 0 } = raw;

  const check = validateRollFormula(formula);
  if (!check.valid) {
    return {
      contribution: null,
      ledgerEntry: makeLedgerEntry({ sourceId, sourceName, sourceType, kind: ROLL_CONTRIBUTION_KIND.FORMULA_TERM, detail: formula, target, applied: false, reason: check.reason })
    };
  }

  const contribution = makeRollContribution({
    kind: ROLL_CONTRIBUTION_KIND.FORMULA_TERM,
    sourceId, sourceName, sourceType, target, priority,
    formula: String(formula).trim(),
    category
  });

  return {
    contribution,
    ledgerEntry: makeLedgerEntry({ sourceId, sourceName, sourceType, kind: ROLL_CONTRIBUTION_KIND.FORMULA_TERM, detail: contribution.formula, target, applied: true, reason: 'valid formula term' })
  };
}

/**
 * Resolve a batch of raw dice-term candidates. Each malformed candidate is
 * rejected individually (fail-closed for that one term) — one bad term
 * never discards the others, matching this authority's "must not crash
 * the entire attack/damage roll" requirement.
 *
 * @returns {{ terms: Array, ledger: Array }}
 */
export function resolveFormulaContributions(candidates = []) {
  const terms = [];
  const ledger = [];
  for (const raw of candidates) {
    const { contribution, ledgerEntry } = resolveFormulaTerm(raw);
    ledger.push(ledgerEntry);
    if (contribution) terms.push(contribution);
  }
  return { terms, ledger };
}

export default { resolveFormulaTerm, resolveFormulaContributions };
