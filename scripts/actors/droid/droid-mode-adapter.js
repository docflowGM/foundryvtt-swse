/**
 * Droid Mode Adapter
 *
 * PHASE 3 — Droid Authority Consolidation ("stock-droid authority").
 *
 * Mirrors the existing scripts/actors/npc/npc-mode-adapter.js pattern for
 * droids: a small, pure authority for "is this actor a frozen published
 * statblock right now, or a normally-derived actor". NPCs already have this
 * distinction (isNpcStatblockMode / shouldSkipDerivedData in
 * scripts/utils/hardening.js) — droids never did, which is why
 * docs/audits/droid-static-audit.md flagged that a stock-imported droid's
 * published BAB/defenses/HP could be silently replaced by classless derived
 * math on every sheet render (scripts/actors/v2/character-actor.js's
 * computeCharacterDerived() only seeds system.derived.* placeholders, but
 * scripts/actors/v2/base-actor.js's _computeDerivedAsync() — gated by
 * shouldSkipDerivedData() — overwrites those same system.derived.* fields
 * with DerivedCalculator.computeAll()'s from-class-levels totals, which are
 * meaningless for a droid with no classes).
 *
 * This module does not implement a rich conversion workflow (comparing
 * individual systems, assumptions, warnings) — that already exists in
 * scripts/apps/droid-builder-app.js's CONVERT_FROM_STATBLOCK mode, but it
 * is unreachable dead code (see docs/audits/droid-authority-consolidation-phase-1.md
 * and -phase-2.md; nothing imports scripts/apps/stock-droid-conversion-dialog.js,
 * the only thing that opens it). Resurrecting that large, unverified legacy
 * app is out of scope for this phase (see "Deferred work" in
 * docs/audits/droid-authority-consolidation-phase-3.md). This module
 * provides the minimal, intentional alternative: an explicit mode flag a GM
 * can flip once they're ready to build further on a stock droid, after
 * which normal derivation resumes exactly as it already does for any other
 * droid.
 */

const FLAG_SCOPE = 'swse';
const FLAG_PATH = 'stockDroidImport';

/**
 * Whether `actor` is a stock-imported droid still in frozen/statblock mode
 * (its published BAB/defenses/HP/skills/attacks should not be recomputed).
 *
 * @param {Actor} actor
 * @returns {boolean}
 */
export function isDroidStatblockMode(actor) {
  if (!actor || actor.type !== 'droid') return false;
  const importState = actor.flags?.[FLAG_SCOPE]?.[FLAG_PATH];
  return Boolean(importState) && importState.importMode === 'statblock';
}

/**
 * Whether `actor` was ever stock-imported at all (statblock mode or
 * already converted to playable mode) — useful for sheet provenance
 * display regardless of current mode.
 *
 * @param {Actor} actor
 * @returns {boolean}
 */
export function isStockImportedDroid(actor) {
  if (!actor || actor.type !== 'droid') return false;
  return Boolean(actor.flags?.[FLAG_SCOPE]?.[FLAG_PATH]);
}

/**
 * Build the mutation-plan `set` fragment that converts a stock-imported
 * droid from frozen statblock mode to normal playable/derived mode. Pure —
 * callers apply this through ActorEngine, same as every other droid
 * mutation. Preserves the import provenance (source id/name, published
 * totals, warnings) for later reference/comparison; only the mode flag
 * changes, so this is intentionally NOT a rich conversion (it does not
 * touch system.droidSystems, does not reconcile published totals into
 * installedSystems, and does not walk the GM through per-system
 * assumptions the way the dead legacy Droid Builder's conversion flow
 * would have). It only stops derived data from silently overwriting the
 * displayed totals, and lets normal class/level-driven derivation resume
 * from whatever the droid's actual state is at the moment of conversion.
 *
 * @param {Actor} actor
 * @returns {{set: Object}}
 * @throws {Error} if the actor is not a droid currently in statblock mode
 */
export function buildConvertDroidToPlayableModeUpdate(actor) {
  if (!isDroidStatblockMode(actor)) {
    throw new Error('buildConvertDroidToPlayableModeUpdate() called on an actor that is not a droid in statblock mode.');
  }
  return {
    set: {
      [`flags.${FLAG_SCOPE}.${FLAG_PATH}.importMode`]: 'playable',
      [`flags.${FLAG_SCOPE}.${FLAG_PATH}.convertedAt`]: Date.now()
    }
  };
}

const DEFENSE_KEYS = Object.freeze(['fortitude', 'reflex', 'will', 'flatFooted']);

/**
 * Pure extraction of "what values should a statblock droid's system.derived
 * mirror show" from its own stored, published fields. Split out from
 * scripts/actors/v2/droid-actor.js's computeDroidDerived() so the actual
 * value-selection logic (as opposed to the system.derived object mutation,
 * which needs the live actor/system) is unit-testable under plain Node —
 * scripts/actors/v2/character-actor.js (which droid-actor.js imports for
 * computeCharacterDerived) pulls in several Foundry-only absolute-path
 * imports and cannot be loaded outside a running Foundry instance.
 *
 * Only returns overrides for BAB, the three core defenses, and Damage
 * Threshold — HP (mirrorHp) and skills (mirrorSkills) already read the
 * stored system.hp / stored skill totals directly regardless of statblock
 * mode, and attacks (mirrorAttacks) already read each integrated weapon
 * Item's own system.attackBonus rather than computing one from BAB, so none
 * of those three need an override here.
 *
 * @param {object} system - actor.system object
 * @returns {{bab: number|null, defenses: Object<string, number>, damageThreshold: number|null}}
 */
export function computeStatblockDerivedOverrides(system) {
  const overrides = { bab: null, defenses: {}, damageThreshold: null };

  const publishedBab = Number(system?.bab ?? system?.baseAttackBonus);
  if (Number.isFinite(publishedBab)) overrides.bab = publishedBab;

  const defenses = system?.defenses ?? {};
  for (const key of DEFENSE_KEYS) {
    const total = Number(defenses[key]?.total);
    if (Number.isFinite(total)) overrides.defenses[key] = total;
  }

  const publishedThreshold = Number(system?.damageThreshold);
  if (Number.isFinite(publishedThreshold)) overrides.damageThreshold = publishedThreshold;

  return overrides;
}
