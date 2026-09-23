/**
 * Damage SSOT — real, stable, importable talent damage-dice contribution
 * producer.
 *
 * Damage audit correction #1 (docs/audits/v2-damage-modifier-authority-
 * audit-correction-1.md §6) confirmed `TalentEffectEngine.calculateDamageBonus`
 * has never existed as a real class method anywhere in the codebase — the
 * only implementation was a runtime monkey-patch installed by
 * scripts/patches/runtime-bugfix-hotfixes.js#installTalentEffectDamageCompatibility(),
 * a load-order dependency the canonical Damage composition must not
 * inherit. The logic itself (Sneak Attack: countTalentsNamed × d6, gated
 * on the target being Flat-Footed or otherwise denied its Dexterity bonus)
 * was confirmed rules-correct and is moved here verbatim as the one real,
 * production authority both the legacy monkey-patch and the new
 * resolveDamageComposition() now consume — not duplicated.
 *
 * "Skirmisher" (also named in damage.js's old doc comment) was confirmed
 * to be an ATTACK BONUS talent (+1 on the attack roll after qualifying
 * movement; "Improved Skirmisher" grants +1 to Defenses) — it produces no
 * damage at all and is deliberately not modeled here.
 */

import { resolveFormulaContributions } from "/systems/foundryvtt-swse/scripts/engine/roll/expression/roll-formula-term-resolver.js";

function countTalentsNamed(actor, name) {
  const wanted = String(name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (!wanted) return 0;
  try {
    return Array.from(actor?.items ?? []).filter(item => item?.type === 'talent'
      && String(item?.name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '') === wanted).length;
  } catch (_err) {
    return 0;
  }
}

function damageContextTarget(context = {}) {
  return context.target?.actor ?? context.targetActor ?? context.target ?? game?.user?.targets?.first?.()?.actor ?? null;
}

/**
 * "Flat-Footed or otherwise denied its Dexterity bonus" — the RAW gate on
 * Sneak Attack (talents.db). Deliberately does NOT treat flanking alone as
 * satisfying this (SWSE flanking grants +2 to the attack roll, not denied
 * Dex, unlike the D&D assumption this project's own persistent rules
 * explicitly warn against importing).
 */
export function targetIsDeniedDexForDamage(context = {}) {
  const target = damageContextTarget(context);
  return context.sneakAttack === true
    || context.targetFlatFooted === true
    || context.flatFootedTarget === true
    || context.deniedDex === true
    || context.targetDeniedDex === true
    || context.attack?.targetFlatFooted === true
    || context.attack?.targetDeniedDex === true
    || context.combatContext?.targetFlatFooted === true
    || context.combatContext?.attack?.targetFlatFooted === true
    || target?.system?.condition?.flatFooted === true
    || target?.system?.conditions?.flatFooted === true
    || target?.flags?.swse?.flatFooted === true
    || target?.flags?.['foundryvtt-swse']?.flatFooted === true;
}

/**
 * Roll Expression / Transformation Authority adaptation (additive, does
 * NOT change resolveTalentDamageContributions()'s own behavior or its
 * existing consumers): wraps that function's already dice-shaped
 * `bonusDice` strings through the shared FORMULA_TERM validator, so a
 * caller that wants typed RollContribution records (rather than the
 * legacy {formula, bonusDice, ...} shape) has a validated, provenance-
 * tagged view of the same Sneak Attack dice — never re-deriving or
 * duplicating the dice-count/denied-Dex logic above.
 */
export function resolveTalentDamageFormulaTerms(actor, context = {}) {
  const { bonusDice, breakdown } = resolveTalentDamageContributions(actor, context);
  return resolveFormulaContributions(bonusDice.map((formula, index) => ({
    formula,
    sourceId: 'sneak-attack',
    sourceName: 'Sneak Attack',
    sourceType: 'talent',
    target: 'damage',
    category: 'bonusDamageDice',
    detail: breakdown[index]
  })));
}

/**
 * Resolve every talent-sourced damage-dice contribution for a weapon
 * attack. Returns the same {formula, bonusDice, flatBonus, breakdown,
 * notifications} shape the legacy TalentEffectEngine.calculateDamageBonus
 * contract used, so existing callers (the monkey-patch itself) keep working
 * unchanged while resolveDamageComposition() consumes the array fields
 * (bonusDice/breakdown) directly for its typed dice ledger.
 */
export function resolveTalentDamageContributions(actor, context = {}) {
  const bonusDice = [];
  const breakdown = [];
  const notifications = [];
  const flatBonus = 0;

  const sneakAttackCount = countTalentsNamed(actor, 'Sneak Attack');
  if (sneakAttackCount > 0 && targetIsDeniedDexForDamage(context)) {
    const formula = `${sneakAttackCount}d6`;
    bonusDice.push(formula);
    breakdown.push(`Sneak Attack +${formula}`);
  }

  const formulaParts = [...bonusDice];
  if (flatBonus !== 0) formulaParts.push(String(flatBonus));
  return {
    formula: formulaParts.join(' + '),
    bonusDice,
    flatBonus,
    breakdown,
    notifications
  };
}
