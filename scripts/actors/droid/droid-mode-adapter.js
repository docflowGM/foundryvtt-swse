/**
 * Droid Mode Adapter
 *
 * PHASE 3 — Droid Stock-Statblock Authority.
 *
 * Canonical, pure authority for one question: is this droid actor a frozen
 * published statblock right now, or a normally-derived (playable) actor.
 * Mirrors the existing scripts/actors/npc/npc-mode-adapter.js pattern, which
 * NPCs have had for a long time — droids never did, which is why
 * docs/audits/droid-static-audit.md and
 * docs/audits/droid-authority-consolidation-phase-3.md found that a
 * stock-imported droid's published BAB/defenses/Initiative/Damage
 * Threshold could be silently replaced by classless-derived placeholder
 * values on every sheet render.
 *
 * Two-tier resolution, cheapest/most-authoritative first:
 *   1. system.droidCalculationMode — explicit, wins whenever present and
 *      valid. Written by the stock importer (statblock) and by
 *      DroidStatblockConversionService (playable), never anywhere else —
 *      see tools/check-droid-calculation-mode-authority.mjs.
 *   2. flags.swse.stockDroidImport.importMode — legacy compatibility
 *      signal for droids imported before this field existed. Inferred,
 *      never mutates the actor, and is reported as inferred in the
 *      resolver's return value so callers/diagnostics can tell the
 *      difference and a GM can explicitly repair it
 *      (buildRepairLegacyCalculationModeUpdate).
 *   3. Default: playable-derived. An ordinary hand-built droid is never
 *      classified as stock merely for lacking class Items or for having
 *      species/type "droid" — only an explicit mode or the legacy import
 *      flag can produce stock-statblock.
 *
 * This module does not implement a rich conversion workflow or perform any
 * mutation itself — see scripts/domain/droids/droid-statblock-conversion-service.js
 * for the actual conversion/rollback authority, which is the only thing
 * permitted to change system.droidCalculationMode after import.
 */

export const DROID_CALCULATION_MODE = Object.freeze({
  STOCK_STATBLOCK: 'stock-statblock',
  PLAYABLE_DERIVED: 'playable-derived'
});

const VALID_MODES = new Set(Object.values(DROID_CALCULATION_MODE));

const FLAG_SCOPE = 'swse';
const FLAG_PATH = 'stockDroidImport';

function legacyImportState(actor) {
  return actor?.flags?.[FLAG_SCOPE]?.[FLAG_PATH] ?? null;
}

/**
 * Resolve the droid calculation mode for `actor`, structured with enough
 * information for diagnostics to explain *why* a droid resolved the way it
 * did. Pure — never mutates the actor.
 *
 * @param {Actor} actor
 * @returns {{mode: string, explicit: boolean, inferred: boolean, reason: string, warnings: string[]}}
 */
export function resolveDroidCalculationMode(actor) {
  const warnings = [];

  if (!actor || actor.type !== 'droid') {
    return { mode: DROID_CALCULATION_MODE.PLAYABLE_DERIVED, explicit: false, inferred: false, reason: 'not-a-droid-actor', warnings };
  }

  const explicitMode = actor.system?.droidCalculationMode;
  if (explicitMode !== undefined && explicitMode !== null && explicitMode !== '') {
    if (VALID_MODES.has(explicitMode)) {
      return { mode: explicitMode, explicit: true, inferred: false, reason: 'explicit-system-field', warnings };
    }
    // Malformed/unknown explicit value — fail safely rather than throwing or
    // silently treating garbage as either mode. Default to playable-derived
    // (the safer assumption: it does not suppress derived recalculation for
    // an actor that may not actually be a frozen statblock) and surface it.
    warnings.push(`system.droidCalculationMode has an unrecognized value ("${explicitMode}"); defaulting to playable-derived.`);
    return { mode: DROID_CALCULATION_MODE.PLAYABLE_DERIVED, explicit: false, inferred: false, reason: 'malformed-explicit-value', warnings };
  }

  const legacy = legacyImportState(actor);
  if (legacy && legacy.importMode === 'statblock') {
    warnings.push('Calculation mode inferred from legacy flags.swse.stockDroidImport.importMode; repair with buildRepairLegacyCalculationModeUpdate() to make it explicit.');
    return { mode: DROID_CALCULATION_MODE.STOCK_STATBLOCK, explicit: false, inferred: true, reason: 'legacy-stock-import-flag', warnings };
  }
  if (legacy && legacy.importMode === 'playable') {
    warnings.push('Calculation mode inferred from legacy flags.swse.stockDroidImport.importMode; repair with buildRepairLegacyCalculationModeUpdate() to make it explicit.');
    return { mode: DROID_CALCULATION_MODE.PLAYABLE_DERIVED, explicit: false, inferred: true, reason: 'legacy-playable-conversion-flag', warnings };
  }

  return { mode: DROID_CALCULATION_MODE.PLAYABLE_DERIVED, explicit: false, inferred: false, reason: 'default-no-stock-signal', warnings };
}

/**
 * Convenience predicate built on resolveDroidCalculationMode() — the single
 * source of truth for "is this droid frozen". Used by
 * scripts/utils/hardening.js#shouldSkipDerivedData and
 * scripts/actors/v2/droid-actor.js#computeDroidDerived.
 *
 * @param {Actor} actor
 * @returns {boolean}
 */
export function isDroidStatblockMode(actor) {
  return resolveDroidCalculationMode(actor).mode === DROID_CALCULATION_MODE.STOCK_STATBLOCK;
}

/**
 * Whether `actor` was ever stock-imported at all (statblock mode or already
 * converted to playable mode) — used for sheet provenance display
 * regardless of current calculation mode.
 *
 * @param {Actor} actor
 * @returns {boolean}
 */
export function isStockImportedDroid(actor) {
  if (!actor || actor.type !== 'droid') return false;
  return Boolean(legacyImportState(actor)) || VALID_MODES.has(actor.system?.droidCalculationMode);
}

/**
 * Build the mutation-plan `set` fragment that makes an inferred legacy mode
 * explicit, without changing what that mode actually is. This is the
 * "explicit repair action" for pre-Phase-3 stock droids that only have the
 * legacy flags.swse.stockDroidImport.importMode signal — it writes exactly
 * what the resolver already inferred, so the droid's effective mode is
 * unchanged; only its provenance goes from "inferred" to "explicit".
 *
 * @param {Actor} actor
 * @returns {{set: Object}}
 * @throws {Error} if the actor's mode is already explicit (nothing to repair)
 */
export function buildRepairLegacyCalculationModeUpdate(actor) {
  const resolution = resolveDroidCalculationMode(actor);
  if (resolution.explicit) {
    throw new Error('buildRepairLegacyCalculationModeUpdate() called on an actor whose calculation mode is already explicit.');
  }
  return { set: { 'system.droidCalculationMode': resolution.mode } };
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
 * Field mapping was verified against the actual read sites, not assumed:
 *   - system.derived.bab is a PLAIN NUMBER (scripts/actors/derived/derived-calculator.js
 *     writes `updates['system.derived.bab'] = bab`); most consumers already
 *     fall back to system.bab/system.baseAttackBonus via `??` chains when it
 *     is undefined, but a handful (scripts/rolls/roll-config.js) read
 *     `derived.bab.total` first, which is always undefined for a plain
 *     number — so this is set explicitly rather than relied upon.
 *   - system.derived.defenses.{fortitude,reflex,will,flatFooted} is always
 *     a non-undefined OBJECT once computeCharacterDerived() runs (it seeds
 *     `{ base: 10, total: 10, ... }` unconditionally whenever the field
 *     isn't already an object) — this one genuinely needs an override,
 *     since nothing falls through to the published value on its own.
 *   - system.derived.damageThreshold is FLAT, not nested under
 *     system.derived.damage.threshold — confirmed by
 *     scripts/sheets/v2/character-sheet.js's own comment ("CRITICAL:
 *     DerivedCalculator stores at derived.damageThreshold (flat), not
 *     derived.damage.threshold") a few lines before it does
 *     `derived.damageThreshold ??= 10` with NO fallback to the stored
 *     system.damageThreshold — a real bug for a statblock droid without
 *     this override.
 *   - system.derived.initiative is never initialized by
 *     computeCharacterDerived() at all, and the sheet reads
 *     `derived?.initiative?.total ?? derived?.initiative ?? 0` — falling
 *     back to a hardcoded 0, NOT the stored system.initiative — another
 *     real bug without this override.
 *   - HP (mirrorHp), skills (mirrorSkills), attacks (mirrorAttacks), and
 *     Speed (computeCharacterDerived's own baseSpeed fallback chain, which
 *     already reads system.speed directly) were all verified safe and are
 *     intentionally NOT overridden here — see
 *     docs/audits/droid-stock-statblock-authority-phase-3.md's
 *     domain-by-domain policy table for the full verification.
 *
 * @param {object} system - actor.system object
 * @returns {{bab: number|null, defenses: Object<string, number>, damageThreshold: number|null, initiative: number|null}}
 */
export function computeStatblockDerivedOverrides(system) {
  const overrides = { bab: null, defenses: {}, damageThreshold: null, initiative: null };

  const publishedBab = Number(system?.bab ?? system?.baseAttackBonus);
  if (Number.isFinite(publishedBab)) overrides.bab = publishedBab;

  const defenses = system?.defenses ?? {};
  for (const key of DEFENSE_KEYS) {
    const total = Number(defenses[key]?.total);
    if (Number.isFinite(total)) overrides.defenses[key] = total;
  }

  const publishedThreshold = Number(system?.damageThreshold);
  if (Number.isFinite(publishedThreshold)) overrides.damageThreshold = publishedThreshold;

  const publishedInitiative = Number(system?.initiative);
  if (Number.isFinite(publishedInitiative)) overrides.initiative = publishedInitiative;

  return overrides;
}

/**
 * The single decision point for "should this weapon's attack roll use its
 * published statblock total instead of the normal BAB+ability+misc
 * composition, and if so, what is that total". Extracted so
 * scripts/engine/combat/combat-roll-math.js's resolveAttackBonus() has
 * exactly one place to ask this question (mirrors the pattern already used
 * there for NPC statblock-flat attack bonuses), and so the decision itself
 * is unit-testable without needing combat-roll-math.js's much larger
 * Foundry-dependent import graph.
 *
 * Returns null whenever the flat total should NOT be used (playable-derived
 * mode, non-droid actor, or a weapon with no stock attack contract) — the
 * caller then falls through to normal attack-bonus composition.
 *
 * @param {Actor} actor
 * @param {Item} weapon
 * @returns {number|null}
 */
export function getStockAttackFlatBonus(actor, weapon) {
  if (!isDroidStatblockMode(actor)) return null;
  const stockAttack = weapon?.flags?.swse?.stockDroidAttack;
  if (stockAttack?.sourceStatblock === true && Number.isFinite(stockAttack.publishedAttackTotal)) {
    return Number(stockAttack.publishedAttackTotal) || 0;
  }
  return null;
}

/**
 * PHASE 4 — Converted-System Reconciliation. The single decision point for
 * "should this installed droid component's modifiers be withheld from
 * ModifierEngine.collectModifiers()". Extracted from
 * scripts/engine/effects/modifiers/ModifierEngine.js#_getDroidModModifiers
 * for the same reason getStockAttackFlatBonus() was extracted from
 * combat-roll-math.js in Phase 3: ModifierEngine.js itself has a large
 * Foundry-dependent import graph and cannot be loaded under plain Node, but
 * the actual suppression decision is pure and needs its own coverage.
 *
 * Confirmed (not assumed) double-count risk this closes: for a droid still
 * in stock-statblock mode,
 * scripts/domain/droids/droid-installed-component-resolver.js already
 * reports every raw system.droidSystems record (the stock importer's own
 * display blob — see scripts/domain/droids/stock-droid-normalizer.js) as an
 * "active" component even though none of them were ever written to
 * system.installedSystems, the canonical ledger. Those components' bonuses
 * are already baked into the droid's preserved published totals (see
 * docs/audits/droid-stock-statblock-authority-phase-3.md); applying their
 * ModifierEngine bonuses too — which happened unconditionally before this
 * phase, at every roll that calls collectModifiers() — silently
 * double-counted them.
 *
 * A component only escapes stock-mode suppression once it actually has a
 * system.installedSystems ledger entry: either a genuine post-import
 * Garage/Workshop addition (a GM modifying a still-unconverted stock droid
 * — a legitimate new bonus, not a published one), or a component
 * DroidConvertedSystemReconciliationService reconciled onto an
 * already-playable-derived droid (which never runs while a droid is still
 * in stock mode — see
 * docs/audits/droid-converted-system-reconciliation-phase-4.md).
 *
 * @param {Actor} actor
 * @param {{sources: {kind: string}[], mechanicalState: {applyModifiers?: boolean}|null}} component -
 *   one entry from resolveInstalledDroidComponents(actor, ...).components.
 * @returns {boolean} true if this component's modifiers must be withheld.
 */
export function shouldSuppressComponentModifiers(actor, component) {
  if (component?.mechanicalState?.applyModifiers === false) return true;
  if (!isDroidStatblockMode(actor)) return false;
  const sources = Array.isArray(component?.sources) ? component.sources : [];
  return !sources.some(s => s?.kind === 'installedLedger');
}
