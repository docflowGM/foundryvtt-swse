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
  weaponSupportsAutofire, actorHasFeatSelectedChoiceMatchingWeapon,
  isTargetFlatFooted, isTargetDeniedDexBonus
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
  // Math Integrity Freeze, Attack Bonus round 8 correction #3 (Blocker 4):
  // these used to reimplement the flat-footed/denied-Dex checks inline,
  // and had silently dropped two of CombatOptionResolver's own aliases
  // (flatFootedTarget, deniedDexBonus) in the process -- exactly the
  // drift-risk correction #2 was supposed to eliminate but didn't finish.
  // Now delegates to the same shared, extracted functions the live
  // resolver itself calls.
  targetFlatFooted(_predicate, context) {
    const target = resolveTargetActor(context);
    if (!target) return { met: false, reason: 'Requires a target' };
    const met = isTargetFlatFooted({ ...context, target });
    return { met, reason: met ? null : "Target does not meet this option's requirement" };
  },
  targetDeniedDex(_predicate, context) {
    const target = resolveTargetActor(context);
    if (!target) return { met: false, reason: 'Requires a target' };
    const met = isTargetDeniedDexBonus({ ...context, target });
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
    // Math Integrity Freeze, Attack Bonus round 8 correction #3 (Blocker 3,
    // fail-closed under negation): an UNKNOWN predicate must never let a
    // `not` wrapper report satisfied. Treating "unknown" as ordinary
    // `false` and then negating it (met = !false = true) is exactly the
    // fail-OPEN bug this whole freeze exists to prevent -- it must instead
    // short-circuit to unmet here, bypassing the negation entirely, so an
    // unknown predicate is unmet whether it appears positively or negated.
    if (sub.type && !PREDICATE_EVALUATORS[sub.type]) {
      console.warn(`[ActionAvailabilityEngine] unknown requirement predicate type "${sub.type}" inside not -- failing closed (not met)`);
      leaves.push({ type: `not(${sub.type})`, key: null, met: false, reason: `Unknown requirement "${sub.type}"`, structural: false, sourceField: node.sourceField });
      return false;
    }
    let innerMet;
    let excludeReason;
    if (sub.type) {
      const result = PREDICATE_EVALUATORS[sub.type](sub, context);
      innerMet = result.met;
      excludeReason = EXCLUDE_REASON_BY_TYPE[sub.type] ?? result.reason ?? 'Excluded by current state';
    } else {
      // Math Integrity Freeze, Attack Bonus round 8 correction #3 (Blocker
      // 4, not(any(...)) provenance): the composite (any/all/nested-not)
      // case used to evaluate into a throwaway leaves array, discarding
      // every inner leaf's provenance, and used Array#some() directly on
      // the sub-node list for the `any` case specifically, which
      // short-circuits (stops evaluating once one child succeeds) --
      // losing the remaining children's provenance the "never
      // short-circuits" contract promises. evaluateNode() itself already
      // fully evaluates every all/any branch via .map() before reducing,
      // so delegating the whole sub-tree to one evaluateNode() call (any
      // shape: any/all/nested not) gets that non-short-circuiting
      // evaluation for free; the only fix needed here is merging its
      // collected leaves back into this node's own leaves array instead
      // of discarding them.
      const innerLeaves = [];
      innerMet = evaluateNode(sub, context, innerLeaves);
      leaves.push(...innerLeaves);
      excludeReason = Array.isArray(sub.any) ? 'Conflicts with a currently selected option' : 'Excluded by current state';
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
    // Math Integrity Freeze, Attack Bonus round 8 correction #3 (Blocker
    // 2, state precedence): a structural gate is a fact about the
    // weapon/attack-type itself -- nothing the player can change in this
    // dialog makes it pass. CombatOptionResolver.optionAllowedForWeapon()
    // checks these UNCONDITIONALLY (an early `return false`, never
    // reached alongside any other gate's evaluation), so an option that
    // is wrong for the current weapon/attack-type is never shown at all,
    // regardless of what ELSE is also unmet. This used to only hide the
    // option when EVERY unmet requirement happened to be structural,
    // which surfaced a structurally-impossible option as merely
    // 'disabled' (or even 'external-workflow') whenever a second,
    // non-structural gate was also unmet -- e.g. Mighty Swing
    // (requiresAttackType: melee, requiresSwiftActions: 2) on a ranged
    // weapon reported 'disabled' instead of 'hidden', contradicting both
    // the live resolver and this file's own documented state model. ANY
    // unmet structural gate alone is now sufficient to hide the option,
    // exactly matching the certified authority's own unconditional gate.
    if (unmet.some(l => l.structural)) {
      return { definition, state: 'hidden', active: false, reason: null, requirements: leaves };
    }
    if (unmet.some(l => l.externalWorkflow)) {
      return { definition, state: 'external-workflow', active: false, reason: 'Not available from this dialog', requirements: leaves };
    }
    if (unmet.length && unmet.every(l => l.unsupported)) {
      return { definition, state: 'unsupported', active: false, reason: 'Not yet supported by this dialog', requirements: leaves };
    }
    return {
      definition,
      state: 'disabled',
      active: false,
      reason: unmet.map(l => l.reason).filter(Boolean).join('; ') || 'Not currently available',
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
