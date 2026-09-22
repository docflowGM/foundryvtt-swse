/**
 * ActionAvailabilityEngine — answers "can this actor use this action right
 * now, and why/why not?" (Parts F/G/H). Pure evaluation: no actor
 * mutation, no roll math, no action-economy spend. Interprets an
 * ActionDefinition's `requirements` tree against a small, reusable
 * predicate vocabulary (action-definition.js#ACTION_REQUIREMENT_PREDICATE_TYPES).
 *
 * Math Integrity Freeze, Attack Bonus round 8 correction #1 addendum
 * (groundwork only). This is a parallel, additive layer proven against
 * representative real records by the groundwork test suite -- it is not
 * wired into the live attack dialog in this round, per the explicit
 * "safe incremental migration, not a risky rewrite" instruction.
 * CombatOptionResolver remains the certified, live authority for actual
 * attack-modifier composition and for the current production dialog's
 * option-card rendering.
 */
import {
  isRangedWeapon as canonicalIsRangedWeapon,
  isMeleeWeapon as canonicalIsMeleeWeapon
} from '/systems/foundryvtt-swse/scripts/items/weapon-branch-resolver.js';

function normalizeKey(value) {
  return String(value ?? '').trim().toLowerCase();
}

function resolveAttackType(context) {
  const explicit = normalizeKey(context.attackType);
  if (explicit === 'ranged' || explicit === 'melee') return explicit;
  if (!context.weapon) return 'unknown';
  return canonicalIsRangedWeapon(context.weapon) ? 'ranged' : (canonicalIsMeleeWeapon(context.weapon) ? 'melee' : 'unknown');
}

function weaponText(weapon) {
  const system = weapon?.system ?? {};
  const fields = [weapon?.name, system.weaponType, system.weaponGroup, system.group, system.category, system.weaponCategory, system.type, system.subtype, system.traits?.join?.(' '), system.properties?.join?.(' ')];
  return fields.map(v => normalizeKey(v)).filter(Boolean).join(' ');
}

function resolveTargetActor(context) {
  return context.target ?? context.targetActor ?? null;
}

function targetOwnsItem(target, wantedNames, allowedTypes) {
  if (!target) return false;
  const wanted = (Array.isArray(wantedNames) ? wantedNames : [wantedNames]).map(normalizeKey).filter(Boolean);
  if (!wanted.length) return false;
  try {
    return Array.from(target.items ?? []).some(item => {
      if (allowedTypes && !allowedTypes.includes(normalizeKey(item?.type))) return false;
      const text = normalizeKey(item?.name);
      return wanted.some(w => text.includes(w));
    });
  } catch { return false; }
}

// Predicate types describing a fact about the WEAPON/ATTACK ITSELF, never
// resolvable by changing a context toggle or target selection -- an unmet
// one means this option can never apply here at all, matching
// CombatOptionResolver.optionAllowedForWeapon()'s unconditional (never
// probed) attackType/weaponGroup/weaponCapability/areaAttack gates. Used
// to decide 'hidden' vs 'disabled' below (Part F).
const STRUCTURAL_PREDICATE_TYPES = new Set(['attackType', 'weaponGroup', 'weaponCapability', 'areaAttack']);

/**
 * One evaluator function per ACTION_REQUIREMENT_PREDICATE_TYPES entry.
 * Each returns { met: boolean, reason: string|null }. Adding support for
 * a new predicate type means adding one entry here, never a new
 * per-feat/per-talent special case.
 */
const PREDICATE_EVALUATORS = {
  attackType(predicate, context) {
    const actual = resolveAttackType(context);
    const met = actual === 'unknown' || actual === normalizeKey(predicate.value);
    return { met, reason: met ? null : `Requires a ${predicate.value} attack` };
  },
  weaponGroup(predicate, context) {
    const wanted = (Array.isArray(predicate.value) ? predicate.value : [predicate.value]).map(normalizeKey);
    const text = weaponText(context.weapon);
    const met = wanted.some(w => w && text.includes(w));
    return { met, reason: met ? null : 'Wrong weapon type' };
  },
  weaponCapability(predicate, context) {
    if (normalizeKey(predicate.value) === 'autofire') {
      const met = context.autofire === true || context.attackOptions?.autofire === true || weaponText(context.weapon).includes('autofire');
      return { met, reason: met ? null : 'Requires an autofire-capable weapon or autofire mode' };
    }
    return { met: false, reason: `Unsupported weapon capability "${predicate.value}"` };
  },
  context(predicate, context) {
    const met = context[predicate.key] === (predicate.value ?? true);
    const label = predicate.key === 'aim' ? 'Aim' : predicate.key === 'charge' ? 'Charge' : predicate.key;
    return { met, reason: met ? null : `Requires ${label}` };
  },
  targetExists(_predicate, context) {
    const met = Boolean(resolveTargetActor(context));
    return { met, reason: met ? null : 'Requires a target' };
  },
  targetType(predicate, context) {
    const target = resolveTargetActor(context);
    if (!target) return { met: false, reason: 'Requires a target' };
    const wanted = (Array.isArray(predicate.value) ? predicate.value : [predicate.value]).map(normalizeKey);
    const met = wanted.includes(normalizeKey(target.type));
    return { met, reason: met ? null : "Target does not meet this option's requirement" };
  },
  targetFeat(predicate, context) {
    const target = resolveTargetActor(context);
    if (!target) return { met: false, reason: 'Requires a target' };
    const met = targetOwnsItem(target, predicate.value, ['feat']);
    return { met, reason: met ? null : "Target does not meet this option's requirement" };
  },
  targetTalent(predicate, context) {
    const target = resolveTargetActor(context);
    if (!target) return { met: false, reason: 'Requires a target' };
    const met = targetOwnsItem(target, predicate.value, ['talent']);
    return { met, reason: met ? null : "Target does not meet this option's requirement" };
  },
  targetFlatFooted(_predicate, context) {
    const target = resolveTargetActor(context);
    if (!target) return { met: false, reason: 'Requires a target' };
    const met = context.targetFlatFooted === true || target?.system?.derived?.isFlatFooted === true;
    return { met, reason: met ? null : "Target does not meet this option's requirement" };
  },
  targetDeniedDex(_predicate, context) {
    const target = resolveTargetActor(context);
    if (!target) return { met: false, reason: 'Requires a target' };
    const met = context.targetDeniedDexBonus === true || context.targetFlatFooted === true
      || target?.system?.derived?.deniedDexBonus === true || target?.system?.derived?.isFlatFooted === true;
    return { met, reason: met ? null : "Target does not meet this option's requirement" };
  },
  selectedOption(predicate, context) {
    const selected = context.selectedOptions ?? context.combatOptions ?? context.attackOptions ?? {};
    const met = Boolean(selected?.[predicate.value]);
    return { met, reason: met ? null : `Requires ${predicate.value} to be selected first` };
  },
  areaAttack(_predicate, context) {
    const system = context.weapon?.system ?? {};
    const met = context.areaAttack === true || context.isAreaAttack === true || system.areaAttack === true || system.isAreaAttack === true;
    return { met, reason: met ? null : 'Requires an area attack' };
  },
  externalWorkflow() {
    // Never satisfiable by this dialog -- see action-definition.js's
    // ACTION_REQUIREMENT_PREDICATE_TYPES doc comment.
    return { met: false, reason: null, externalWorkflow: true };
  }
};

/**
 * Recursively evaluates a requirements tree (`all`/`any`/`not`, or a leaf
 * predicate), collecting every leaf evaluation for the result's
 * `requirements` list. Fails closed (Part H): an unknown predicate `type`
 * is treated as NOT met, with a defensive console warning, never as
 * silently satisfied.
 */
function evaluateNode(node, context, leaves) {
  if (!node) return true;
  if (Array.isArray(node.all)) return node.all.every(child => evaluateNode(child, context, leaves));
  if (Array.isArray(node.any)) return node.any.length === 0 || node.any.some(child => evaluateNode(child, context, leaves));
  if (node.not) return !evaluateNode(node.not, context, []); // negated sub-tree's own leaves aren't surfaced -- its failure IS the success
  if (node.type) {
    const evaluator = PREDICATE_EVALUATORS[node.type];
    if (!evaluator) {
      console.warn(`[ActionAvailabilityEngine] unknown requirement predicate type "${node.type}" -- failing closed (not met)`);
      leaves.push({ type: node.type, key: node.key, met: false, reason: `Unknown requirement "${node.type}"` });
      return false;
    }
    const result = evaluator(node, context);
    leaves.push({ type: node.type, key: node.key, met: result.met, reason: result.reason, externalWorkflow: result.externalWorkflow === true, structural: STRUCTURAL_PREDICATE_TYPES.has(node.type) });
    return result.met;
  }
  return true;
}

export class ActionAvailabilityEngine {
  /**
   * @param {import('./action-definition.js').ActionDefinition} definition
   * @param {object} context - { actor, weapon, attackType, target|targetActor,
   *   aim, charge, autofire, selectedOptions|combatOptions|attackOptions,
   *   areaAttack, targetFlatFooted, targetDeniedDexBonus, ... }
   * @returns {{definition, state: string, active: boolean, reason: string|null, requirements: Array}}
   */
  static evaluate(definition, context = {}) {
    const leaves = [];
    const met = evaluateNode(definition.requirements, context, leaves);
    const unmet = leaves.filter(l => !l.met);

    if (met) {
      const active = definition.presentation.control === 'passive';
      return { definition, state: active ? 'passive' : 'available', active, reason: null, requirements: leaves };
    }
    if (unmet.some(l => l.externalWorkflow)) {
      return { definition, state: 'external-workflow', active: false, reason: 'Not available from this dialog', requirements: leaves };
    }
    // If EVERY unmet requirement is structural (attackType/weaponGroup/
    // weaponCapability/areaAttack -- a fact about the weapon itself, not
    // something a player can change in this dialog), the option can never
    // apply here at all and must not even be shown, matching
    // CombatOptionResolver.getAvailableAttackOptions()'s unconditional
    // exclusion for these same gates. A mix of structural AND
    // toggleable/target unmet requirements still surfaces as 'disabled' --
    // the player CAN act on the non-structural ones, even if the
    // structural one alone would also block it.
    if (unmet.every(l => l.structural)) {
      return { definition, state: 'hidden', active: false, reason: null, requirements: leaves };
    }
    return {
      definition,
      state: 'disabled',
      active: false,
      reason: unmet.filter(l => !l.structural).map(l => l.reason).filter(Boolean).join('; ') || 'Not currently available',
      requirements: leaves
    };
  }

  /**
   * @param {import('./action-definition.js').ActionDefinition[]} definitions
   * @param {object} context
   */
  static evaluateMany(definitions, context = {}) {
    return definitions.map(definition => ActionAvailabilityEngine.evaluate(definition, context));
  }
}

export default ActionAvailabilityEngine;
