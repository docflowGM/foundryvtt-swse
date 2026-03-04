/**
 * PASSIVE Execution Model - Runtime Adapter
 *
 * Scaffolding for PASSIVE ability registration and dispatch.
 * Handles routing of passive abilities to their respective subsystems.
 *
 * Integration points (TODO):
 * - handleModifier: ModifierEngine
 * - handleRule: RuleRegistry
 * - handleDerived: DerivedStatBuilder
 * - handleAura: AuraEngine
 * - handleTriggered: event surface
 */

import { PASSIVE_SUBTYPES } from "./passive-types.js";
import { PassiveContractValidator } from "./passive-contract.js";

export class PassiveAdapter {

  /**
   * Register a passive ability on an actor.
   * Validates contract, then dispatches to appropriate handler.
   *
   * @param {Object} actor - The actor document
   * @param {Object} ability - The ability item
   */
  static register(actor, ability) {
    if (ability.system.executionModel !== "PASSIVE") return;

    PassiveContractValidator.validate(ability);

    switch (ability.system.subType) {

      case PASSIVE_SUBTYPES.MODIFIER:
        this.handleModifier(actor, ability);
        break;

      case PASSIVE_SUBTYPES.RULE:
        this.handleRule(actor, ability);
        break;

      case PASSIVE_SUBTYPES.DERIVED_OVERRIDE:
        this.handleDerived(actor, ability);
        break;

      case PASSIVE_SUBTYPES.AURA:
        this.handleAura(actor, ability);
        break;

      case PASSIVE_SUBTYPES.TRIGGERED:
        this.handleTriggered(actor, ability);
        break;
    }
  }

  /**
   * Handle MODIFIER subtype.
   * TODO: integrate with ModifierEngine
   *
   * @param {Object} actor
   * @param {Object} ability
   */
  static handleModifier(actor, ability) {
    // TODO: integrate with ModifierEngine
  }

  /**
   * Handle RULE subtype.
   * TODO: integrate with RuleRegistry
   *
   * @param {Object} actor
   * @param {Object} ability
   */
  static handleRule(actor, ability) {
    // TODO: integrate with RuleRegistry
  }

  /**
   * Handle DERIVED_OVERRIDE subtype.
   * TODO: integrate with DerivedStatBuilder
   *
   * @param {Object} actor
   * @param {Object} ability
   */
  static handleDerived(actor, ability) {
    // TODO: integrate with DerivedStatBuilder
  }

  /**
   * Handle AURA subtype.
   * TODO: integrate with AuraEngine
   *
   * @param {Object} actor
   * @param {Object} ability
   */
  static handleAura(actor, ability) {
    // TODO: integrate with AuraEngine
  }

  /**
   * Handle TRIGGERED subtype.
   * TODO: integrate with event surface
   *
   * @param {Object} actor
   * @param {Object} ability
   */
  static handleTriggered(actor, ability) {
    // TODO: integrate with event surface
  }
}
