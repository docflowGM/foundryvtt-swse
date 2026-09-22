/**
 * CombatStatRules
 *
 * Small pure helpers for SWSE core combat-stat math. These functions centralize
 * the rules that are shared by derived stats, roll previews, and damage rolls.
 */

import { SchemaAdapters } from "/systems/foundryvtt-swse/scripts/utils/schema-adapters.js";
import { getEffectiveHalfLevel } from "/systems/foundryvtt-swse/scripts/actors/derived/level-split.js";
import { isRangedWeapon as canonicalIsRangedWeapon, isMeleeWeapon as canonicalIsMeleeWeapon } from "/systems/foundryvtt-swse/scripts/items/weapon-branch-resolver.js";
import { ModifierSource, ModifierType, createModifier } from "/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierTypes.js";
import { SWSELogger as swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export const SIZE_ORDER = Object.freeze([
  'fine', 'diminutive', 'tiny', 'small', 'medium', 'large', 'huge', 'gargantuan', 'colossal'
]);

export const REFLEX_SIZE_MODIFIERS = Object.freeze({
  fine: 10,
  diminutive: 5,
  tiny: 2,
  small: 1,
  medium: 0,
  large: -1,
  huge: -2,
  gargantuan: -5,
  colossal: -10
});

export const DAMAGE_THRESHOLD_SIZE_BONUSES = Object.freeze({
  fine: 0,
  diminutive: 0,
  tiny: 0,
  small: 0,
  medium: 0,
  large: 5,
  huge: 10,
  gargantuan: 20,
  colossal: 50
});

// Grapple size modifier table -- Saga Edition Core Rulebook, Grapple check
// rules (grapple check = 1d20 + BAB + higher of STR/DEX modifier + size
// modifier). This is a DIFFERENT, larger-magnitude table than
// REFLEX_SIZE_MODIFIERS above -- grapple size differences swing much more
// than attack/defense size differences do. Values confirmed independently
// two ways:
//   1. Cross-checked against two published creature stat blocks already in
//      this repo's own compendium data (packs/beasts.db):
//        Aiwha (Gargantuan): BAB +3, STR 25 (+7 mod), published Grp +25
//          => size modifier = 25 - 3 - 7 = +15
//        Bantha (Huge): BAB +2, STR 28 (+9 mod), published Grp +21
//          => size modifier = 21 - 2 - 9 = +10
//   2. Independently corroborated by two separate SWSE rules-reference
//      lookups of the Core Rulebook's grapple size modifier table.
// Both give the same table: a flat step of 5 per size category, Medium = 0.
// This replaced an incorrect step-of-4 table (max +/-16) that was never
// checked against a published stat block -- see the Grapple domain section
// of docs/audits/v2-math-integrity-authority-ledger.md for the
// certification-review finding and tests/grapple-size-modifier-book-values.test.mjs
// for the golden Aiwha/Bantha regression proof.
export const GRAPPLE_SIZE_MODIFIERS = Object.freeze({
  fine: -20,
  diminutive: -15,
  tiny: -10,
  small: -5,
  medium: 0,
  large: 5,
  huge: 10,
  gargantuan: 15,
  colossal: 20
});

export function normalizeCombatSize(size) {
  const raw = String(size ?? 'medium').toLowerCase().trim();
  if (raw.includes('colossal')) return 'colossal';
  if (raw.includes('gargantuan')) return 'gargantuan';
  if (raw.includes('diminutive')) return 'diminutive';
  if (raw.includes('tiny')) return 'tiny';
  if (raw.includes('small')) return 'small';
  if (raw.includes('large')) return 'large';
  if (raw.includes('huge')) return 'huge';
  if (raw.includes('fine')) return 'fine';
  return SIZE_ORDER.includes(raw) ? raw : 'medium';
}

export function getActorCombatSize(actor) {
  return normalizeCombatSize(actor?.system?.size ?? actor?.size ?? actor?.system?.traits?.size ?? 'medium');
}

export function getReflexSizeModifier(actorOrSize) {
  const size = typeof actorOrSize === 'string' ? normalizeCombatSize(actorOrSize) : getActorCombatSize(actorOrSize);
  return REFLEX_SIZE_MODIFIERS[size] ?? 0;
}

export function getDamageThresholdSizeBonus(actorOrSize) {
  const size = typeof actorOrSize === 'string' ? normalizeCombatSize(actorOrSize) : getActorCombatSize(actorOrSize);
  return DAMAGE_THRESHOLD_SIZE_BONUSES[size] ?? 0;
}

export function getGrappleSizeModifier(actorOrSize) {
  const size = typeof actorOrSize === 'string' ? normalizeCombatSize(actorOrSize) : getActorCombatSize(actorOrSize);
  return GRAPPLE_SIZE_MODIFIERS[size] ?? 0;
}

/**
 * The ONLY grapple arithmetic in the codebase: BAB + best of STR/DEX +
 * size + species. A pure function over already-resolved numeric inputs --
 * it does not read an actor itself, so it can be called both by
 * `resolveGrappleBonus()` below (which resolves those inputs from a live
 * actor via SchemaAdapters) and by `derived-calculator.js`'s own
 * system.derived.grappleBonus computation (which has its own freshly
 * computed current-pass BAB/ability/size/species values available
 * in-closure, some of which may not exist on `actor` itself yet mid-pass).
 * Previously each of those two call sites independently reimplemented
 * this exact formula (including a hand-copied size table each) -- see
 * docs/audits/v2-math-integrity-authority-ledger.md's Grapple domain for
 * the certification-review finding that flagged the duplication (they
 * agreed today, but two formulas is the violation the freeze forbids,
 * agreement or not).
 *
 * @param {Object} inputs
 * @param {number} inputs.bab
 * @param {number} inputs.strMod
 * @param {number} inputs.dexMod
 * @param {number} inputs.sizeMod
 * @param {number} [inputs.speciesBonus]
 * @returns {number}
 */
export function computeGrappleBonus({ bab, strMod, dexMod, sizeMod, speciesBonus = 0 }) {
  const safeBab = Number(bab) || 0;
  const safeStr = Number(strMod) || 0;
  const safeDex = Number(dexMod) || 0;
  const safeSize = Number(sizeMod) || 0;
  const safeSpecies = Number(speciesBonus) || 0;
  return safeBab + Math.max(safeStr, safeDex) + safeSize + safeSpecies;
}

/**
 * Canonical, standalone Grapple bonus resolver for a live actor: resolves
 * BAB/ability/size/species inputs via SchemaAdapters and the shared size
 * helper, then delegates to computeGrappleBonus() for the actual math --
 * so a caller that can't read a pre-computed system.derived.grappleBonus
 * (e.g. because derived data hasn't been computed yet) has ONE correct
 * formula to fall back to, instead of an independently-maintained
 * approximation that can silently omit terms. See
 * docs/audits/v2-math-integrity-authority-ledger.md's Grapple domain --
 * scripts/houserules/houserule-grapple.js previously fell back to
 * BAB + STR only (no size, no species, no best-of-DEX), which was
 * confirmed wrong for any DEX-based grappler.
 *
 * Deliberately NOT used by derived-calculator.js: that pass has its own
 * freshly computed current-pass values (BAB, ability mods, etc.) that may
 * not yet be written onto `actor` itself when this runs, so reading them
 * back off `actor` via SchemaAdapters here could see stale data from the
 * previous prepare cycle. derived-calculator.js calls
 * computeGrappleBonus() directly with its own in-closure values instead.
 *
 * @param {Actor} actor
 * @returns {number}
 */
export function resolveGrappleBonus(actor) {
  if (!actor) return 0;
  return computeGrappleBonus({
    bab: SchemaAdapters.getBAB(actor),
    strMod: SchemaAdapters.getAbilityMod(actor, 'str'),
    dexMod: SchemaAdapters.getAbilityMod(actor, 'dex'),
    sizeMod: getGrappleSizeModifier(actor),
    speciesBonus: actor.system?.speciesCombatBonuses?.grapple ?? actor.system?.speciesTraitBonuses?.combat?.grapple ?? 0
  });
}

function numeric(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeSelector(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Math Integrity Freeze, Batch 2B: branch classification is delegated to the
// single canonical authority (scripts/items/weapon-branch-resolver.js).
// A full pack scan found system.weaponCategory holds a literal "melee"/
// "ranged" branch value on 100% of shipped weapon records, while
// meleeOrRanged is absent on all of them (schema-defaulted, not authored,
// at materialization time) -- so the old explicitBranch()-first precedence
// here was proven to misclassify real ranged weapons (the "Bluebolt" bug).
export function isRangedWeapon(weapon) {
  return canonicalIsRangedWeapon(weapon);
}

export function isMeleeWeapon(weapon) {
  return canonicalIsMeleeWeapon(weapon);
}

export function isLightMeleeWeapon(weapon) {
  if (!isMeleeWeapon(weapon)) return false;
  const system = weapon?.system ?? {};
  if (system.light === true || system.isLight === true || system.properties?.includes?.('light')) return true;
  const text = [
    weapon?.name,
    system.weaponGroup,
    system.group,
    system.weaponCategory,
    system.category,
    system.subcategory,
    system.subtype,
    system.weaponType,
    system.type,
    Array.isArray(system.properties) ? system.properties.join(' ') : ''
  ].map(value => String(value ?? '').toLowerCase()).join(' ');
  return /light\s+melee|knife|dagger|short\s+sword|vibroblade/.test(text);
}

export function isAdvancedMeleeWeapon(weapon) {
  if (!isMeleeWeapon(weapon)) return false;
  const system = weapon?.system ?? {};
  const text = [
    weapon?.name,
    system.weaponGroup,
    system.group,
    system.weaponCategory,
    system.category,
    system.subcategory,
    system.subtype,
    system.weaponType,
    system.type,
    Array.isArray(system.properties) ? system.properties.join(' ') : ''
  ].map(value => String(value ?? '').toLowerCase()).join(' ');
  return /advanced\s+melee/.test(text) || text.includes('advanced melee weapons');
}

export function isPistolWeapon(weapon) {
  const system = weapon?.system ?? {};
  const text = [
    weapon?.name,
    system.weaponGroup,
    system.group,
    system.weaponCategory,
    system.category,
    system.subcategory,
    system.subtype,
    system.weaponType,
    system.type,
    Array.isArray(system.properties) ? system.properties.join(' ') : ''
  ].map(value => String(value ?? '').toLowerCase()).join(' ');
  return /\bpistol\b|\bpistols\b/.test(text);
}

export function isVehicleWeapon(weapon) {
  const system = weapon?.system ?? {};
  if (system.vehicleWeapon === true || system.starshipWeapon === true || system.weaponSystem === true) return true;
  const properties = Array.isArray(system.properties) ? system.properties : [];
  const traits = Array.isArray(system.traits) ? system.traits : [];
  const candidates = [
    weapon?.name,
    system.weaponGroup,
    system.group,
    system.weaponCategory,
    system.category,
    system.subcategory,
    system.subtype,
    system.weaponType,
    system.type,
    system.itemType,
    system.sourceType,
    ...properties,
    ...traits
  ].map(value => String(value ?? '').toLowerCase()).join(' ');
  return /vehicle\s+weapon|vehicle-weapon|starship\s+weapon|starship-weapon|weapon\s+system|weapon-system|turbolaser|laser\s+cannon|ion\s+cannon|proton\s+torpedo|concussion\s+missile/.test(candidates);
}

function isEquippedWeapon(item) {
  const system = item?.system ?? {};
  return item?.type === 'weapon'
    && (system.equipped === true || system.equippable?.equipped === true || String(system.status || '').toLowerCase() === 'equipped');
}

function actorHasEquippedPistol(actor) {
  try {
    return Array.from(actor?.items ?? []).some(item => isEquippedWeapon(item) && isPistolWeapon(item));
  } catch (_err) {
    return false;
  }
}

function actorHasTalentNamed(actor, names = []) {
  const wanted = new Set((Array.isArray(names) ? names : [names]).map(normalizeSelector).filter(Boolean));
  if (!wanted.size) return false;
  try {
    for (const item of Array.from(actor?.items ?? [])) {
      if (!item || item.type !== 'talent') continue;
      if (wanted.has(normalizeSelector(item.name))) return true;
    }
  } catch {
    return false;
  }
  return false;
}

export function isLightsaberWeapon(weapon) {
  const system = weapon?.system ?? {};
  const properties = Array.isArray(system.properties) ? system.properties : [];
  const candidates = [
    weapon?.name,
    system.weaponGroup,
    system.group,
    system.weaponCategory,
    system.category,
    system.subcategory,
    system.subtype,
    system.weaponType,
    system.type,
    ...properties
  ].map(normalizeSelector);
  return candidates.some(value => value.includes('lightsaber'));
}

export function isThrownMeleeWeapon(weapon) {
  const system = weapon?.system ?? {};
  const text = [system.range, system.rangeType, system.category, system.subcategory, system.properties?.join?.(' '), weapon?.name]
    .map(v => String(v ?? '').toLowerCase())
    .join(' ');
  return system.thrown === true || /thrown|grenade/.test(text);
}

export function getWeaponAttackAbility(actor, weapon) {
  const system = weapon?.system ?? {};
  const explicit = String(system.attackAttribute ?? system.combat?.attack?.ability ?? '').toLowerCase();
  const defaultAbility = isRangedWeapon(weapon) && !isMeleeWeapon(weapon) ? 'dex' : 'str';
  let resolved = defaultAbility;

  if (explicit) {
    if (explicit.includes('dex')) resolved = 'dex';
    else if (explicit.includes('str')) resolved = 'str';
    else resolved = explicit;
  }

  // Noble Fencing Style's rule text ("you can use your Charisma modifier
  // instead of your Strength modifier") is permissive, not mandatory. This
  // function's own explicit-attackAttribute handling immediately above is
  // already the project's one player-owned-attack-ability activation
  // contract: a player who wants Noble Fencing Style's benefit sets
  // weapon.system.attackAttribute to 'cha' directly, and that explicit
  // choice is honored verbatim, for all six abilities, unconditionally.
  // A prior version of this function instead auto-substituted CHA whenever
  // the talent, proficiency, and weapon-type conditions matched (first
  // unconditionally, then gated to only when CHA was mathematically
  // better) -- both variants rewrote the resolved ability based purely on
  // owning the talent, with no player activation step, which is exactly
  // what the already-certified Batch 2B policy forbids: "the player owns
  // the chosen attack attribute unless a specific implemented rule
  // explicitly overrides it at roll time." No selected-combat-option,
  // per-weapon selection, or roll-context flag exists anywhere in the repo
  // (grepped combat-option-resolver.js's static option table and
  // roll-config.js) that could serve as that "specific implemented rule";
  // the only real activation mechanism is the explicit attackAttribute
  // field this function already reads first. So owning the talent alone
  // must never change the resolved ability -- only an explicit
  // attackAttribute: 'cha' does, exactly like every other ability.
  return resolved;
}

export function getRangePenalty(weapon, context = {}) {
  const explicit = Number(context.rangePenalty ?? context.modifiers?.rangePenalty ?? weapon?.system?.rangePenalty ?? weapon?.system?.currentRangePenalty);
  if (Number.isFinite(explicit)) return explicit;

  const band = String(context.rangeBand ?? context.range ?? weapon?.system?.rangeBand ?? '').toLowerCase();
  if (band === 'short') return -2;
  if (band === 'medium') return -5;
  if (band === 'long') return -10;
  return 0;
}

export function getWeaponFlatAttackBonus(weapon) {
  const system = weapon?.system ?? {};
  return numeric(system.attackBonus ?? system.combat?.attack?.bonus ?? 0, 0);
}

export function getWeaponFlatDamageBonus(weapon) {
  const system = weapon?.system ?? {};
  return numeric(system.flatDamageBonus ?? system.damageFlatBonus ?? system.combat?.damage?.bonus ?? 0, 0);
}

function pushWeaponModifierSafe(modifiers, data) {
  try {
    modifiers.push(createModifier(data));
  } catch (err) {
    swseLogger.error(`[CombatStatRules] Skipping invalid weapon modifier (${data?.sourceName ?? data?.sourceId ?? 'unknown source'}):`, err);
  }
}

// Math Integrity Freeze, Attack Bonus round 4 (found while writing that
// round's own cross-type stacking tests): the original weapons-engine.js
// version of this mapping was a narrow allowlist (force/enhancement/
// untyped/equipment only) that silently downgraded any OTHER canonical
// bonusType (competence, circumstance, morale, insight, dodge, penalty,
// armor, restriction, flanking) to UNTYPED -- which would have wrongly let
// two same-type crystal modifiers both stack instead of correctly
// colliding. Matches the existing membership-check idiom this project
// already uses for the identical problem in
// grappling-system.js#collectContextualGrappleModifiers(). Still used for
// the (currently zero, but possible) case of a future ATTACK_BONUS crystal
// record that does specify an explicit bonusType.
function mapWeaponUpgradeBonusType(bonusType) {
  const key = String(bonusType ?? '').toLowerCase().trim();
  return Object.values(ModifierType).includes(key) ? key : ModifierType.UNTYPED;
}

/**
 * Math Integrity Freeze, Attack Bonus round 5 (blocker fix): the single,
 * weapon-scoped authority for a lightsaber's attunement bonus and its
 * installed crystal/accessory attack modifiers -- Modifier objects, not
 * pre-summed numbers, so a stacking-sensitive consumer
 * (combat-roll-math.js#resolveAttackBonus()'s unified typed pool) can
 * resolve them together with every other typed attack contribution rather
 * than silently never seeing them at all.
 *
 * GENERATOR-NATIVE SOURCE (round 5 correction): a round-4 version of this
 * function read `weapon.system.installedUpgrades` (an array of ids
 * resolved via `actor.items.get()` against separate owned `weaponUpgrade`
 * items) and a `{domain, bonusType, value}` modifier shape. Neither matches
 * how a lightsaber is actually built. Confirmed directly against
 * `lightsaber-construction-engine.js#createBuiltLightsaber()`/
 * `applyEdits()`: the selected crystal's and accessories' own
 * `system.modifiers` records are copied VERBATIM onto the finished weapon's
 * OWN `system.modifiers` array -- no separate owned `weaponUpgrade` item,
 * no `installedUpgrades` field, ever gets populated by that (the only live)
 * construction path. `weapon.system.installedUpgrades` does have one live
 * writer elsewhere (`install-remove-engine.js`, the general, non-lightsaber
 * slot-upgrade system), but its array holds `{id: randomInstanceId, name,
 * cost, ...}` display-summary objects, not actor-item references -- a
 * completely different shape, unrelated to lightsaber crystals, and never
 * matching the id-lookup this function used to perform either way. The
 * round-4 shape had no live producer at all; this version reads the real
 * one.
 *
 * FAIL-CLOSED INTERPRETATION (round 5 correction): the real compiled
 * `packs/lightsaber-crystals.db` is a heterogeneous rules-record schema
 * (`type` values include ATTACK_BONUS, CONDITIONAL_ATTACK, DAMAGE_BONUS,
 * CONDITIONAL_DAMAGE, DEFENSE_BONUS, ENEMY_PENALTY, SKILL_BONUS,
 * SKILL_MODIFIER, HEALING_BONUS, DAMAGE_TYPE_CHANGE, DAMAGE_REDUCTION,
 * CRITICAL_BONUS, FORCE_POINT_DIE_UPGRADE, REROLL_ABILITY, LIGHT_EMISSION,
 * SENSE_OVERRIDE, ALIGNMENT_REFLECTION, CRITICAL_FAILURE -- confirmed by
 * direct inspection, not inferred from the older `data/
 * lightsaber-components.json`/`lightsaber-items-import.ndjson` reference
 * files, which use a different, non-authoritative shape). A round-4 helper
 * defaulted any record with no recognized `domain` to `'attack.bonus'` --
 * on the REAL schema (which has no `domain` field at all) that would have
 * silently turned Kasha's +2 Will Defense, Sigil's +2 damage, Mantle's +2
 * Use the Force, Compressed's -2 enemy Block penalty, and more, into
 * permanent attack bonuses. Only `type === 'ATTACK_BONUS'` (with its own
 * `target === 'attack'`) is interpreted as a flat attack Modifier here.
 * `type === 'CONDITIONAL_ATTACK'` (Heart of the Guardian: +2 vs lightsaber
 * wielders; Hurikane: +2 vs armored targets) is a REAL attack bonus, but
 * this project's attack pipeline does not yet provide authoritative,
 * verified target-state context (e.g. "is the target a lightsaber
 * wielder," "is the target armored") at this layer -- a known conditional
 * bonus silently not applying is far safer than a known-wrong permanent
 * one, so it deliberately emits nothing (NOT YET AUTOMATED) rather than
 * guessing. Every other `type` is a non-attack effect and emits nothing
 * for Attack Bonus purposes -- there is no unknown-type fallback.
 *
 * This was previously implemented ONLY inside weapons-engine.js (an
 * actor-wide, all-equipped-weapons collector), which combat-roll-math.js
 * cannot import without creating a circular dependency (weapons-engine.js
 * already imports resolveAttackBonus()/resolveDamageBonus() FROM this
 * file's sibling combat-roll-math.js -- see that file's own header
 * comment). Centralizing the weapon-scoped logic here, with
 * WeaponsEngine.getWeaponModifiers() calling it once per equipped weapon
 * instead of duplicating it, gives both consumers one shared authority
 * instead of two independently-maintained copies.
 *
 * Deliberately does NOT include the weapon's flat enhancement bonus
 * (system.combat.attack.bonus, already read structurally by
 * getWeaponFlatAttackBonus() above) or a nonproficiency penalty (already
 * computed structurally in resolveAttackBonus()) -- those are structural
 * mirrors of core attack arithmetic, not additional typed contributions,
 * and including them here would double-count them.
 *
 * @param {Actor} actor
 * @param {Item} weapon - the SPECIFIC weapon being rolled; reads only this
 *   weapon's own `system.modifiers` (never another equipped weapon's).
 * @returns {Modifier[]}
 */
export function getWeaponAttunementAndUpgradeModifiers(actor, weapon) {
  const modifiers = [];
  if (!actor || !weapon || weapon.type !== 'weapon') return modifiers;
  if (weapon.system?.subtype !== 'lightsaber') return modifiers;

  if (weapon.flags?.swse?.builtBy === actor.id && weapon.flags?.swse?.attunedBy === actor.id) {
    pushWeaponModifierSafe(modifiers, {
      source: ModifierSource.ITEM,
      sourceId: weapon.id,
      sourceName: `${weapon.name} (Attuned)`,
      target: 'attack.bonus',
      type: ModifierType.UNTYPED,
      value: 1,
      enabled: true,
      priority: 45,
      description: 'Attuned lightsaber bonus'
    });
  }

  const weaponModifierRecords = Array.isArray(weapon.system?.modifiers) ? weapon.system.modifiers : [];
  if (!weaponModifierRecords.length) return modifiers;

  // The crystal/accessory Item's own name is not embedded in the copied
  // modifier record (construction merges every selected component's
  // `system.modifiers` into one flat array with no per-record origin tag),
  // so the best available provenance is the crystal id construction
  // recorded on the weapon itself -- resolved to a real name when the
  // crystal is still a resolvable Item, generic otherwise.
  const crystalId = weapon.flags?.swse?.lightsaberConfig?.crystalId
    ?? weapon.flags?.['foundryvtt-swse']?.lightsaberConfig?.crystalId
    ?? null;
  const crystalLabel = (crystalId && actor.items?.get?.(crystalId)?.name) || 'Crystal';

  let attackRecordIndex = 0;
  for (const record of weaponModifierRecords) {
    if (!record || typeof record !== 'object') continue;
    const recordType = String(record.type ?? '').toUpperCase();
    if (recordType !== 'ATTACK_BONUS') {
      // CONDITIONAL_ATTACK and every other non-attack rule kind: see the
      // fail-closed doc comment above. Intentionally no fallback.
      continue;
    }
    if (String(record.target ?? '').toLowerCase() !== 'attack') continue;
    const value = Number(record.value);
    if (!Number.isFinite(value) || value === 0) continue;
    attackRecordIndex += 1;
    const label = attackRecordIndex > 1 ? `${crystalLabel} ${attackRecordIndex}` : crystalLabel;
    pushWeaponModifierSafe(modifiers, {
      source: ModifierSource.ITEM,
      sourceId: `${weapon.id}_attack-bonus-${attackRecordIndex}`,
      sourceName: `${weapon.name} (${label})`,
      target: 'attack.bonus',
      type: record.bonusType ? mapWeaponUpgradeBonusType(record.bonusType) : ModifierType.UNTYPED,
      value,
      enabled: true,
      priority: 55,
      description: `${label} attack modifier`
    });
  }

  return modifiers;
}

function normalizeCriticalMultiplier(value, fallback = 2) {
  if (value === null || value === undefined || value === '') return fallback;
  const match = String(value).trim().match(/\d+/);
  const parsed = match ? Number(match[0]) : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getCriticalMultiplier(weapon, fallback = 2) {
  const system = weapon?.system ?? {};
  return normalizeCriticalMultiplier(
    system.criticalMultiplier
      ?? system.critMultiplier
      ?? system.combat?.critical?.multiplier
      ?? system.critical?.multiplier
      ?? system.multiplier,
    fallback
  );
}

export function isAreaAttack(weaponOrContext = {}, context = {}) {
  const weapon = weaponOrContext?.system ? weaponOrContext : null;
  const options = weapon ? context : weaponOrContext;
  const system = weapon?.system ?? {};
  const text = [
    system.attackShape,
    system.attackType,
    system.area,
    system.blastRadius,
    system.burstRadius,
    system.properties?.join?.(' '),
    options?.attackShape,
    options?.attackType,
    options?.area,
    options?.workflowContext?.attackShape,
    options?.workflowContext?.attackType
  ].map(value => String(value ?? '').toLowerCase()).join(' ');

  return options?.areaAttack === true
    || options?.isAreaAttack === true
    || options?.workflowContext?.areaAttack === true
    || options?.workflowContext?.isAreaAttack === true
    || system.areaAttack === true
    || system.isAreaAttack === true
    || /\b(area|blast|burst|cone|line|splash)\b/.test(text);
}

const HALF_LEVEL_DAMAGE_HOUSE_RULE_KEY = 'forcePowerDamageAddsHalfLevel';
const ELEMENTAL_HALF_LEVEL_EXCLUSION_KEYS = new Set([
  'acid',
  'cold',
  'cryo',
  'electric',
  'electrical',
  'energy',
  'fire',
  'ion',
  'radiation',
  'sonic'
]);

function damageTypesFromContext(context = {}) {
  return [
    context.damageType,
    context.damage?.type,
    context.weapon?.system?.damageType,
    context.item?.system?.damageType,
    ...(Array.isArray(context.damageTypes) ? context.damageTypes : []),
    ...(Array.isArray(context.tags) ? context.tags : [])
  ].map(value => String(value ?? '').trim().toLowerCase()).filter(Boolean);
}

function isExcludedElementalDamage(context = {}) {
  return damageTypesFromContext(context).some(type => ELEMENTAL_HALF_LEVEL_EXCLUSION_KEYS.has(type));
}

function forcePowerDamageAddsHalfLevel() {
  try {
    return game?.settings?.get?.('swse', HALF_LEVEL_DAMAGE_HOUSE_RULE_KEY) === true;
  } catch (_err) {
    return false;
  }
}

function isForcePowerDamageContext(context = {}) {
  const type = String(context.type ?? context.rollType ?? context.sourceType ?? '').toLowerCase();
  if (type.includes('force')) return true;
  if (context.forcePower === true || context.isForcePower === true) return true;
  const itemType = String(context.item?.type ?? context.power?.type ?? '').toLowerCase();
  return itemType === 'force-power' || itemType === 'forcepower';
}

function isWeaponDamageContext(context = {}) {
  if (context.isWeaponDamage === true) return true;
  const itemType = String(context.item?.type ?? context.weapon?.type ?? '').toLowerCase();
  return itemType === 'weapon';
}

/**
 * Half level damage rule.
 *
 * Saga weapon damage normally adds one-half heroic level. Force power damage does
 * not add half level by default in this system because many powers already encode
 * full dice progressions; a world setting can enable it for tables that use that
 * house rule. Elemental/energy style packets stay excluded unless explicitly
 * weapon-backed to avoid double-scaling state/effect damage.
 */
export function getHalfLevelDamageBonus(actor, item = null, context = {}) {
  const level = getEffectiveHalfLevel(actor);
  if (!level) return 0;
  const enriched = { ...context, item: context.item ?? item, weapon: context.weapon ?? item };
  if (isForcePowerDamageContext(enriched) && !forcePowerDamageAddsHalfLevel()) return 0;
  if (isExcludedElementalDamage(enriched) && !isWeaponDamageContext(enriched)) return 0;
  return level;
}

export function getDamageAbilityContribution(actor, weapon) {
  const system = weapon?.system ?? {};
  const explicit = String(system.damageBonus ?? system.damageAbility ?? system.combat?.damage?.ability ?? '').toLowerCase();

  if (explicit === 'none' || explicit === '0' || explicit === 'false') return 0;

  if (actorHasTalentNamed(actor, 'Ataru') && isLightsaberWeapon(weapon)) return SchemaAdapters.getAbilityMod(actor, 'dex');

  if (explicit.includes('str2')) return SchemaAdapters.getAbilityMod(actor, 'str') * 2;
  if (explicit.includes('dex2')) return SchemaAdapters.getAbilityMod(actor, 'dex') * 2;
  if (explicit.includes('str')) return SchemaAdapters.getAbilityMod(actor, 'str');
  if (explicit.includes('dex')) return SchemaAdapters.getAbilityMod(actor, 'dex');

  if (isRangedWeapon(weapon) && !isThrownMeleeWeapon(weapon)) return 0;
  const strMod = SchemaAdapters.getAbilityMod(actor, 'str');
  if (system.twoHanded === true || system.wieldedTwoHanded === true) return Math.floor(strMod * 1.5);
  return strMod;
}
