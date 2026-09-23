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
//
// V2 combat runtime convergence, Phase 3 (136-record reconciliation,
// second correction round): 'weaponCapability' (currently only used for
// requiresAutofire) does NOT belong here. The certified
// CombatOptionResolver explicitly probes autofire as a toggleable context
// gate -- ATTACK_OPTION_PROBE_CONTEXT_OVERRIDES sets `autofire: true`
// alongside `aim`/`charge`, and unmetToggleableReasons() reports "Requires
// an autofire-capable weapon or autofire mode" (a 'disabled' reason, the
// same bucket as unmet Aim/Charge) rather than excluding the option
// entirely. Treating it as structural made every requiresAutofire record
// permanently 'hidden' whenever autofire wasn't already satisfied, instead
// of the reachable 'disabled' state legacy reports -- caught by the
// 136-record reconciliation suite (Flood of Fire, Autofire Assault) before
// this reached production presentation.
const STRUCTURAL_PREDICATE_TYPES = new Set([
  'attackType', 'weaponGroup', 'weaponTextMatch', 'unarmed',
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
  //
  // V2 combat runtime convergence, Phase 3 (136-record reconciliation):
  // `requiresAttackType: 'any'` is a real, shipped value (e.g. Rebel
  // Military Training) meaning "no attack-type restriction," matching the
  // certified CombatOptionResolver.optionAllowedForWeapon()'s own explicit
  // `option.requiresAttackType !== "any"` skip. Value equality would never
  // match it (getAttackType() only ever returns 'melee'/'ranged'/'unknown',
  // never literally 'any'), so every such record would incorrectly and
  // permanently evaluate 'hidden' -- caught by the reconciliation suite
  // before this had a chance to reach production presentation.
  attackType(predicate, context) {
    if (normalizeKey(predicate.value) === 'any') return { met: true, reason: null };
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

// Math Integrity Freeze, Attack Bonus round 8 correction #4 (Blocker 2):
// a tri-state result model for requirement evaluation. Correction #3
// fixed only the DIRECT case of an unknown predicate wrapped in `not`
// (`not: { type: 'unknownType' }`) by special-casing it before the
// negation ran. That special case did not cover an unknown predicate
// NESTED inside a composite sub-tree under `not` (e.g.
// `not: { any: [ unknown, known-false ] }`): the composite evaluation
// treated the unknown leaf as ordinary boolean `false`, so
// `any(false, false) = false`, and `not(false) = true` -- permission by
// default, the exact fail-open failure mode this correction exists to
// close. Ordinary boolean `true`/`false` cannot distinguish "definitely
// false" from "unresolvable, so cannot be proven true OR false" once it
// participates in `all`/`any`/`not` composition -- both looked like
// plain `false` to a boolean negation. MET/UNMET/UNRESOLVED replaces
// that boolean with a tri-state value so UNRESOLVED propagates correctly
// through arbitrary nesting:
//   NOT(MET)        -> UNMET
//   NOT(UNMET)       -> MET
//   NOT(UNRESOLVED) -> UNRESOLVED   (never MET; negation cannot manufacture proof)
//   ALL: any UNMET child -> UNMET; else any UNRESOLVED child -> UNRESOLVED; else MET
//   ANY: any MET child -> MET; else any UNRESOLVED child -> UNRESOLVED; else UNMET
// Only MET counts as "requirement satisfied" -- UNRESOLVED, like UNMET,
// can never make an option `available`.
const MET = 'met';
const UNMET = 'unmet';
const UNRESOLVED = 'unresolved';

function negateState(state) {
  if (state === MET) return UNMET;
  if (state === UNMET) return MET;
  return UNRESOLVED;
}

// Matches the pre-tri-state `results.every(Boolean)` exactly for an
// all-known-values array (including the vacuous `all: []` -> MET case);
// additionally, any UNRESOLVED child (with no UNMET child) yields
// UNRESOLVED rather than the unsound MET a plain boolean `.every()` would
// have given a caller that mapped UNRESOLVED to `true`.
function allOfStates(states) {
  if (states.some(s => s === UNMET)) return UNMET;
  if (states.some(s => s === UNRESOLVED)) return UNRESOLVED;
  return MET;
}

// Matches the pre-tri-state `results.length === 0 || results.some(Boolean)`
// exactly for an all-known-values array (including the vacuous `any: []`
// -> MET case); additionally, any UNRESOLVED child (with no MET child)
// yields UNRESOLVED rather than the unsound UNMET a plain boolean
// `.some()` would have given.
function anyOfStates(states) {
  if (states.length === 0) return MET;
  if (states.some(s => s === MET)) return MET;
  if (states.some(s => s === UNRESOLVED)) return UNRESOLVED;
  return UNMET;
}

/**
 * Math Integrity Freeze, Attack Bonus round 8 correction #5 (causal
 * blocker propagation): `leaves` (mutated in place, unchanged contract)
 * is FULL diagnostic provenance -- every branch evaluated, never
 * short-circuited, exactly as before. `blockers` (the new return field)
 * is the SUBSET of those leaves that actually caused THIS node's own
 * state to be non-MET, following the boolean tree's own causal
 * structure -- not merely "every leaf anywhere in the tree that happened
 * to evaluate false." An independent review found `evaluate()` state
 * classification (hidden/external-workflow/unsupported/disabled) had
 * been filtering the flat, undifferentiated `leaves` list instead: a
 * structural leaf that failed inside an `any()` branch whose SIBLING
 * succeeded still got counted as if it were an active blocker, wrongly
 * forcing `hidden` even though that `any()` was genuinely satisfied
 * through the other branch. Propagation rules:
 *   - a leaf/not-node's own blockers: `[]` if its own state is MET,
 *     otherwise `[itself]` (a `not` node's inner detail stays in
 *     `leaves` for diagnostics but is NOT re-exposed as a blocker of the
 *     `not` node itself -- the `not` node's own synthesized leaf IS the
 *     blocker, representing why the exclusion failed, one level up).
 *   - `all`: every child's blockers are unioned in, regardless of that
 *     child's state -- a MET child's own blockers are already `[]` by
 *     construction, so this needs no extra branching.
 *   - `any`: if the combined state is MET (i.e. at least one child was
 *     MET), blockers is `[]` -- none of the failed siblings blocked
 *     anything, since the `any()` itself succeeded. Otherwise every
 *     child's blockers are unioned in (every branch genuinely
 *     contributed to the `any()`'s own failure).
 */
function evaluateNode(node, context, leaves) {
  if (!node) return { state: MET, blockers: [] };
  if (Array.isArray(node.all)) {
    const results = node.all.map(child => evaluateNode(child, context, leaves));
    return { state: allOfStates(results.map(r => r.state)), blockers: results.flatMap(r => r.blockers) };
  }
  if (Array.isArray(node.any)) {
    const results = node.any.map(child => evaluateNode(child, context, leaves));
    const state = anyOfStates(results.map(r => r.state));
    return { state, blockers: state === MET ? [] : results.flatMap(r => r.blockers) };
  }
  if (node.not) {
    const sub = node.not;
    let innerState;
    let excludeReason;
    if (sub.type) {
      const evaluator = PREDICATE_EVALUATORS[sub.type];
      if (!evaluator) {
        console.warn(`[ActionAvailabilityEngine] unknown requirement predicate type "${sub.type}" inside not -- failing closed (unresolved, not met)`);
        innerState = UNRESOLVED;
        excludeReason = `Unknown requirement "${sub.type}"`;
      } else {
        const result = evaluator(sub, context);
        innerState = result.met ? MET : UNMET;
        excludeReason = EXCLUDE_REASON_BY_TYPE[sub.type] ?? result.reason ?? 'Excluded by current state';
      }
    } else {
      // Composite (any/all/nested-not) sub-tree: delegate the whole
      // sub-tree to one evaluateNode() call so UNRESOLVED correctly
      // propagates out of arbitrarily deep nesting (round 8 correction
      // #4, Blocker 2). evaluateNode() itself already fully evaluates
      // every all/any branch via .map() before reducing, so this also
      // preserves non-short-circuiting evaluation for free; the
      // collected leaves are merged back into this node's own leaves
      // array (full diagnostics), but the inner result's own `blockers`
      // are deliberately discarded here -- round 8 correction #5: the
      // NOT node's own synthesized leaf (below) is what represents why
      // this exclusion failed to its parent, not a re-exposure of the
      // inner sub-tree's blockers one level up.
      const innerLeaves = [];
      const innerResult = evaluateNode(sub, context, innerLeaves);
      innerState = innerResult.state;
      leaves.push(...innerLeaves);
      excludeReason = innerState === UNRESOLVED
        ? 'Cannot be determined (an unresolved requirement is nested inside this exclusion)'
        : (Array.isArray(sub.any) ? 'Conflicts with a currently selected option' : 'Excluded by current state');
    }
    const outerState = negateState(innerState);
    const met = outerState === MET;
    const structural = Boolean(sub.type && STRUCTURAL_PREDICATE_TYPES.has(sub.type));
    const notLeaf = { type: `not(${sub.type ?? 'group'})`, key: null, met, reason: met ? null : excludeReason, unresolved: outerState === UNRESOLVED, structural, sourceField: node.sourceField };
    leaves.push(notLeaf);
    return { state: outerState, blockers: met ? [] : [notLeaf] };
  }
  if (node.type) {
    const evaluator = PREDICATE_EVALUATORS[node.type];
    if (!evaluator) {
      console.warn(`[ActionAvailabilityEngine] unknown requirement predicate type "${node.type}" -- failing closed (unresolved, not met)`);
      const leaf = { type: node.type, key: node.key, met: false, reason: `Unknown requirement "${node.type}"`, unresolved: true, sourceField: node.sourceField };
      leaves.push(leaf);
      return { state: UNRESOLVED, blockers: [leaf] };
    }
    const result = evaluator(node, context);
    const leaf = {
      type: node.type, key: node.key, met: result.met, reason: result.reason,
      externalWorkflow: result.externalWorkflow === true, unsupported: result.unsupported === true,
      structural: STRUCTURAL_PREDICATE_TYPES.has(node.type), sourceField: node.sourceField
    };
    leaves.push(leaf);
    return { state: result.met ? MET : UNMET, blockers: result.met ? [] : [leaf] };
  }
  return { state: MET, blockers: [] };
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
    const { state: rootState, blockers } = evaluateNode(definition.requirements, context, leaves);
    const met = rootState === MET;

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
    //
    // Math Integrity Freeze, Attack Bonus round 8 correction #5: this
    // classification now reads `blockers` (the causally-relevant subset
    // evaluateNode() computed by following the all/any/not tree's own
    // structure), never the flat `leaves` array. An independent review
    // found that filtering the flat leaves list conflated "evaluated
    // somewhere in the tree for diagnostics" with "actually caused the
    // root to fail": a structural leaf that failed inside an `any()`
    // branch whose SIBLING succeeded still got counted as if it were an
    // active blocker, wrongly forcing `hidden` even though that `any()`
    // was genuinely satisfied through the other branch. `blockers` is
    // guaranteed empty exactly when `met` is true, and otherwise contains
    // only the leaves that genuinely contributed to `rootState` not being
    // MET -- `leaves` (returned as `requirements` below) still exposes
    // every evaluated branch for full UI diagnostics, unchanged.
    if (blockers.some(l => l.structural)) {
      return { definition, state: 'hidden', active: false, reason: null, requirements: leaves };
    }
    if (blockers.some(l => l.externalWorkflow)) {
      return { definition, state: 'external-workflow', active: false, reason: 'Not available from this dialog', requirements: leaves };
    }
    if (blockers.length && blockers.every(l => l.unsupported)) {
      return { definition, state: 'unsupported', active: false, reason: 'Not yet supported by this dialog', requirements: leaves };
    }
    return {
      definition,
      state: 'disabled',
      active: false,
      reason: blockers.map(l => l.reason).filter(Boolean).join('; ') || 'Not currently available',
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
