/**
 * HP accounting - the single, history-preserving model for maximum HP.
 *
 * Owner decision: maximum HP is ADDITIVE. Each level's gain (rolled / maximum / average, plus the CON modifier
 * applied when it was gained) is recorded once by ProgressionFinalizer and is never re-derived. This module
 * therefore never reconstructs a maximum from class tables. It only tracks which VARIABLE contributions are
 * already included in the stored maximum (the `hpLedger`) so a later change can be applied as a verified delta:
 *
 *   hpLedger = { conMod, featBonus, bonus, level }
 *     conMod    : CON modifier already folded into the per-level gains (0 for droids)
 *     featBonus : HP-affecting feat contribution already included (e.g. Toughness, MetaResourceFeatResolver)
 *     bonus     : system.hp.bonus already included
 *     level     : number of levels whose gains the stored maximum contains (CON adjusts retroactively over these)
 *
 * Delta = (conMod now - ledger.conMod) * ledger.level + (featBonus now - ledger.featBonus) + (bonus now - ledger.bonus)
 *
 * No ledger  => history is unknown: the stored maximum is PRESERVED and a baseline is recorded from the current
 *               contributions (no change to the maximum, nothing fabricated, no migration pass).
 * Unreadable => 'uncertain': report, do not mutate.
 * Pure: reads the actor, never writes. The only writer is ActorEngine.recomputeHP / the progression finalizer.
 */
import { MetaResourceFeatResolver } from '/systems/foundryvtt-swse/scripts/engine/feats/meta-resource-feat-resolver.js';

export const HP_LEDGER_PATH = 'system.progression.hpLedger';

function finite(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function conModifierFor(actor) {
  if (actor?.type === 'droid') return 0;
  const src = actor?.system?.attributes?.con ?? actor?.system?.abilities?.con ?? null;
  if (!src) return null; // cannot evaluate
  const parts = [src.base ?? 10, src.racial ?? 0, src.enhancement ?? 0, src.temp ?? 0].map(finite);
  if (parts.some(p => p === null)) return null;
  const total = parts.reduce((a, b) => a + b, 0);
  return Math.floor((total - 10) / 2);
}

/** Current variable contributions, or null fields when a value cannot be evaluated. */
export function readHpContributions(actor) {
  let featBonus = null;
  try { featBonus = finite(MetaResourceFeatResolver.getHitPointMaxBonus(actor)); } catch (_err) { featBonus = null; }
  return {
    conMod: conModifierFor(actor),
    featBonus,
    bonus: finite(actor?.system?.hp?.bonus ?? 0),
    level: Math.max(1, finite(actor?.system?.level) ?? 1),
  };
}

export function readHpLedger(actor) {
  const raw = actor?.system?.progression?.hpLedger;
  if (!raw || typeof raw !== 'object') return null;
  const conMod = finite(raw.conMod), featBonus = finite(raw.featBonus), bonus = finite(raw.bonus), level = finite(raw.level);
  if ([conMod, featBonus, bonus, level].some(v => v === null) || level < 1) return null;
  return { conMod, featBonus, bonus, level };
}

export function hasRecordedClassHistory(actor) {
  return Array.from(actor?.items ?? []).some(i => i?.type === 'class')
    || (Array.isArray(actor?.system?.progression?.classLevels) && actor.system.progression.classLevels.length > 0);
}

/**
 * @returns {{action:'preserve'|'baseline'|'unchanged'|'adjust'|'uncertain', reason:string, newMax:number, delta:number, ledger:object|null}}
 *   ledger = the ledger to persist with the action (baseline / adjust)
 */
export function planHpRecompute(actor, { requireClass = true } = {}) {
  const current = finite(actor?.system?.hp?.max);
  const keep = (action, reason, extra = {}) => ({ action, reason, newMax: current ?? 1, delta: 0, ledger: null, ...extra });
  if (current === null) return keep('uncertain', 'stored-max-unreadable');
  if (requireClass && !hasRecordedClassHistory(actor)) return keep('preserve', 'no-class-history');

  const now = readHpContributions(actor);
  if (now.conMod === null || now.featBonus === null || now.bonus === null) return keep('uncertain', 'contribution-unreadable');
  const snapshot = { conMod: now.conMod, featBonus: now.featBonus, bonus: now.bonus, level: now.level };

  const ledger = readHpLedger(actor);
  if (!ledger) return keep('baseline', 'no-ledger-history-unknown', { ledger: snapshot });

  const delta = (now.conMod - ledger.conMod) * ledger.level + (now.featBonus - ledger.featBonus) + (now.bonus - ledger.bonus);
  if (delta === 0) return keep('unchanged', 'already-accounted');
  return {
    action: 'adjust',
    reason: 'verified-contribution-delta',
    newMax: Math.max(1, current + delta),
    delta,
    ledger: { ...snapshot, level: ledger.level },
  };
}

/**
 * Audit view for reconciliation, from the SAME accounting. Never claims a definite discrepancy from an estimate:
 *  - 'consistent'    : ledger present and no pending delta
 *  - 'pending-delta' : a verified, accounted contribution differs from the ledger (ordinary recompute applies it)
 *  - 'incomplete'    : no ledger / no class history / unreadable -> insufficient evidence, NOT an error
 */
export function auditHp(actor) {
  const plan = planHpRecompute(actor);
  const status = plan.action === 'adjust' ? 'pending-delta'
    : plan.action === 'unchanged' ? 'consistent'
      : 'incomplete';
  return { status, reason: plan.reason, delta: plan.delta, storedMax: finite(actor?.system?.hp?.max), expectedMax: plan.action === 'adjust' ? plan.newMax : finite(actor?.system?.hp?.max) };
}

export default { HP_LEDGER_PATH, conModifierFor, readHpContributions, readHpLedger, planHpRecompute, auditHp };
