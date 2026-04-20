/**
 * ATTACK_OPTION Execution Model - Runtime Adapter
 *
 * Scaffolding for ATTACK_OPTION ability registration and primitive dispatch.
 * Routes each primitive to its respective subsystem for integration.
 *
 * Integration points (planned):
 * - handleConstructionModifier: AttackBuilder integration
 * - handleTargetingMutation: targeting resolver integration
 * - handleActionEconomyMutation: action validator integration
 * - handleExtraAttackGenerator: attack event surface integration
 * - handleRiderEffect: post-resolution pipeline integration
 */

import { ATTACK_PRIMITIVES } from "./attack-primitives.js";
import { AttackOptionContractValidator } from "./attack-option-contract.js";

export class AttackOptionAdapter {

  /**
   * Register an attack option ability on an actor.
   * Validates contract, then dispatches all primitives.
   *
   * @param {Object} actor - The actor document
   * @param {Object} ability - The ability item
   */
  static register(actor, ability) {
    if (ability.system.executionModel !== "ATTACK_OPTION") return;

    AttackOptionContractValidator.validate(ability);

    for (const primitive of ability.system.abilityMeta.primitives) {
      this.processPrimitive(actor, ability, primitive);
    }
  }

  /**
   * Route a primitive to its handler based on type.
   *
   * @param {Object} actor - The actor document
   * @param {Object} ability - The ability item
   * @param {Object} primitive - The primitive block
   */
  static processPrimitive(actor, ability, primitive) {
    switch (primitive.type) {

      case ATTACK_PRIMITIVES.ATTACK_CONSTRUCTION_MODIFIER:
        this.handleConstructionModifier(actor, ability, primitive.data);
        break;

      case ATTACK_PRIMITIVES.TARGETING_MUTATION:
        this.handleTargetingMutation(actor, ability, primitive.data);
        break;

      case ATTACK_PRIMITIVES.ACTION_ECONOMY_MUTATION:
        this.handleActionEconomyMutation(actor, ability, primitive.data);
        break;

      case ATTACK_PRIMITIVES.EXTRA_ATTACK_GENERATOR:
        this.handleExtraAttackGenerator(actor, ability, primitive.data);
        break;

      case ATTACK_PRIMITIVES.RIDER_EFFECT_ATTACHMENT:
        this.handleRiderEffect(actor, ability, primitive.data);
        break;
    }
  }

  /**
   * Handle ATTACK_CONSTRUCTION_MODIFIER primitive.
   *
   * planned:
   * - integrate with AttackBuilder
   * - register attack bonus modifier
   * - register damage modifier
   * - apply formula evaluation context
   *
   * @param {Object} actor
   * @param {Object} ability
   * @param {Object} data
   */
  static handleConstructionModifier(actor, ability, data) {
    // planned: implement ATTACK_CONSTRUCTION_MODIFIER logic
  }

  /**
   * Handle TARGETING_MUTATION primitive.
   *
   * planned:
   * - integrate with targeting resolver
   * - register range/area mutation
   * - register selection dynamic formula
   * - apply targeting constraints
   *
   * @param {Object} actor
   * @param {Object} ability
   * @param {Object} data
   */
  static handleTargetingMutation(actor, ability, data) {
    // planned: implement TARGETING_MUTATION logic
  }

  /**
   * Handle ACTION_ECONOMY_MUTATION primitive.
   *
   * planned:
   * - integrate with action validator
   * - register action cost override
   * - validate replacesBaseCost semantics
   *
   * @param {Object} actor
   * @param {Object} ability
   * @param {Object} data
   */
  static handleActionEconomyMutation(actor, ability, data) {
    // planned: implement ACTION_ECONOMY_MUTATION logic
  }

  /**
   * Handle EXTRA_ATTACK_GENERATOR primitive.
   *
   * planned:
   * - integrate with attack event surface
   * - register trigger listener (ON_HIT, ON_KILL, ALWAYS)
   * - track extra attack count
   * - apply attack penalty to generated attacks
   *
   * @param {Object} actor
   * @param {Object} ability
   * @param {Object} data
   */
  static handleExtraAttackGenerator(actor, ability, data) {
    // planned: implement EXTRA_ATTACK_GENERATOR logic
  }

  /**
   * Handle RIDER_EFFECT_ATTACHMENT primitive.
   *
   * planned:
   * - integrate with post-resolution pipeline
   * - register effect trigger (ON_HIT, ON_CRIT, ON_MISS)
   * - attach effect payload to attack resolution
   * - apply effect on trigger conditions
   *
   * @param {Object} actor
   * @param {Object} ability
   * @param {Object} data
   */
  static handleRiderEffect(actor, ability, data) {
    // planned: implement RIDER_EFFECT_ATTACHMENT logic
  }
}
