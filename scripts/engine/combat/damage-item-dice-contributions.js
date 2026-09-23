/**
 * Damage SSOT — shared Force Item / Inquisition extra-die contribution
 * producers.
 *
 * Damage audit correction #1 (docs/audits/v2-damage-modifier-authority-
 * audit-correction-1.md §7) confirmed damage.js#rollDamage() and
 * attacks.js#rollDamage()/rollAttackAndDamageWithNarration() each carried
 * their own local, independently-drifting copy of this logic (attacks.js's
 * copy was additionally missing the Inquisition contribution entirely — a
 * real, confirmed omission on that narrower path). This module is the one
 * neutral, importable authority both call sites now consume, so there is
 * exactly one place this mechanic can be read from or drift out of sync.
 *
 * Pure functions only — no chat/UI behavior, no roll execution.
 */

function actorHasTalentNamed(actor, names = []) {
  const wanted = new Set((Array.isArray(names) ? names : [names])
    .map(name => String(name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ''))
    .filter(Boolean));
  if (!wanted.size) return false;
  try {
    return Array.from(actor?.items ?? []).some(item => {
      if (item?.type !== 'talent') return false;
      const key = String(item.name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
      return wanted.has(key);
    });
  } catch (_err) {
    return false;
  }
}

function actorHasFeatNamed(actor, names = []) {
  const wanted = new Set((Array.isArray(names) ? names : [names])
    .map(name => String(name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ''))
    .filter(Boolean));
  if (!wanted.size) return false;
  try {
    return Array.from(actor?.items ?? []).some(item => {
      if (item?.type !== 'feat') return false;
      const key = String(item.name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
      return wanted.has(key);
    });
  } catch (_err) {
    return false;
  }
}

export function forceItemState(weapon) {
  return weapon?.getFlag?.('swse', 'forceItem') ?? weapon?.flags?.swse?.forceItem ?? null;
}

export function firstWeaponDamageDieFormula(weapon) {
  const formula = String(weapon?.system?.damage ?? weapon?.system?.damageFormula ?? '1d6');
  const match = formula.match(/(\d*)d(\d+)/i);
  if (!match) return '';
  return `1d${match[2]}`;
}

/**
 * Force Item ("empowered" state): the attuned actor's weapon gains one
 * extra die of its own primary damage type when empowered this way.
 */
export function forceItemExtraDamageFormula(actor, weapon) {
  const state = forceItemState(weapon);
  if (String(state?.empowered?.actorId ?? '') !== String(actor?.id ?? '')) return '';
  return firstWeaponDamageDieFormula(weapon);
}

function targetActorFromDamageContext(context = {}) {
  return context?.target ?? context?.targetActor ?? game?.user?.targets?.first?.()?.actor ?? null;
}

/**
 * Inquisition talent: an extra weapon die against a Force-sensitive target.
 */
export function inquisitionExtraDamageFormula(actor, weapon, context = {}) {
  if (!actorHasTalentNamed(actor, 'Inquisition')) return '';
  const target = targetActorFromDamageContext(context);
  if (!target || !actorHasFeatNamed(target, 'Force Sensitivity')) return '';
  return firstWeaponDamageDieFormula(weapon);
}

/**
 * Collect every shared item/talent-scoped extra dice term as a flat array
 * of formula strings (empty strings filtered out) — the single call site
 * resolveDamageComposition() (and any other future caller) needs instead
 * of re-deriving each contribution individually.
 */
export function collectSharedDamageDiceTerms(actor, weapon, context = {}) {
  const terms = [];
  const forceItemTerm = forceItemExtraDamageFormula(actor, weapon);
  if (forceItemTerm) terms.push(forceItemTerm);
  const inquisitionTerm = inquisitionExtraDamageFormula(actor, weapon, context);
  if (inquisitionTerm) terms.push(inquisitionTerm);
  return terms;
}
