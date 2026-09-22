/**
 * ActionAvailabilityEngine — answers "can this actor use this action right
 * now, and why/why not?" (Parts F/G/H). Pure evaluation: no actor
 * mutation, no roll math, no action-economy spend. Interprets an
 * ActionDefinition's `requirements` tree against a small, reusable
 * predicate vocabulary (action-definition.js#ACTION_REQUIREMENT_PREDICATE_TYPES).
 *
 * Math Integrity Freeze, Attack Bonus round 8 correction #2 (Blocker 4):
 * every predicate evaluator below DELEGATES to
 * scripts/engine/combat/weapon-target-gate-classifiers.js -- the SAME
 * pure functions CombatOptionResolver.optionAllowedForWeapon() (the
 * certified, live gate authority) uses -- rather than maintaining a
 * second, independently-drifting weapon/target text-matching
 * implementation. This file's own job is ONLY the requirement-tree
 * composition (all/any/not) and the presentation-state model (hidden/
 * disabled/available/passive/external-workflow/unsupported), never
 * weapon/target classification itself.
 *
 * This is a parallel, additive layer proven against representative real
 * records by the groundwork test suite -- it is not wired into the live
 * attack dialog in this round, per the explicit "safe incremental
 * migration, not a risky rewrite" instruction. CombatOptionResolver
 * remains the certified, live authority for actual attack-modifier
 * composition and for the current production dialog's option-card
 * rendering.
 */
import {
  normalizeKey, getAttackType, weaponText, weaponDamageText, weaponMatchesGroup,
  isUnarmedWeapon, isVehicleWeapon, isAreaAttackContext, textMatchesAny,
  targetText, targetHasOwnedItem, getRangeBand, normalizeRangeBand,
  weaponSupportsAutofire, actorHasFeatSelectedChoiceMatchingWeapon
} from '/systems/foundryvtt-swse/scripts/engine/combat/weapon-target-gate-classifiers.js';

function resolveTargetActor(context) {
  return context.target ?? context.targetActor ?? null;
}

// Predicate types describing a fact about the WEAPON/ATTACK ITSELF, never
// resolvable by changing a context toggle or target selection -- an unmet
// one means this option can never apply here at all, matching
// CombatOptionResolver.optionAllowedForWeapon()'s unconditional (never
// probed) gates. Used to decide 'hidden' vs 'disabled' below (Part F).
const STRUCTURAL_PREDICATE_TYPES = new Set([
  'attackType', 'weaponGroup', 'weaponCapability', 'weaponTextMatch', 'unarmed',
  'vehicleWeapon', 'damageType', 'areaAttack', 'areaAttackFlag'
]);

// Human-readable label used only when NOT-negating one of these predicate
// types (an excludes* gate field) -- what to tell the player when the
// EXCLUDED condition currently holds. Deliberately generic per predicate
// type rather than per-option; the specific option's own label already
// gives context.
const EXCLUDE_REASON_BY_TYPE = {
  damageType: "This weapon's damage type is excluded for this option",
  areaAttackFlag: 'Area attacks are excluded for this option',
  weaponGroup: 'This weapon type is excluded for this option'
};

/**
 * One evaluator function per ACTION_REQUIREMENT_PREDICATE_TYPES entry.
 * Each returns { met: boolean, reason: string|null }. Adding support for
 * a new predicate type means adding one entry here that DELEGATES to an
 * existing canonical classifier, never a new fuzzy reimplementation.
 */
const PREDICATE_EVALUATORS = {
  // Math Integrity Freeze, Attack Bonus round 8 correction #2 (Blocker 4,
  // fail-closed semantics): an 'unknown' attack type (no weapon, no
  // explicit context) must NOT satisfy a required melee/ranged predicate
  // -- the prior version treated 'unknown' as automatically met, which is
  // permission by default, not fail-closed. A caller that genuinely
  // cannot resolve an attack type has not proven the requirement met.
  attackType(predicate, context) {
    const actual = getAttackType(context.weapon, context);
    const met = actual !== 'unknown' && actual === normalizeKey(predicate.value);
    return { met, reason: met ? null : `Requires a ${predicate.value} attack` };
  },
  weaponGroup(predicate, context) {
    const met = weaponMatchesGroup(context.weapon, predicate.value, context);
    return { met, reason: met ? null : 'Wrong weapon type' };
  },
  weaponTextMatch(predicate, context) {
    const met = textMatchesAny(weaponText(context.weapon), predicate.value);
    return { met, reason: met ? null : 'Wrong weapon type' };
  },
  weaponCapability(predicate, context) {
    if (normalizeKey(predicate.value) === 'autofire') {
      const met = weaponSupportsAutofire(context.weapon, context);
      return { met, reason: met ? null : 'Requires an autofire-capable weapon or autofire mode' };
    }
    return { met: false, reason: `Unsupported weapon capability "${predicate.value}"` };
  },
  unarmed(_predicate, context) {
    const met = isUnarmedWeapon(context.weapon, context);
    return { met, reason: met ? null : 'Requires an unarmed or natural weapon attack' };
  },
  vehicleWeapon(_predicate, context) {
    const met = isVehicleWeapon(context.weapon, context);
    return { met, reason: met ? null : 'Requires a vehicle weapon' };
  },
  damageType(predicate, context) {
    const met = textMatchesAny(weaponDamageText(context.weapon), predicate.value);
    return { met, reason: met ? null : 'Wrong damage type' };
  },
  areaAttack(_predicate, context) {
    const met = isAreaAttackContext(context.weapon, context);
    return { met, reason: met ? null : 'Requires an area attack' };
  },
  // The narrower raw-flag-only check optionAllowedForWeapon() itself uses
  // for excludesAreaAttack specifically (no text-heuristic scan) --
  // intentionally distinct from the fuller `areaAttack` predicate above,
  // matching the certified authority's own asymmetry between its
  // requiresAreaAttack and excludesAreaAttack checks.
  areaAttackFlag(_predicate, context) {
    const system = context.weapon?.system ?? {};
    const met = context.isAreaAttack === true || context.areaAttack === true || system.areaAttack === true || system.isAreaAttack === true;
    return { met, reason: met ? null : 'Not an area attack' };
  },
  featSelectedChoiceMatch(predicate, context) {
    const met = actorHasFeatSelectedChoiceMatchingWeapon(context.actor, predicate.value, context.weapon, context);
    return { met, reason: met ? null : `Requires ${Array.isArray(predicate.value) ? predicate.value.join('/') : predicate.value} selected for this weapon` };
  },
  rangeBand(predicate, context) {
    const allowed = (Array.isArray(predicate.value) ? predicate.value : [predicate.value]).map(normalizeRangeBand);
    const met = allowed.includes(getRangeBand(context));
    return { met, reason: met ? null : 'Wrong range band' };
  },
  contextFlags(predicate, context) {
    const flags = new Set([...(Array.isArray(context.flags) ? context.flags : []), ...(Array.isArray(context.contextFlags) ? context.contextFlags : [])].map(String));
    const required = (Array.isArray(predicate.value) ? predicate.value : [predicate.value]).map(String);
    const met = required.every(flag => context[flag] === true || flags.has(flag));
    return { met, reason: met ? null : 'Requires additional context' };
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
    const met = textMatchesAny(targetText({ ...context, target }), predicate.value);
    return { met, reason: met ? null : "Target does not meet this option's requirement" };
  },
  targetFeat(predicate, context) {
    const target = resolveTargetActor(context);
    if (!target) return { met: false, reason: 'Requires a target' };
    const met = targetHasOwnedItem({ ...context, target }, predicate.value, ['feat']);
    return { met, reason: met ? null : "Target does not meet this option's requirement" };
  },
  targetTalent(predicate, context) {
    const target = resolveTargetActor(context);
    if (!target) return { met: false, reason: 'Requires a target' };
    const met = targetHasOwnedItem({ ...context, target }, predicate.value, ['talent']);
    return { met, reason: met ? null : "Target does not meet this option's requirement" };
  },
  targetItem(predicate, context) {
    const target = resolveTargetActor(context);
    if (!target) return { met: false, reason: 'Requires a target' };
    const met = targetHasOwnedItem({ ...context, target }, predicate.value);
    return { met, reason: met ? null : "Target does not meet this option's requirement" };
  },
  targetText(predicate, context) {
    const target = resolveTargetActor(context);
    if (!target) return { met: false, reason: 'Requires a target' };
    const met = textMatchesAny(targetText({ ...context, target }), predicate.value);
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
  externalWorkflow() {
    // Never satisfiable by this dialog -- see action-definition.js's
    // ACTION_REQUIREMENT_PREDICATE_TYPES doc comment.
    return { met: false, reason: null, externalWorkflow: true };
  },
  unsupported() {
    // A real, dialog-reachable-in-principle gate this groundwork round
    // deliberately does not evaluate yet (e.g. swift-action cost, owned
    // by the existing ActionEngine) -- fails closed, distinct from
    // externalWorkflow (which is structurally impossible, not merely
    // unimplemented).
    return { met: false, reason: 'Not yet supported by this dialog', unsupported: true };
  }
};

/**
 * Math Integrity Freeze, Attack Bonus round 8 correction #2 (Blocker 4,
 * boolean-tree provenance): recursively evaluates a requirements tree
 * (`all`/`any`/`not`, or a leaf predicate), collecting every meaningful
 * leaf evaluation for the result's `requirements` list -- including a
 * synthesized leaf for a `not` node itself, so an excludes* gate that
 * blocks an option produces a real, visible reason rather than a silent
 * true/false. Fails closed: an unknown predicate `type` is treated as NOT
 * met, with a defensive console warning, never as silently satisfied.
 * Every branch of `all`/`any` is evaluated in full (not short-circuited)
 * so every leaf's provenance is collected even when the overall result is
 * already determined.
 */
function evaluateNode(node, context, leaves) {
  if (!node) return true;
  if (Array.isArray(node.all)) {
    const results = node.all.map(child => evaluateNode(child, context, leaves));
    return results.every(Boolean);
  }
  if (Array.isArray(node.any)) {
    const results = node.any.map(child => evaluateNode(child, context, leaves));
    return results.length === 0 || results.some(Boolean);
  }
  if (node.not) {
    const sub = node.not;
    let innerMet;
    let excludeReason;
    if (sub.type) {
      const evaluator = PREDICATE_EVALUATORS[sub.type];
      if (!evaluator) {
        console.warn(`[ActionAvailabilityEngine] unknown requirement predicate type "${sub.type}" inside not -- failing closed (not met)`);
        innerMet = false;
        excludeReason = `Unknown requirement "${sub.type}"`;
      } else {
        const result = evaluator(sub, context);
        innerMet = result.met;
        excludeReason = EXCLUDE_REASON_BY_TYPE[sub.type] ?? result.reason ?? 'Excluded by current state';
      }
    } else if (Array.isArray(sub.any)) {
      const innerLeaves = [];
      innerMet = sub.any.some(child => evaluateNode(child, context, innerLeaves));
      excludeReason = 'Conflicts with a currently selected option';
    } else {
      innerMet = evaluateNode(sub, context, []);
      excludeReason = 'Excluded by current state';
    }
    const met = !innerMet;
    const structural = Boolean(sub.type && STRUCTURAL_PREDICATE_TYPES.has(sub.type));
    leaves.push({ type: `not(${sub.type ?? 'group'})`, key: null, met, reason: met ? null : excludeReason, structural, sourceField: node.sourceField });
    return met;
  }
  if (node.type) {
    const evaluator = PREDICATE_EVALUATORS[node.type];
    if (!evaluator) {
      console.warn(`[ActionAvailabilityEngine] unknown requirement predicate type "${node.type}" -- failing closed (not met)`);
      leaves.push({ type: node.type, key: node.key, met: false, reason: `Unknown requirement "${node.type}"`, sourceField: node.sourceField });
      return false;
    }
    const result = evaluator(node, context);
    leaves.push({
      type: node.type, key: node.key, met: result.met, reason: result.reason,
      externalWorkflow: result.externalWorkflow === true, unsupported: result.unsupported === true,
      structural: STRUCTURAL_PREDICATE_TYPES.has(node.type), sourceField: node.sourceField
    });
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
    if (unmet.some(l => l.unsupported) && unmet.every(l => l.unsupported || l.met)) {
      return { definition, state: 'unsupported', active: false, reason: 'Not yet supported by this dialog', requirements: leaves };
    }
    // If EVERY unmet requirement is structural (a fact about the weapon
    // itself, not something a player can change in this dialog), the
    // option can never apply here at all and must not even be shown,
    // matching CombatOptionResolver.getAvailableAttackOptions()'s
    // unconditional exclusion for these same gates. A mix of structural
    // AND toggleable/target unmet requirements still surfaces as
    // 'disabled' -- the player CAN act on the non-structural ones, even
    // if the structural one alone would also block it.
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
