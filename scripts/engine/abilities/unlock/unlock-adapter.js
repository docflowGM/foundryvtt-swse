/**
 * UNLOCK Execution Model - Runtime Adapter
 *
 * Registers UNLOCK abilities during actor initialization.
 * UNLOCK abilities grant system access or capabilities without performing an action.
 *
 * Grant Categories:
 * - SYSTEM_ACCESS: Unlock Force domains, attunement, etc.
 * - PROFICIENCY: Grant weapon/armor proficiencies
 * - DOMAIN_ACCESS: Force domain access
 * - SKILL_TRAINING: Mark skills as trained (class skills)
 *
 * ARCHITECTURAL NOTES:
 * - Contract validation ensures schema correctness at registration time
 * - PrerequisiteChecker handles runtime capability verification (not duplicated here)
 * - Grant handlers will apply state changes via ActorEngine in Phase 2
 * - No state mutation occurs during registration - only metadata collection
 *
 * Integration points:
 * - Schema validation via UnlockContractValidator
 * - Grant handler implementation (each category routed to handler)
 * - State application via ActorEngine (future phase)
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { UnlockContractValidator } from "./unlock-contract.js";
import { CapabilityRegistry } from "/systems/foundryvtt-swse/scripts/engine/capabilities/capability-registry.js";

export class UnlockAdapter {

  /**
   * Register an unlock ability on an actor.
   * Validates schema, then routes grants to appropriate handlers.
   *
   * @param {Object} actor - The actor document
   * @param {Object} ability - The ability item
   */
  static register(actor, ability) {
    try {
      // ── Validate contract ──────────────────────────────────────────────
      UnlockContractValidator.assert(ability);

      // ── Route grants to handlers ───────────────────────────────────────
      const grants = ability.system?.abilityMeta?.grants;
      if (!Array.isArray(grants)) return;

      for (const grant of grants) {
        this.processGrant(actor, ability, grant);
      }

      swseLogger.log(
        `[UnlockAdapter] Registered UNLOCK ability "${ability.name}" on ${actor.name} ` +
        `(${grants.length} grant(s))`
      );
    } catch (err) {
      swseLogger.error(
        `[UnlockAdapter] Registration failed for "${ability.name}":`,
        err.message
      );
      // Non-fatal: log error but don't crash actor registration
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
   * planned:
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
   * planned:
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
   * planned:
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
   * planned:
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
