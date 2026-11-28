/**
 * Generic Force power check resolver (Force V2, Priority A). PURE: interprets the typed `activation.check` / `resolution` of a
 * certified definition against an already-rolled Use the Force total and the target's defenses. It applies nothing; callers
 * (ForceExecutor) decide what to do with the outcome through the existing engines.
 *
 * What is implemented from the typed contract (never from names or prose):
 *  - `fixed-dc`: highest DC tier whose DC is <= total; below the first tier is a failure.
 *  - `defense`, `fixed-dc-and-defense`, `defense-per-target`: tier (if any) AND the defense comparison, with the printed
 *    comparator from `powerRules.defenseComparator` ('at-least' | 'strictly-greater-than').
 *  - printed target-size defense adjustments (`resolution.defenseAdjustments`), caller-supplied conditional defense bonuses
 *    (Resist Force / Valor, FP-RD-012), and the outcome-gating `when` tokens `meets-tier-and-<defense>-defense` /
 *    `meets-dc-tier-but-fails-<defense>`.
 *
 * Deliberately NOT decided here (reported as unresolved, never defaulted):
 *  - the comparator when the definition does not state one (FP-RD-016),
 *  - modes without a complete typed contract here (`opposed`, `attack-substitution`, `defense-margin`),
 *  - an unknown target defense (never assumed to be 10).
 */
const DEFENSES = Object.freeze(['reflex', 'fortitude', 'will']);

// null / '' / booleans are NOT numbers here (Number(null) is 0, which would turn an unknown defense into 0).
const num = (v) => (v === null || v === undefined || v === '' || typeof v === 'boolean') ? null : (Number.isFinite(Number(v)) ? Number(v) : null);

/** The target's defense total, or null when it is not known (no default is invented). */
export function readTargetDefense(actor, defense) {
  if (!DEFENSES.includes(defense)) return null;
  const d = actor?.system?.derived?.defenses?.[defense] ?? actor?.system?.defenses?.[defense];
  return num(typeof d === 'object' && d !== null ? d.total : d);
}

function sizeBonus(definition, defense, targetSize) {
  const adj = (definition?.resolution?.defenseAdjustments ?? []).find((a) => a?.defense === defense && a?.reason === 'target-size');
  const key = String(targetSize ?? '').trim().toLowerCase();
  return adj && key ? (num(adj.bonuses?.[key]) ?? 0) : 0;
}

function tierFor(definition, total) {
  const tiers = (definition?.resolution?.dcTiers ?? []).filter((t) => num(t?.dc) !== null).sort((a, b) => a.dc - b.dc);
  let hit = null;
  for (const t of tiers) if (total >= t.dc) hit = t;
  return hit;
}

const opsFor = (list, wanted) => (Array.isArray(list) ? list : []).filter((op) => !op?.when || wanted.has(op.when));

/**
 * @param {object} definition certified Force V2 definition
 * @param {{total:number, defenseValue?:number|null, defenseBonuses?:number[], targetSize?:string}} input
 * @returns {{status:string, mode:string|null, tier:object|null, defense:string|null, defenseValue:number|null, effectiveDefense:number|null,
 *   comparator:string|null, meetsDefense:boolean|null, outcome:string, operations:object[], failureOperations:object[], notes:string[]}}
 */
export function resolveForceCheck(definition, { total, defenseValue = null, defenseBonuses = [], targetSize = null } = {}) {
  const check = definition?.activation?.check ?? {};
  const mode = check.mode ?? null;
  const out = { status: 'unresolved', mode, tier: null, defense: check.defense ?? null, defenseValue: null, effectiveDefense: null, comparator: null, meetsDefense: null, outcome: 'unresolved', operations: [], failureOperations: [], notes: [] };
  const roll = num(total);
  if (!definition || roll === null) { out.notes.push('no definition or no numeric total'); return out; }

  const usesTier = mode === 'fixed-dc' || mode === 'fixed-dc-and-defense';
  const usesDefense = mode === 'defense' || mode === 'fixed-dc-and-defense' || mode === 'defense-per-target';
  if (!usesTier && !usesDefense) { out.notes.push(`mode "${mode}" has no complete typed resolution here; adjudicate at the table`); return out; }

  if (usesTier) {
    out.tier = tierFor(definition, roll);
    const floor = num(check.minimumDC) ?? num(definition?.resolution?.dcTiers?.[0]?.dc);
    if (!out.tier || (floor !== null && roll < floor)) { out.status = 'resolved'; out.outcome = 'below-minimum-dc'; out.tier = null; return out; }
  }

  if (!usesDefense) {
    out.status = 'resolved'; out.outcome = 'tier-met';
    out.operations = opsFor(out.tier.operations, new Set());
    return out;
  }

  // defense gate
  const dKey = check.defense;
  const base = num(defenseValue);
  if (!DEFENSES.includes(dKey)) { out.notes.push('definition names no valid defense'); return out; }
  if (base === null) { out.notes.push(`target ${dKey} defense unknown; not assumed`); out.status = 'needs-target-defense'; out.outcome = 'needs-target-defense'; return out; }
  const bonus = (defenseBonuses ?? []).reduce((s, b) => s + (num(b) ?? 0), 0) + sizeBonus(definition, dKey, targetSize);
  out.defenseValue = base; out.effectiveDefense = base + bonus;
  const comparator = definition?.powerRules?.defenseComparator ?? null;
  out.comparator = comparator;
  if (comparator !== 'at-least' && comparator !== 'strictly-greater-than') {
    out.status = 'comparator-unspecified'; out.outcome = 'comparator-unspecified';
    out.notes.push('printed comparator not stated in the certified definition (FP-RD-016); the result and the defense are reported for the GM');
    return out;
  }
  out.meetsDefense = comparator === 'at-least' ? roll >= out.effectiveDefense : roll > out.effectiveDefense;
  out.status = 'resolved';
  const pass = new Set([`meets-tier-and-${dKey}-defense`]);
  const fail = new Set([`meets-dc-tier-but-fails-${dKey}`]);
  if (out.meetsDefense) {
    out.outcome = usesTier ? 'tier-and-defense-met' : 'defense-met';
    out.operations = opsFor(out.tier?.operations, pass);
  } else {
    out.outcome = usesTier ? 'tier-met-defense-failed' : 'defense-failed';
    out.failureOperations = opsFor(definition?.resolution?.onFailure, fail);
  }
  return out;
}
