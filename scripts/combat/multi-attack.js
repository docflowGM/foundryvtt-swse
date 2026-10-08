/**
 * SWSE Multi-Attack System
 *
 * Handles Full Attack actions including:
 * - Two-weapon fighting / Double weapons
 * - Double Attack feat
 * - Triple Attack feat
 * - Dual Weapon Mastery feats (I, II, III)
 *
 * @module combat/multi-attack
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { CapabilityRegistry } from "/systems/foundryvtt-swse/scripts/engine/capabilities/capability-registry.js";
import { CAPABILITY_SLUGS } from "/systems/foundryvtt-swse/scripts/constants/capability-slugs.js";
import { shapeOfWeapon, canonicalProficiencyOf, doubleWeaponEnds, attackSelectionOf } from "/systems/foundryvtt-swse/scripts/items/weapon-runtime/attack-consumer.js";
import { askSpecialQuestion } from "/systems/foundryvtt-swse/scripts/items/weapon-runtime/special-mechanics.js";
import { featChoiceSelectors, featChoiceMatchesShape, normalizeToken, sequenceConstraintViolation } from "/systems/foundryvtt-swse/scripts/items/weapon-runtime/attack-shape.js";

/**
 * Weapon groups for Double/Triple Attack feats
 * @readonly
 */
export const WEAPON_GROUPS = Object.freeze({
  SIMPLE: 'simple',
  PISTOLS: 'pistols',
  RIFLES: 'rifles',
  LIGHTSABERS: 'lightsabers',
  HEAVY: 'heavy',
  ADVANCED_MELEE: 'advanced-melee',
  EXOTIC: 'exotic'
});

/**
 * Multi-attack feat types
 * @readonly
 */
export const MULTI_ATTACK_FEATS = Object.freeze({
  DOUBLE_ATTACK: 'double attack',
  TRIPLE_ATTACK: 'triple attack',
  DUAL_WEAPON_MASTERY_I: 'dual weapon mastery i',
  DUAL_WEAPON_MASTERY_II: 'dual weapon mastery ii',
  DUAL_WEAPON_MASTERY_III: 'dual weapon mastery iii'
});

/**
 * Determine the weapon group for a weapon
 * @param {Item} weapon - The weapon item
 * @returns {string|null} The weapon group or null
 */
export function getWeaponGroup(weapon, context = {}) {
  if (!weapon) {return null;}
  // Phase 5D-F: a canonical weapon's group is its selected profile's structured proficiency family -- never its name/Item text.
  const shape = shapeOfWeapon(weapon, context);
  if (shape.source === 'canonical') {return shape.groupKey;}
  if (shape.source === 'error') {return null;}

  const name = (weapon.name || '').toLowerCase();
  const proficiency = weapon.system?.proficiency?.toLowerCase() || '';
  const subcategory = weapon.system?.subcategory?.toLowerCase() || '';
  const range = (weapon.system?.range || '').toLowerCase();

  // Check proficiency field first (most reliable)
  if (proficiency) {
    if (proficiency.includes('simple')) {return WEAPON_GROUPS.SIMPLE;}
    if (proficiency.includes('pistol')) {return WEAPON_GROUPS.PISTOLS;}
    if (proficiency.includes('rifle')) {return WEAPON_GROUPS.RIFLES;}
    if (proficiency.includes('lightsaber')) {return WEAPON_GROUPS.LIGHTSABERS;}
    if (proficiency.includes('heavy')) {return WEAPON_GROUPS.HEAVY;}
    if (proficiency.includes('advanced') && proficiency.includes('melee')) {return WEAPON_GROUPS.ADVANCED_MELEE;}
    if (proficiency.includes('exotic')) {return WEAPON_GROUPS.EXOTIC;}
  }

  // Check subcategory
  if (subcategory) {
    if (subcategory.includes('simple')) {return WEAPON_GROUPS.SIMPLE;}
    if (subcategory.includes('exotic')) {return WEAPON_GROUPS.EXOTIC;}
  }

  // Fallback to name-based detection
  if (name.includes('lightsaber') || name.includes('lightfoil')) {
    return WEAPON_GROUPS.LIGHTSABERS;
  }
  if (name.includes('pistol') || name.includes('hold-out') || name.includes('blaster pistol')) {
    return WEAPON_GROUPS.PISTOLS;
  }
  if (name.includes('rifle') || name.includes('carbine') || name.includes('bowcaster')) {
    return WEAPON_GROUPS.RIFLES;
  }
  if (name.includes('cannon') || name.includes('launcher') || name.includes('repeating') ||
      name.includes('heavy blaster') || name.includes('e-web')) {
    return WEAPON_GROUPS.HEAVY;
  }
  if (name.includes('vibro') || name.includes('force pike') || name.includes('electrostaff')) {
    return WEAPON_GROUPS.ADVANCED_MELEE;
  }
  if (range === 'melee') {
    // Simple melee weapons
    if (name.includes('knife') || name.includes('club') || name.includes('staff') ||
        name.includes('spear') || name.includes('bayonet')) {
      return WEAPON_GROUPS.SIMPLE;
    }
    return WEAPON_GROUPS.ADVANCED_MELEE;
  }

  // Default ranged to pistols if short range
  const rangeMatch = range.match(/(\d+)/);
  if (rangeMatch) {
    const rangeNum = parseInt(rangeMatch[1], 10);
    if (rangeNum <= 20) {return WEAPON_GROUPS.PISTOLS;}
    if (rangeNum <= 60) {return WEAPON_GROUPS.RIFLES;}
    return WEAPON_GROUPS.HEAVY;
  }

  return null;
}

/**
 * Check if a weapon is a double weapon (two ends)
 * @param {Item} weapon - The weapon item
 * @returns {boolean}
 */
export function isDoubleWeapon(weapon, context = {}) {
  if (!weapon) {return false;}
  // Phase 5D-F: canonical double weapons are structural -- a profile-level doubleWeapon quality in the selected configuration
  // (native double weapons, Amphistaff quarterstaff only) or a valid host configuration (rifle + mounted Vibrobayonet).
  const shape = shapeOfWeapon(weapon, context);
  if (shape.source === 'canonical') {return shape.doubleWeapon.isDouble === true;}
  if (shape.source === 'error') {return false;}

  const name = (weapon.name || '').toLowerCase();
  const properties = weapon.system?.properties || [];

  // Check properties array
  if (properties.some(p => p.toLowerCase().includes('double'))) {
    return true;
  }

  // Check system flag
  if (weapon.system?.isDoubleWeapon) {
    return true;
  }

  // Name-based detection for common double weapons
  const doubleWeaponNames = [
    'double-bladed lightsaber',
    'double bladed lightsaber',
    'quarterstaff',
    'electrostaff',
    'double vibroblade',
    'sith tremor sword'
  ];

  return doubleWeaponNames.some(dw => name.includes(dw));
}

/**
 * Parse a feat name to extract weapon group (e.g., "Double Attack (Rifles)" -> "rifles")
 * @param {string} featName - The feat name
 * @returns {string|null} The weapon group or null
 */
export function extractWeaponGroupFromFeat(featName) {
  if (!featName) {return null;}

  const lowerName = featName.toLowerCase();

  // Match pattern like "Double Attack (Rifles)" or "Double Attack - Lightsabers"
  const parenMatch = lowerName.match(/\(([^)]+)\)/);
  const dashMatch = lowerName.match(/[-–]\s*(\w+)/);

  let group = parenMatch?.[1]?.trim() || dashMatch?.[1]?.trim();
  if (!group) {return null;}

  // Normalize group name
  group = group.toLowerCase();
  if (group.includes('simple')) {return WEAPON_GROUPS.SIMPLE;}
  if (group.includes('pistol')) {return WEAPON_GROUPS.PISTOLS;}
  if (group.includes('rifle')) {return WEAPON_GROUPS.RIFLES;}
  if (group.includes('lightsaber')) {return WEAPON_GROUPS.LIGHTSABERS;}
  if (group.includes('heavy')) {return WEAPON_GROUPS.HEAVY;}
  if (group.includes('advanced') || group.includes('melee')) {return WEAPON_GROUPS.ADVANCED_MELEE;}
  if (group.includes('exotic')) {return WEAPON_GROUPS.EXOTIC;}

  return group;
}

/**
 * Get all Double Attack weapon groups an actor has
 * @param {Actor} actor - The actor
 * @returns {Set<string>} Set of weapon groups
 */
export function getDoubleAttackGroups(actor) {
  const groups = new Set();

  for (const item of actor.items) {
    if (item.type !== 'feat') {continue;}

    const name = item.name?.toLowerCase() || '';
    if (!name.includes('double attack')) {continue;}

    const group = extractWeaponGroupFromFeat(item.name);
    if (group) {
      groups.add(group);
    }
  }

  return groups;
}

/**
 * Get all Triple Attack weapon groups an actor has
 * @param {Actor} actor - The actor
 * @returns {Set<string>} Set of weapon groups
 */
export function getTripleAttackGroups(actor) {
  const groups = new Set();

  for (const item of actor.items) {
    if (item.type !== 'feat') {continue;}

    const name = item.name?.toLowerCase() || '';
    if (!name.includes('triple attack')) {continue;}

    const group = extractWeaponGroupFromFeat(item.name);
    if (group) {
      groups.add(group);
    }
  }

  return groups;
}

/**
 * Phase 5D-F: does the actor have Double/Triple Attack for THIS weapon form?
 *   canonical weapon -> the feat's own chosen selector (exotic weapon identity or proficiency group) joined to the selected
 *                       canonical form's identity/group (no weapon name, no Item text)
 *   legacy/homebrew  -> the existing group-name path, unchanged
 * @param {'double'|'triple'} kind
 */
export function actorHasMultiAttackFor(actor, kind, weapon, context = {}) {
  const slug = kind === 'triple' ? 'triple-attack' : 'double-attack';
  const shape = shapeOfWeapon(weapon, context);
  if (shape.source === 'canonical') {
    for (const item of actor?.items ?? []) {
      if (item?.type !== 'feat' || item.system?.disabled === true) {continue;}
      const identity = String(item.flags?.swse?.canonicalFeat?.identityKey ?? '');
      const base = normalizeToken(String(item.name ?? '').replace(/\([^)]*\)/g, ''));
      if (!(identity.endsWith(`::${slug}`) || base === slug)) {continue;}
      if (featChoiceMatchesShape(featChoiceSelectors(item, { actor, choiceKind: `${kind}_attack_weapon` }), shape)) {return true;}
    }
    return false;
  }
  if (shape.source === 'error') {return false;}
  const group = getWeaponGroup(weapon);
  const groups = kind === 'triple' ? getTripleAttackGroups(actor) : getDoubleAttackGroups(actor);
  return !!group && groups.has(group);
}

/**
 * Get the actor's Dual Weapon Mastery level (0, 1, 2, or 3)
 * @param {Actor} actor - The actor
 * @returns {number} DWM level (0 = none, 1 = DWM I, 2 = DWM II, 3 = DWM III)
 */
export function getDualWeaponMasteryLevel(actor) {
  let level = 0;

  // Check for each DWM level in reverse order (highest first)
  if (CapabilityRegistry.hasFeat(actor, CAPABILITY_SLUGS.DUAL_WEAPON_MASTERY_III)) {
    level = 3;
  } else if (CapabilityRegistry.hasFeat(actor, CAPABILITY_SLUGS.DUAL_WEAPON_MASTERY_II)) {
    level = 2;
  } else if (CapabilityRegistry.hasFeat(actor, CAPABILITY_SLUGS.DUAL_WEAPON_MASTERY_I)) {
    level = 1;
  }

  return level;
}

/**
 * Calculate the dual weapon penalty based on DWM level
 * @param {number} dwmLevel - Dual Weapon Mastery level (0-3)
 * @returns {number} The penalty (negative number)
 */
export function getDualWeaponPenalty(dwmLevel) {
  switch (dwmLevel) {
    case 3: return 0;    // DWM III: no penalty
    case 2: return -2;   // DWM II: -2 penalty
    case 1: return -5;   // DWM I: -5 penalty
    default: return -10; // No DWM: -10 penalty
  }
}

/**
 * Check if actor has a specific weapon equipped for off-hand
 * @param {Actor} actor - The actor
 * @returns {Item|null} The off-hand weapon or null
 */
export function getOffhandWeapon(actor) {
  // Look for weapons marked as off-hand or secondary
  for (const item of actor.items) {
    if (item.type !== 'weapon') {continue;}
    if (!item.system?.equipped) {continue;}

    if (item.system?.isOffhand || item.system?.slot === 'offhand') {
      return item;
    }
  }

  return null;
}

/**
 * Get equipped weapons for full attack
 * @param {Actor} actor - The actor
 * @returns {Object} { primary: Item, offhand: Item|null, isDoubleWeapon: boolean }
 */
export function getEquippedWeapons(actor) {
  const equipped = {
    primary: null,
    offhand: null,
    isDoubleWeapon: false
  };

  const equippedWeapons = actor.items.filter(i =>
    i.type === 'weapon' && i.system?.equipped
  );

  if (equippedWeapons.length === 0) {
    return equipped;
  }

  // Find primary weapon (not marked as offhand)
  equipped.primary = equippedWeapons.find(w => !w.system?.isOffhand) || equippedWeapons[0];

  // Check if primary is a double weapon
  if (equipped.primary && isDoubleWeapon(equipped.primary)) {
    equipped.isDoubleWeapon = true;
    // Double weapon counts as both primary and offhand
    equipped.offhand = equipped.primary;
  } else {
    // Look for separate offhand weapon
    equipped.offhand = equippedWeapons.find(w => w.system?.isOffhand)
      // Phase 5D-F: a canonical weapon that is structurally eligible as a second weapon (worn, hands stay free) is the off-hand
      // when none is designated -- no feat or name involved
      ?? equippedWeapons.find(w => w.id !== equipped.primary?.id && shapeOfWeapon(w).dualWield?.eligibleAsSecondWeapon === true)
      ?? equippedWeapons.find(w => (w.id !== equipped.primary?.id && equippedWeapons.length > 1));
  }

  return equipped;
}

// ============================================================================
// MULTIATTACK PROFICIENCY RESOLVER
// ============================================================================

/**
 * Map a WEAPON_GROUPS value to the actor system path key used by AE talent effects.
 * @param {string} weaponGroup
 * @returns {string|null}
 */
function weaponGroupToSystemKey(weaponGroup) {
  const MAP = {
    [WEAPON_GROUPS.RIFLES]: 'rifles',
    [WEAPON_GROUPS.PISTOLS]: 'pistols',
    [WEAPON_GROUPS.HEAVY]: 'heavy',
    [WEAPON_GROUPS.LIGHTSABERS]: 'lightsabers',
    [WEAPON_GROUPS.SIMPLE]: 'simple',
    [WEAPON_GROUPS.ADVANCED_MELEE]: 'advancedMelee',
    [WEAPON_GROUPS.EXOTIC]: 'exotic',
  };
  return MAP[weaponGroup] ?? null;
}

/**
 * Get the total Multiattack Proficiency penalty reduction for a weapon group.
 *
 * Primary source: Active Effect totals stored at system.attacks.{group}.multiattack.
 * Fallback: direct item scan (for actors whose AEs haven't been applied yet).
 *
 * Each rank of Multiattack Proficiency reduces the multiattack penalty by 2.
 *
 * @param {Actor} actor
 * @param {string} weaponGroup - One of WEAPON_GROUPS values
 * @returns {number} Total reduction (positive integer, e.g. 4 for two ranks)
 */
export function getMultiattackReduction(actor, weaponGroup) {
  if (!actor || !weaponGroup) {return 0;}

  // Active Effect-derived system path. Keep it, but do not trust it as the only
  // source because repeatable talents are sometimes represented as one owned
  // item with a rank/quantity or a name suffix like "(2)".
  const systemKey = weaponGroupToSystemKey(weaponGroup);
  let aeTotal = 0;
  if (systemKey) {
    const aeValue = actor.system?.attacks?.[systemKey]?.multiattack;
    if (Number.isFinite(Number(aeValue)) && Number(aeValue) > 0) {
      aeTotal = Number(aeValue);
    }
  }

  // Fallback/direct scan: each owned rank/copy reduces the penalty by 2.
  const normalizedGroup = String(weaponGroup).toLowerCase();
  let scannedTotal = 0;
  for (const item of actor.items ?? []) {
    if (item.type !== 'talent' && item.type !== 'feat') {continue;}
    const name = (item.name ?? '').toLowerCase();
    if (!name.includes('multiattack proficiency')) {continue;}
    const matchesGroup = name.includes(normalizedGroup) ||
        (normalizedGroup === WEAPON_GROUPS.ADVANCED_MELEE && (name.includes('advanced melee') || name.includes('advanced-melee'))) ||
        (normalizedGroup === WEAPON_GROUPS.HEAVY && name.includes('heavy weapon')) ||
        (normalizedGroup === WEAPON_GROUPS.LIGHTSABERS && name.includes('lightsaber'));
    if (!matchesGroup) continue;

    const parentheticalRank = Number(name.match(/\((\d+)\)\s*$/)?.[1] ?? 0) || 0;
    const systemRank = Number(item.system?.quantity ?? item.system?.rank ?? item.system?.ranks ?? item.system?.uses?.max ?? 0) || 0;
    const ranks = Math.max(1, parentheticalRank || systemRank || 1);
    scannedTotal += 2 * ranks;
  }

  // Use whichever source best represents the actor's current state.
  return Math.max(aeTotal, scannedTotal);
}

// ============================================================================
// FULL ATTACK SEQUENCE PLANNER
// ============================================================================

/**
 * Phase 5D-F: host-configuration conditions the runtime cannot observe (e.g. "is the host rifle's stock folded?") are asked ONCE
 * before a sequence is planned; the answers travel with the plan, every attack's roll and its damage -- never re-asked per attack.
 * Returns the (possibly extended) answers map. Unanswered conditions stay unanswered (the double weapon then stays unavailable).
 */
export async function collectPlanAnswers(weapon, options = {}) {
  const answers = { ...(options.answers ?? {}) };
  if (!weapon) {return answers;}
  const pending = shapeOfWeapon(weapon, { ...attackSelectionOf(options.primaryForm), answers }).doubleWeapon?.pendingConditions ?? [];
  for (const cond of pending) {
    if (typeof answers[cond.promptId] === 'boolean') {continue;}
    const ans = await askSpecialQuestion({ id: cond.promptId, family: 'host-configuration-condition', question: `${weapon.name}: ${String(cond.text).replace(/-/g, ' ')}?` });
    if (ans === true || ans === false) {answers[cond.promptId] = ans;}
  }
  return answers;
}

function selectionOptions(options, which) {
  const form = which === 'offhand' ? options.offhandForm : options.primaryForm;
  return { ...attackSelectionOf(form), ...(options.answers ? { answers: options.answers } : {}) };
}

/** Proficiency with a weapon for multi-attack penalty rules: canonical selected-form proficiency, else the legacy Item flag. */
function proficientWith(actor, weapon, selection) {
  const canonical = canonicalProficiencyOf(weapon, actor, selection);
  return canonical !== null ? canonical : weapon?.system?.proficient !== false;
}

/** Every attack entry records the canonical selection it must be rolled with, its fire mode and its position in the sequence. */
function entryExtras(selection, index, extra = {}) {
  return { form: attackSelectionOf(selection), fireMode: 'single', attackIndex: index, ...extra };
}

/**
 * Valid package types for buildFullAttackSequence.
 * @readonly
 */
export const FULL_ATTACK_PACKAGES = Object.freeze({
  NORMAL: 'normal',
  DOUBLE_ATTACK: 'doubleAttack',
  TRIPLE_ATTACK: 'tripleAttack',
  TWO_WEAPON: 'twoWeapon',
  DOUBLE_WEAPON: 'doubleWeapon',
});

/**
 * Build a canonical Full Attack sequence plan.
 *
 * This is the Single Source of Truth for all Full Attack penalty math.
 * It never rolls dice — it returns a data structure the executor consumes.
 *
 * @param {Actor} actor
 * @param {Object} options
 * @param {string} options.requestedPackage - One of FULL_ATTACK_PACKAGES values
 * @param {Item} [options.primaryWeapon] - Override primary weapon (default: equipped primary)
 * @param {Item} [options.offhandWeapon]  - Override offhand weapon
 * @param {string} [options.actionCostOverride] - 'standard' | 'full-round' (default: 'full-round')
 * @returns {{legal:boolean, packageType:string, actionType:string, attacks:Array, warnings:string[], breakdown:string[]}}
 */
export function buildFullAttackSequence(actor, options = {}) {
  const result = {
    legal: false,
    packageType: options.requestedPackage ?? FULL_ATTACK_PACKAGES.NORMAL,
    actionType: options.actionCostOverride ?? 'full-round',
    attacks: [],
    warnings: [],
    breakdown: [],
  };

  if (!actor) {
    result.warnings.push('No actor provided.');
    return result;
  }

  // Resolve weapons
  const equipped = getEquippedWeapons(actor);
  const primaryWeapon = options.primaryWeapon ?? equipped.primary;
  const offhandWeapon = options.offhandWeapon ?? (equipped.isDoubleWeapon ? null : equipped.offhand);

  if (!primaryWeapon) {
    result.warnings.push('No weapon equipped. Equip a weapon before using Full Attack.');
    return result;
  }

  const pkg = result.packageType;

  // ── Normal Full Attack ────────────────────────────────────────────────────
  if (pkg === FULL_ATTACK_PACKAGES.NORMAL) {
    result.legal = true;
    const sel = selectionOptions(options, 'primary');
    result.attacks.push({
      weapon: primaryWeapon,
      label: `${primaryWeapon.name} — Attack 1`,
      weaponGroup: getWeaponGroup(primaryWeapon, sel),
      basePenalty: 0,
      reduction: 0,
      finalPenalty: 0,
      penaltySource: 'Normal Full Attack',
      ...entryExtras(sel, 0),
    });
    result.breakdown.push('Normal Full Attack: no multiattack penalty.');
    return result;
  }

  // ── Double Attack ─────────────────────────────────────────────────────────
  if (pkg === FULL_ATTACK_PACKAGES.DOUBLE_ATTACK) {
    const sel = selectionOptions(options, 'primary');
    const weaponGroup = getWeaponGroup(primaryWeapon, sel);

    if (!actorHasMultiAttackFor(actor, 'double', primaryWeapon, sel)) {
      result.warnings.push(
        `Double Attack: actor does not have Double Attack for ${weaponGroup ?? 'this weapon'}.`
      );
      return result;
    }
    const violation = sequenceConstraintViolation(shapeOfWeapon(primaryWeapon, sel), 2);
    if (violation) {
      result.warnings.push(`Double Attack: ${violation}.`);
      return result;
    }

    const basePenalty = -5;
    const reduction = getMultiattackReduction(actor, weaponGroup);
    const finalPenalty = Math.min(0, basePenalty + reduction);

    result.legal = true;
    for (let i = 0; i < 2; i++) {
      result.attacks.push({
        weapon: primaryWeapon,
        label: `${primaryWeapon.name} — Attack ${i + 1}`,
        weaponGroup,
        basePenalty,
        reduction,
        finalPenalty,
        penaltySource: reduction > 0
          ? `Double Attack + Multiattack Proficiency (${weaponGroup})`
          : 'Double Attack',
        ...entryExtras(sel, i),
      });
    }
    result.breakdown.push(`Double Attack (${weaponGroup}): base penalty ${basePenalty}`);
    if (reduction > 0) {
      result.breakdown.push(`Multiattack Proficiency (${weaponGroup}): +${reduction} reduction`);
    }
    result.breakdown.push(`Final penalty per attack: ${finalPenalty}`);
    return result;
  }

  // ── Triple Attack ─────────────────────────────────────────────────────────
  if (pkg === FULL_ATTACK_PACKAGES.TRIPLE_ATTACK) {
    const sel = selectionOptions(options, 'primary');
    const weaponGroup = getWeaponGroup(primaryWeapon, sel);

    const hasDouble = actorHasMultiAttackFor(actor, 'double', primaryWeapon, sel);
    const hasTriple = actorHasMultiAttackFor(actor, 'triple', primaryWeapon, sel);

    if (!hasDouble) {
      result.warnings.push(`Triple Attack requires Double Attack (${weaponGroup ?? 'this weapon'}).`);
      return result;
    }
    if (!hasTriple) {
      result.warnings.push(`Actor does not have Triple Attack (${weaponGroup ?? 'this weapon'}).`);
      return result;
    }

    const violation = sequenceConstraintViolation(shapeOfWeapon(primaryWeapon, sel), 3);
    if (violation) {
      result.warnings.push(`Triple Attack: ${violation}.`);
      return result;
    }
    const basePenalty = -10;
    const reduction = getMultiattackReduction(actor, weaponGroup);
    const finalPenalty = Math.min(0, basePenalty + reduction);

    result.legal = true;
    for (let i = 0; i < 3; i++) {
      result.attacks.push({
        weapon: primaryWeapon,
        label: `${primaryWeapon.name} — Attack ${i + 1}`,
        weaponGroup,
        basePenalty,
        reduction,
        finalPenalty,
        penaltySource: reduction > 0
          ? `Triple Attack + Multiattack Proficiency (${weaponGroup})`
          : 'Triple Attack',
        ...entryExtras(sel, i),
      });
    }
    result.breakdown.push(`Triple Attack (${weaponGroup}): base penalty ${basePenalty}`);
    if (reduction > 0) {
      result.breakdown.push(`Multiattack Proficiency (${weaponGroup}): +${reduction} reduction`);
    }
    result.breakdown.push(`Final penalty per attack: ${finalPenalty}`);
    return result;
  }

  // ── Two-Weapon Attack ─────────────────────────────────────────────────────
  if (pkg === FULL_ATTACK_PACKAGES.TWO_WEAPON) {
    if (!offhandWeapon || offhandWeapon.id === primaryWeapon.id) {
      result.warnings.push('Two-Weapon Attack requires two separate equipped weapons.');
      return result;
    }

    const dwmLevel = getDualWeaponMasteryLevel(actor);
    const priSel = selectionOptions(options, 'primary');
    const offSel = selectionOptions(options, 'offhand');
    const primaryProficient = proficientWith(actor, primaryWeapon, priSel);
    const offhandProficient = proficientWith(actor, offhandWeapon, offSel);
    const dwmEligible = primaryProficient && offhandProficient;

    const basePenalty = -10;
    let finalPenalty = basePenalty;
    let penaltySource = 'Two-Weapon Attack';
    let dwmNote = '';

    if (dwmLevel >= 1 && dwmEligible) {
      finalPenalty = getDualWeaponPenalty(dwmLevel);
      penaltySource = `Two-Weapon Attack + Dual Weapon Mastery ${['I', 'II', 'III'][dwmLevel - 1]}`;
      dwmNote = `Dual Weapon Mastery ${['I', 'II', 'III'][dwmLevel - 1]} reduces penalty to ${finalPenalty}`;
    } else if (dwmLevel >= 1 && !dwmEligible) {
      dwmNote = `Dual Weapon Mastery available but not applied: not proficient with ${!primaryProficient ? primaryWeapon.name : offhandWeapon.name}`;
      result.warnings.push(dwmNote);
    }

    result.legal = true;
    result.attacks.push({
      weapon: primaryWeapon,
      label: `${primaryWeapon.name} — Main Hand`,
      weaponGroup: getWeaponGroup(primaryWeapon, priSel),
      basePenalty,
      reduction: basePenalty - finalPenalty,
      finalPenalty,
      penaltySource,
      ...entryExtras(priSel, 0, { handRole: 'main' }),
    });
    result.attacks.push({
      weapon: offhandWeapon,
      label: `${offhandWeapon.name} — Off Hand`,
      weaponGroup: getWeaponGroup(offhandWeapon, offSel),
      basePenalty,
      reduction: basePenalty - finalPenalty,
      finalPenalty,
      penaltySource,
      ...entryExtras(offSel, 1, { handRole: 'offhand' }),
    });

    result.breakdown.push(`Two-Weapon Attack: base penalty ${basePenalty} to all attacks`);
    if (dwmNote) {result.breakdown.push(dwmNote);}
    result.breakdown.push(`Final penalty per attack: ${finalPenalty}`);
    return result;
  }

  // ── Double-Weapon Attack ──────────────────────────────────────────────────
  if (pkg === FULL_ATTACK_PACKAGES.DOUBLE_WEAPON) {
    const doubleWep = equipped.isDoubleWeapon ? equipped.primary : primaryWeapon;
    const dwSel = selectionOptions(options, 'primary');
    if (!doubleWep || !isDoubleWeapon(doubleWep, dwSel)) {
      result.warnings.push('Double-Weapon Attack requires a double weapon to be equipped.');
      return result;
    }
    // canonical double weapon: each END is its own canonical form (profile-level ends, or host-configuration ends that resolve as
    // their own identity/profile). A weapon that is double in this configuration but exposes fewer than two ends is refused.
    const canonicalEnds = shapeOfWeapon(doubleWep, dwSel).source === 'canonical' ? doubleWeaponEnds(doubleWep, dwSel) : null;
    if (canonicalEnds && canonicalEnds.length < 2) {
      result.warnings.push('Double-Weapon Attack: the selected configuration does not expose two usable ends.');
      return result;
    }

    const dwmLevel = getDualWeaponMasteryLevel(actor);
    const proficient = canonicalEnds
      ? canonicalEnds.every((e) => proficientWith(actor, doubleWep, { ...dwSel, ...e.selection }))
      : doubleWep.system?.proficient !== false;
    const dwmEligible = proficient;

    const basePenalty = -10;
    let finalPenalty = basePenalty;
    let penaltySource = 'Double-Weapon Attack';
    let dwmNote = '';

    if (dwmLevel >= 1 && dwmEligible) {
      finalPenalty = getDualWeaponPenalty(dwmLevel);
      penaltySource = `Double-Weapon Attack + Dual Weapon Mastery ${['I', 'II', 'III'][dwmLevel - 1]}`;
      dwmNote = `Dual Weapon Mastery ${['I', 'II', 'III'][dwmLevel - 1]} reduces penalty to ${finalPenalty}`;
    } else if (dwmLevel >= 1 && !dwmEligible) {
      dwmNote = `Dual Weapon Mastery available but not applied: not proficient with ${doubleWep.name}`;
      result.warnings.push(dwmNote);
    }

    result.legal = true;
    const endEntry = (index, label, endRole) => {
      const end = canonicalEnds?.[index] ?? null;
      const sel = end ? { ...dwSel, ...end.selection } : dwSel;
      return {
        weapon: doubleWep,
        label: `${doubleWep.name} — ${label}`,
        weaponGroup: getWeaponGroup(doubleWep, sel),
        basePenalty,
        reduction: basePenalty - finalPenalty,
        finalPenalty,
        penaltySource,
        ...entryExtras(end ? end.selection : dwSel, index, { handRole: endRole, ...(end ? { endId: end.endId, endVia: end.via } : {}) }),
      };
    };
    result.attacks.push(endEntry(0, 'Primary End', 'double-primary'));
    result.attacks.push(endEntry(1, 'Secondary End', 'double-secondary'));

    result.breakdown.push(`Double-Weapon Attack: base penalty ${basePenalty} to all attacks`);
    if (dwmNote) {result.breakdown.push(dwmNote);}
    result.breakdown.push(`Final penalty per attack: ${finalPenalty}`);
    return result;
  }

  result.warnings.push(`Unknown package type: ${pkg}`);
  return result;
}

/**
 * Calculate full attack configuration for an actor
 *
 * SWSE Full Attack Rules:
 * - Double Attack: 2 attacks with ONE weapon, each at -5 penalty
 * - Triple Attack: 3 attacks with ONE weapon, each at -10 penalty
 * - Two-Weapon Fighting: 2 attacks (one per weapon/end), each at -10 (reduced by DWM)
 * - Combining: Player chooses which weapon makes which extra attack
 * - Penalties are PER SOURCE, not cumulative across sources
 *
 * @param {Actor} actor - The actor
 * @param {Item} primaryWeapon - The primary weapon being used
 * @param {Item} [offhandWeapon] - Optional offhand weapon
 * @param {Object} [options] - Configuration options
 * @param {string} [options.doubleAttackWeapon='primary'] - Which weapon uses Double/Triple Attack
 * @returns {Object} Full attack configuration
 */
export function calculateFullAttackConfig(actor, primaryWeapon, offhandWeapon = null, options = {}) {
  const config = {
    attacks: [],
    breakdown: [],
    isFullAttack: true,
    dwmLevel: 0,
    hasDoubleAttack: false,
    hasTripleAttack: false,
    usingDualWeapons: false,
    usingDoubleWeapon: false,
    doubleAttackPenalty: 0,
    twoWeaponPenalty: 0
  };

  if (!actor || !primaryWeapon) {
    return config;
  }

  const primaryGroup = getWeaponGroup(primaryWeapon);
  const offhandGroup = offhandWeapon ? getWeaponGroup(offhandWeapon) : null;
  const dwmLevel = getDualWeaponMasteryLevel(actor);

  config.dwmLevel = dwmLevel;

  // Check if using double weapon or two weapons
  const isDouble = isDoubleWeapon(primaryWeapon);
  const hasTwoWeapons = offhandWeapon && offhandWeapon.id !== primaryWeapon.id;
  const usingMultipleWeapons = isDouble || hasTwoWeapons;

  config.usingDoubleWeapon = isDouble;
  config.usingDualWeapons = usingMultipleWeapons;

  // Calculate two-weapon penalty (applies only to two-weapon attacks)
  const twoWeaponPenalty = usingMultipleWeapons ? getDualWeaponPenalty(dwmLevel) : 0;
  config.twoWeaponPenalty = twoWeaponPenalty;

  // Check for Double/Triple Attack with matching weapon group
  // Player can choose which weapon to use for Double/Triple Attack
  const doubleAttackWeapon = options.doubleAttackWeapon || 'primary';
  const selectedWeapon = doubleAttackWeapon === 'offhand' && offhandWeapon ? offhandWeapon : primaryWeapon;
  const selectedGroup = doubleAttackWeapon === 'offhand' && offhandGroup ? offhandGroup : primaryGroup;

  // Phase 5D-F: canonical weapons join the feat's chosen selector to the selected canonical form; legacy keeps the group-name path
  const hasDoubleAttack = !!selectedGroup && actorHasMultiAttackFor(actor, 'double', selectedWeapon);
  const hasTripleAttack = !!selectedGroup && hasDoubleAttack && actorHasMultiAttackFor(actor, 'triple', selectedWeapon);

  config.hasDoubleAttack = hasDoubleAttack;
  config.hasTripleAttack = hasTripleAttack;

  // Determine penalty for Double/Triple Attack
  // Double Attack = -5 on all attacks made with it
  // Triple Attack = -10 on all attacks made with it (includes Double Attack prerequisite)
  config.doubleAttackPenalty = hasTripleAttack ? -10 : (hasDoubleAttack ? -5 : 0);

  // Build attack list
  // Attack 1: Primary weapon (standard attack, no penalty unless using Double/Triple Attack)
  const primaryLabel = isDouble ? `${primaryWeapon.name} (Primary End)` : primaryWeapon.name;
  const primaryPenalty = (doubleAttackWeapon === 'primary' && hasDoubleAttack) ? config.doubleAttackPenalty : 0;

  config.attacks.push({
    weapon: primaryWeapon,
    label: primaryLabel,
    attackNumber: 1,
    source: 'primary',
    penalty: primaryPenalty,
    penaltySource: primaryPenalty !== 0 ? (hasTripleAttack ? 'Triple Attack' : 'Double Attack') : null
  });

  // If using Double/Triple Attack, add extra attacks with that weapon
  if (hasDoubleAttack) {
    // Double Attack gives 1 extra attack
    config.attacks.push({
      weapon: selectedWeapon,
      label: `${selectedWeapon.name} (Double Attack)`,
      attackNumber: 2,
      source: 'doubleAttack',
      penalty: config.doubleAttackPenalty,
      penaltySource: hasTripleAttack ? 'Triple Attack' : 'Double Attack'
    });

    if (hasTripleAttack) {
      // Triple Attack gives 1 more extra attack (total 3 with this weapon)
      config.attacks.push({
        weapon: selectedWeapon,
        label: `${selectedWeapon.name} (Triple Attack)`,
        attackNumber: 3,
        source: 'tripleAttack',
        penalty: config.doubleAttackPenalty,
        penaltySource: 'Triple Attack'
      });
    }

    config.breakdown.push(
      hasTripleAttack
        ? `Triple Attack: -10 on all ${selectedWeapon.name} attacks`
        : `Double Attack: -5 on all ${selectedWeapon.name} attacks`
    );
  }

  // If using two weapons or double weapon, add attack with other weapon/end
  if (usingMultipleWeapons) {
    const offhandLabel = isDouble
      ? `${primaryWeapon.name} (Secondary End)`
      : (offhandWeapon?.name || 'Off-hand');

    config.attacks.push({
      weapon: offhandWeapon || primaryWeapon,
      label: offhandLabel,
      attackNumber: config.attacks.length + 1,
      source: 'offhand',
      penalty: twoWeaponPenalty,
      penaltySource: twoWeaponPenalty !== 0
        ? `Two-Weapon${dwmLevel > 0 ? ` (DWM ${['I', 'II', 'III'][dwmLevel - 1]})` : ''}`
        : 'Two-Weapon (DWM III)'
    });

    if (twoWeaponPenalty !== 0) {
      config.breakdown.push(`Two-Weapon Fighting: ${twoWeaponPenalty} on off-hand attack`);
    } else {
      config.breakdown.push(`Two-Weapon Fighting: no penalty (DWM III)`);
    }

    // If the off-hand weapon has Double/Triple Attack AND player chose offhand
    if (doubleAttackWeapon === 'offhand' && hasDoubleAttack) {
      // Already handled above - the Double/Triple attacks are with the offhand weapon
    }
  }

  // Re-number attacks
  config.attacks.forEach((atk, idx) => {
    atk.attackNumber = idx + 1;
  });

  return config;
}


/**
 * Generate HTML chat card for full attack results
 *
 * SHORT-TERM FIX: This generates the chat card HTML.
 * LONG-TERM: This belongs in SWSEChat with card generation refactored separately.
 *
 * @param {Actor} actor - The attacking actor
 * @param {Object[]} results - Array of attack/roll results
 * @param {Object} config - Full attack configuration from calculateFullAttackConfig()
 * @returns {string} HTML for the chat card
 */
export function generateFullAttackCard(actor, results, config) {
  if (!actor || !Array.isArray(results)) {
    return '<div class="swse-full-attack-card"><p>Invalid full attack data.</p></div>';
  }

  // Build attack results HTML
  const attacksHtml = results.map((result, idx) => {
    const attack = config.attacks[idx];
    const rollHtml = result.roll ? `<div class="roll">${result.roll.formula}</div>` : '';
    const totalHtml = result.roll ? `<div class="total">${result.roll.total}</div>` : '';
    const damageHtml = result.damage ? `<div class="damage">${result.damage}</div>` : '';

    return `
      <div class="attack-result">
        <div class="attack-label">${attack?.label || `Attack ${idx + 1}`}</div>
        <div class="attack-details">
          ${rollHtml}
          ${totalHtml}
          ${damageHtml}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="swse-full-attack-card">
      <div class="actor-name">${actor.name}</div>
      <div class="attack-sequence">
        ${attacksHtml}
      </div>
    </div>
  `;
}

// Export all functions
export default {
  WEAPON_GROUPS,
  FULL_ATTACK_PACKAGES,
  MULTI_ATTACK_FEATS,
  getWeaponGroup,
  isDoubleWeapon,
  extractWeaponGroupFromFeat,
  getDoubleAttackGroups,
  getTripleAttackGroups,
  getDualWeaponMasteryLevel,
  getDualWeaponPenalty,
  getOffhandWeapon,
  getEquippedWeapons,
  getMultiattackReduction,
  buildFullAttackSequence,
  calculateFullAttackConfig,
  showFullAttackDialog,
  generateFullAttackCard
};

// ============================================================================
// FULL ATTACK DIALOG
// ============================================================================

/**
 * Show a dialog to configure and confirm a Full Attack sequence.
 *
 * Returns the confirmed sequence object, or null if cancelled.
 *
 * @param {Actor} actor
 * @param {Object} options
 * @param {string} [options.requestedPackage] - Pre-selected package type
 * @param {Item}   [options.primaryWeapon]
 * @param {Item}   [options.offhandWeapon]
 * @returns {Promise<Object|null>} The sequence from buildFullAttackSequence, or null
 */
export async function showFullAttackDialog(actor, options = {}) {
  const equipped = getEquippedWeapons(actor);
  const primaryWeapon = options.primaryWeapon ?? equipped.primary;
  const offhandWeapon = options.offhandWeapon ?? (equipped.isDoubleWeapon ? null : equipped.offhand);

  if (!primaryWeapon) {
    ui.notifications.warn('No weapon equipped for Full Attack.');
    return null;
  }

  // Determine which packages are available to offer
  const planOptions = { primaryForm: options.primaryForm, offhandForm: options.offhandForm, answers: options.answers };
  const primarySel = selectionOptions(options, 'primary');

  const packages = [];

  // Always offer Normal Full Attack
  packages.push({ value: FULL_ATTACK_PACKAGES.NORMAL, label: 'Normal Full Attack' });

  // Double / Triple Attack
  if (actorHasMultiAttackFor(actor, 'double', primaryWeapon, primarySel)) {
    packages.push({ value: FULL_ATTACK_PACKAGES.DOUBLE_ATTACK, label: 'Double Attack' });
    if (actorHasMultiAttackFor(actor, 'triple', primaryWeapon, primarySel)) {
      packages.push({ value: FULL_ATTACK_PACKAGES.TRIPLE_ATTACK, label: 'Triple Attack' });
    }
  }

  // Two-weapon / double-weapon
  if (offhandWeapon && offhandWeapon.id !== primaryWeapon.id) {
    packages.push({ value: FULL_ATTACK_PACKAGES.TWO_WEAPON, label: 'Two-Weapon Attack' });
  }
  if (equipped.isDoubleWeapon || isDoubleWeapon(primaryWeapon, primarySel)) {
    packages.push({ value: FULL_ATTACK_PACKAGES.DOUBLE_WEAPON, label: 'Double-Weapon Attack' });
  }

  // Default selection
  const defaultPkg = options.requestedPackage && packages.some(p => p.value === options.requestedPackage)
    ? options.requestedPackage
    : packages[0].value;

  return new Promise((resolve) => {
    // Build initial preview
    const buildPreview = (pkg) => {
      const seq = buildFullAttackSequence(actor, {
        requestedPackage: pkg,
        primaryWeapon,
        offhandWeapon,
        ...planOptions,
      });

      const attackRows = seq.attacks.map((atk, i) => {
        const pen = atk.finalPenalty !== 0 ? ` <span style="color:#c00">(${atk.finalPenalty})</span>` : '';
        return `<li style="margin:2px 0">${atk.label}${pen}</li>`;
      }).join('');

      const breakdownRows = seq.breakdown.map(b => `<li style="font-size:0.85em;color:#666">${b}</li>`).join('');
      const warningRows = seq.warnings.map(w => `<li style="color:#c00;font-size:0.85em">${w}</li>`).join('');

      return `
        <ul style="margin:4px 0 0 0;padding-left:1.2em">${attackRows}</ul>
        ${breakdownRows ? `<ul style="margin:6px 0 0 0;padding-left:1.2em">${breakdownRows}</ul>` : ''}
        ${warningRows  ? `<ul style="margin:4px 0 0 0;padding-left:1.2em">${warningRows}</ul>`  : ''}
      `;
    };

    const pkgOptions = packages.map(p =>
      `<option value="${p.value}" ${p.value === defaultPkg ? 'selected' : ''}>${p.label}</option>`
    ).join('');

    const content = `
      <form style="padding:4px">
        <div class="form-group">
          <label><b>Attack Package</b></label>
          <select id="fa-pkg-select" style="width:100%">${pkgOptions}</select>
        </div>
        <div id="fa-preview" style="margin-top:8px">${buildPreview(defaultPkg)}</div>
      </form>
    `;

    const d = new Dialog({
      title: 'Full Attack',
      content,
      buttons: {
        roll: {
          icon: '<i class="fas fa-dice-d20"></i>',
          label: 'Roll Full Attack',
          callback: (html) => {
            const pkg = html.find('#fa-pkg-select').val();
            const seq = buildFullAttackSequence(actor, {
              requestedPackage: pkg,
              primaryWeapon,
              offhandWeapon,
              ...planOptions,
            });
            if (!seq.legal) {
              ui.notifications.warn(seq.warnings.join(' '));
              resolve(null);
            } else {
              resolve(seq);
            }
          }
        },
        cancel: {
          label: 'Cancel',
          callback: () => resolve(null)
        }
      },
      default: 'roll',
      render: (html) => {
        html.find('#fa-pkg-select').on('change', (ev) => {
          html.find('#fa-preview').html(buildPreview(ev.target.value));
        });
      },
      close: () => resolve(null)
    });
    d.render(true);
  });
}

