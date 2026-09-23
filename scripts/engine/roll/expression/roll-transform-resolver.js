/**
 * Roll Transform Authority — the one canonical resolver for transformations
 * to the BASE dice roll (keep-highest, keep-lowest, drop, explode, reroll).
 *
 * Never invents SWSE syntax: every operation below compiles to the exact
 * Foundry dice-term modifier Foundry's own Roll grammar already defines
 * (kh/kl/dh/dl/x/xo/r/rr — see docs/audits/v2-roll-expression-transform-
 * authority.md's grammar section), and the resulting formula is always
 * re-validated through roll-formula-validator.js (Roll.validate()) before
 * being handed back — a transform this module "applies" is, by
 * construction, a string Foundry itself accepts.
 *
 * Base-roll scope: a transform can only be applied to a BARE `NdX` base
 * term (e.g. "1d20"), never to an arbitrary compound formula — this keeps
 * "the base roll" a structurally unambiguous concept, matching the
 * BASE ROLL VS BONUS DICE distinction the authority as a whole exists to
 * enforce (a keep-highest attack roll transforms the base d20; Sneak
 * Attack's extra dice are a separate FORMULA_TERM, never routed here).
 *
 * No declarative registry: this repo currently has no feat/talent metadata
 * that GRANTS a base-roll transform (confirmed by the Phase A audit — the
 * only two live producers are Force Point's keep-highest and
 * RollEngine.rollAbilityScore()'s "4d6dl", both migrated/kept as
 * specialized callers, not a generic rule-scanning authority). Rather than
 * manufacture a scanning registry with nothing real to scan,
 * `resolveRollTransforms()` accepts an explicit list of already-collected
 * RollContribution records (`context.rollTransforms`) — the natural seam
 * for a future declarative producer to plug into without this module's
 * conflict/compose logic changing at all.
 */

import { ROLL_CONTRIBUTION_KIND, ROLL_TRANSFORM_OPERATION, makeLedgerEntry } from "/systems/foundryvtt-swse/scripts/engine/roll/expression/roll-contribution-types.js";
import { validateRollFormula } from "/systems/foundryvtt-swse/scripts/engine/roll/expression/roll-formula-validator.js";

const BARE_DIE_TERM = /^(\d+)d(\d+)$/i;

function parseBareDieTerm(formula) {
  const match = BARE_DIE_TERM.exec(String(formula ?? '').trim());
  if (!match) return null;
  return { count: Number(match[1]), faces: Number(match[2]) };
}

/**
 * Collect the roll-transform candidates for this roll. Purely a pass-
 * through/normalization seam today (see file header) — it exists so
 * callers always go through one function, and so a future declarative
 * producer has exactly one place to plug into.
 */
export function resolveRollTransforms(actor, domain, context = {}) {
  const candidates = Array.isArray(context?.rollTransforms) ? context.rollTransforms : [];
  return candidates.filter(c => c?.kind === ROLL_CONTRIBUTION_KIND.BASE_ROLL_TRANSFORM);
}

function operationSignature(transform) {
  // Two transforms are "identical" (for duplicate-suppression) iff they
  // agree on operation + every numeric parameter that affects the
  // resulting formula.
  return JSON.stringify({
    op: transform.operation,
    diceCount: transform.diceCount ?? null,
    keep: transform.keep ?? null,
    dropCount: transform.dropCount ?? null,
    threshold: transform.threshold ?? null
  });
}

function compileOperation(baseTerm, transform) {
  const { faces } = baseTerm;
  const diceCount = Number(transform.diceCount ?? baseTerm.count);
  if (!Number.isFinite(diceCount) || diceCount < 1) return { ok: false, reason: 'Invalid diceCount for roll transform.' };

  switch (transform.operation) {
    case ROLL_TRANSFORM_OPERATION.KEEP_HIGHEST: {
      const keep = Number(transform.keep ?? 1);
      if (!Number.isFinite(keep) || keep < 1 || keep >= diceCount) return { ok: false, reason: `keepHighest requires 1 <= keep < diceCount (got keep=${keep}, diceCount=${diceCount}).` };
      return { ok: true, formula: `${diceCount}d${faces}kh${keep}` };
    }
    case ROLL_TRANSFORM_OPERATION.KEEP_LOWEST: {
      const keep = Number(transform.keep ?? 1);
      if (!Number.isFinite(keep) || keep < 1 || keep >= diceCount) return { ok: false, reason: `keepLowest requires 1 <= keep < diceCount (got keep=${keep}, diceCount=${diceCount}).` };
      return { ok: true, formula: `${diceCount}d${faces}kl${keep}` };
    }
    case ROLL_TRANSFORM_OPERATION.DROP_HIGHEST: {
      const dropCount = Number(transform.dropCount ?? 1);
      if (!Number.isFinite(dropCount) || dropCount < 1 || dropCount >= diceCount) return { ok: false, reason: `dropHighest requires 1 <= dropCount < diceCount (got dropCount=${dropCount}, diceCount=${diceCount}).` };
      return { ok: true, formula: `${diceCount}d${faces}dh${dropCount}` };
    }
    case ROLL_TRANSFORM_OPERATION.DROP_LOWEST: {
      const dropCount = Number(transform.dropCount ?? 1);
      if (!Number.isFinite(dropCount) || dropCount < 1 || dropCount >= diceCount) return { ok: false, reason: `dropLowest requires 1 <= dropCount < diceCount (got dropCount=${dropCount}, diceCount=${diceCount}).` };
      return { ok: true, formula: `${diceCount}d${faces}dl${dropCount}` };
    }
    case ROLL_TRANSFORM_OPERATION.EXPLODE: {
      const threshold = transform.threshold ? String(transform.threshold) : '';
      return { ok: true, formula: `${diceCount}d${faces}x${threshold}` };
    }
    case ROLL_TRANSFORM_OPERATION.EXPLODE_ONCE: {
      const threshold = transform.threshold ? String(transform.threshold) : '';
      return { ok: true, formula: `${diceCount}d${faces}xo${threshold}` };
    }
    case ROLL_TRANSFORM_OPERATION.REROLL_ONCE: {
      // Foundry's single-application reroll modifier is bare "r" (not
      // "ro" -- "ro" does not exist in Foundry's documented grammar;
      // "xo" is explode-once, a different modifier).
      if (!transform.threshold) return { ok: false, reason: 'rerollOnce requires an explicit threshold (e.g. "1", "<=2") — no implicit SWSE default is assumed.' };
      return { ok: true, formula: `${diceCount}d${faces}r${transform.threshold}` };
    }
    case ROLL_TRANSFORM_OPERATION.REROLL_RECURSIVE: {
      if (!transform.threshold) return { ok: false, reason: 'rerollRecursive requires an explicit threshold (e.g. "1", "<=2") — no implicit SWSE default is assumed.' };
      return { ok: true, formula: `${diceCount}d${faces}rr${transform.threshold}` };
    }
    default:
      return { ok: false, reason: `Unknown roll-transform operation "${transform.operation}".` };
  }
}

/**
 * Apply at most one winning base-roll transform to `baseFormula`.
 *
 * Conflict policy (documented, deterministic, non-combining — per this
 * authority's explicit instruction not to guess SWSE combination rules):
 *   - exact-duplicate transforms (same operation + params) from ANY number
 *     of sources collapse to a single application, others logged
 *     "duplicate identical transform suppressed";
 *   - distinct, non-identical transforms never combine into one formula;
 *     the highest-`priority` transform wins (ties broken by input order),
 *     every other distinct transform is suppressed with reason
 *     "conflicting base-roll transform (non-combining policy)";
 *   - `context.isTakeX` (Take 10/Take 20) suppresses every transform with
 *     reason "incompatible with Take 10/20" and returns the base formula
 *     unmodified — a transform never applies to a fixed take-X result.
 *
 * @returns {{ formula: string, ledger: Array }}
 */
export function applyRollTransforms(baseFormula, transforms = [], context = {}) {
  const ledger = [];

  if (context?.isTakeX) {
    for (const t of transforms) {
      ledger.push(makeLedgerEntry({ sourceId: t.sourceId, sourceName: t.sourceName, sourceType: t.sourceType, kind: ROLL_CONTRIBUTION_KIND.BASE_ROLL_TRANSFORM, detail: t.operation, target: t.target, applied: false, reason: 'incompatible with Take 10/20' }));
    }
    return { formula: baseFormula, ledger };
  }

  if (!transforms.length) return { formula: baseFormula, ledger };

  const baseTerm = parseBareDieTerm(baseFormula);
  if (!baseTerm) {
    for (const t of transforms) {
      ledger.push(makeLedgerEntry({ sourceId: t.sourceId, sourceName: t.sourceName, sourceType: t.sourceType, kind: ROLL_CONTRIBUTION_KIND.BASE_ROLL_TRANSFORM, detail: t.operation, target: t.target, applied: false, reason: `base formula "${baseFormula}" is not a bare NdX term; a roll transform can only apply to the base die.` }));
    }
    return { formula: baseFormula, ledger };
  }

  // Deduplicate exact-identical transforms first.
  const seen = new Map();
  const deduped = [];
  for (const t of transforms) {
    const sig = operationSignature(t);
    if (seen.has(sig)) {
      ledger.push(makeLedgerEntry({ sourceId: t.sourceId, sourceName: t.sourceName, sourceType: t.sourceType, kind: ROLL_CONTRIBUTION_KIND.BASE_ROLL_TRANSFORM, detail: t.operation, target: t.target, applied: false, reason: `duplicate identical transform suppressed (already applied via "${seen.get(sig)}")` }));
      continue;
    }
    seen.set(sig, t.sourceName ?? t.sourceId ?? 'unknown source');
    deduped.push(t);
  }

  if (!deduped.length) return { formula: baseFormula, ledger };

  if (deduped.length > 1) {
    // Non-combining conflict policy: highest priority wins, ties broken by
    // input order (Array.prototype.sort is stable).
    const ranked = [...deduped].sort((a, b) => Number(b.priority ?? 0) - Number(a.priority ?? 0));
    const winner = ranked[0];
    const losers = ranked.slice(1);
    const result = compileOperation(baseTerm, winner);
    for (const loser of losers) {
      ledger.push(makeLedgerEntry({ sourceId: loser.sourceId, sourceName: loser.sourceName, sourceType: loser.sourceType, kind: ROLL_CONTRIBUTION_KIND.BASE_ROLL_TRANSFORM, detail: loser.operation, target: loser.target, applied: false, reason: 'conflicting base-roll transform (non-combining policy); a different transform from this roll already won on priority' }));
    }
    if (!result.ok) {
      ledger.push(makeLedgerEntry({ sourceId: winner.sourceId, sourceName: winner.sourceName, sourceType: winner.sourceType, kind: ROLL_CONTRIBUTION_KIND.BASE_ROLL_TRANSFORM, detail: winner.operation, target: winner.target, applied: false, reason: result.reason }));
      return { formula: baseFormula, ledger };
    }
    const check = validateRollFormula(result.formula);
    if (!check.valid) {
      ledger.push(makeLedgerEntry({ sourceId: winner.sourceId, sourceName: winner.sourceName, sourceType: winner.sourceType, kind: ROLL_CONTRIBUTION_KIND.BASE_ROLL_TRANSFORM, detail: winner.operation, target: winner.target, applied: false, reason: `compiled formula failed validation: ${check.reason}` }));
      return { formula: baseFormula, ledger };
    }
    ledger.push(makeLedgerEntry({ sourceId: winner.sourceId, sourceName: winner.sourceName, sourceType: winner.sourceType, kind: ROLL_CONTRIBUTION_KIND.BASE_ROLL_TRANSFORM, detail: winner.operation, target: winner.target, applied: true, reason: `resultingBaseFormula: ${result.formula}` }));
    return { formula: result.formula, ledger };
  }

  const only = deduped[0];
  const result = compileOperation(baseTerm, only);
  if (!result.ok) {
    ledger.push(makeLedgerEntry({ sourceId: only.sourceId, sourceName: only.sourceName, sourceType: only.sourceType, kind: ROLL_CONTRIBUTION_KIND.BASE_ROLL_TRANSFORM, detail: only.operation, target: only.target, applied: false, reason: result.reason }));
    return { formula: baseFormula, ledger };
  }
  const check = validateRollFormula(result.formula);
  if (!check.valid) {
    ledger.push(makeLedgerEntry({ sourceId: only.sourceId, sourceName: only.sourceName, sourceType: only.sourceType, kind: ROLL_CONTRIBUTION_KIND.BASE_ROLL_TRANSFORM, detail: only.operation, target: only.target, applied: false, reason: `compiled formula failed validation: ${check.reason}` }));
    return { formula: baseFormula, ledger };
  }
  ledger.push(makeLedgerEntry({ sourceId: only.sourceId, sourceName: only.sourceName, sourceType: only.sourceType, kind: ROLL_CONTRIBUTION_KIND.BASE_ROLL_TRANSFORM, detail: only.operation, target: only.target, applied: true, reason: `resultingBaseFormula: ${result.formula}` }));
  return { formula: result.formula, ledger };
}

export default { resolveRollTransforms, applyRollTransforms };
