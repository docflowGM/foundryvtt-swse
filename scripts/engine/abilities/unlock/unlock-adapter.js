/**
 * UNLOCK Execution Model - Runtime Adapter
 *
 * Scaffolding for UNLOCK ability processing.
 * UNLOCK abilities grant system access without performing an action.
 *
 * Grant Categories:
 * - SYSTEM_ACCESS: Unlock Force domains, attunement, etc.
 * - PROFICIENCY: Grant weapon/armor proficiencies
 * - DOMAIN_ACCESS: Force domain access
 * - SKILL_TRAINING: Mark skills as trained (class skills)
 *
 * Currently UNLOCK relies on prerequisite-checker for capability verification.
 * This adapter exists as a future-proof layer for capability state consolidation.
 * No state mutation or duplication of prerequisite logic occurs here.
 *
 * Integration points (TODO):
 * - Grant application to actor state
 * - Flag-based grant tracking
 * - Compatibility with PASSIVE/ACTIVE ability systems
 */

import { CapabilityRegistry } from "../../capabilities/capability-registry.js";

export class UnlockAdapter {

  /**
   * Register an unlock ability on an actor.
   * Processes all grants defined in the ability.
   *
   * @param {Object} actor - The actor document
   * @param {Object} ability - The ability item
   */
  static register(actor, ability) {
    if (ability.system.executionModel !== "UNLOCK") return;

    const grants = ability.system?.abilityMeta?.grants;
    if (!Array.isArray(grants)) return;

    for (const grant of grants) {
      this.processGrant(actor, ability, grant);
    }
  }

  /**
   * Route a grant to appropriate handler based on category.
   *
   * @param {Object} actor
   * @param {Object} ability
   * @param {Object} grant - Grant object with category and data
   */
  static processGrant(actor, ability, grant) {
    switch (grant.category) {

      case 'SYSTEM_ACCESS':
        this.handleSystemAccess(actor, ability, grant);
        break;

      case 'PROFICIENCY':
        this.handleProficiency(actor, ability, grant);
        break;

      case 'DOMAIN_ACCESS':
        this.handleDomainAccess(actor, ability, grant);
        break;

      case 'SKILL_TRAINING':
        this.handleSkillTraining(actor, ability, grant);
        break;
    }
  }

  /**
   * Handle SYSTEM_ACCESS grant (e.g., Force Sensitivity attunement).
   *
   * TODO:
   * - Verify actor meets prerequisites
   * - Unlock system access (flags, state)
   * - Apply any side effects (e.g., Force points)
   * - Broadcast change event
   *
   * @param {Object} actor
   * @param {Object} ability
   * @param {Object} grant
   */
  static handleSystemAccess(actor, ability, grant) {
    // Future implementation point.
    // Currently capability access flows through PrerequisiteChecker.
  }

  /**
   * Handle PROFICIENCY grant (weapon or armor proficiency).
   *
   * TODO:
   * - Add proficiency to actor.system.weaponProficiencies or armorProficiencies
   * - Verify no duplicates
   * - Broadcast change event
   *
   * @param {Object} actor
   * @param {Object} ability
   * @param {Object} grant
   */
  static handleProficiency(actor, ability, grant) {
    // Future implementation point.
    // Currently proficiency access flows through CapabilityRegistry.
  }

  /**
   * Handle DOMAIN_ACCESS grant (Force domain unlock).
   *
   * TODO:
   * - Verify actor is Force Sensitive
   * - Add domain to accessible domains
   * - Update actor state
   * - Broadcast change event
   *
   * @param {Object} actor
   * @param {Object} ability
   * @param {Object} grant
   */
  static handleDomainAccess(actor, ability, grant) {
    // Future implementation point.
  }

  /**
   * Handle SKILL_TRAINING grant (mark skill as trained/class skill).
   *
   * TODO:
   * - Add skill to actor.system.classSkills or trained skills
   * - Update skill DC calculations if needed
   * - Broadcast change event
   *
   * @param {Object} actor
   * @param {Object} ability
   * @param {Object} grant
   */
  static handleSkillTraining(actor, ability, grant) {
    // Future implementation point.
  }
}
