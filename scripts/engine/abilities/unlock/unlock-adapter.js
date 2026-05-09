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
    const capability = String(grant?.capability || '').trim();
    if (!capability) return;

    this._ensureGrantSnapshot(actor);
    actor._unlockGrants.systemAccess.add(capability);

    swseLogger.debug(
      `[UnlockAdapter] ${ability.name} grants system access: ${capability}`
    );
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
    const proficiencyType = String(grant?.proficiencyType || '').trim();
    const proficiencies = Array.isArray(grant?.proficiencies)
      ? grant.proficiencies.map((entry) => String(entry || '').trim()).filter(Boolean)
      : [];

    if (!proficiencyType || proficiencies.length === 0) return;

    this._ensureGrantSnapshot(actor);
    if (!actor._unlockGrants.proficiencies[proficiencyType]) {
      actor._unlockGrants.proficiencies[proficiencyType] = new Set();
    }

    for (const proficiency of proficiencies) {
      actor._unlockGrants.proficiencies[proficiencyType].add(proficiency);
    }

    swseLogger.debug(
      `[UnlockAdapter] ${ability.name} grants ${proficiencyType} proficiencies: ${proficiencies.join(', ')}`
    );
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
    const skills = Array.isArray(grant?.skills)
      ? grant.skills.map((entry) => String(entry || '').trim()).filter(Boolean)
      : [];

    const selected = ability?.system?.selectedChoice || ability?.system?.selectedChoices;
    const selectedEntry = Array.isArray(selected) ? selected[0] : selected;
    const selectedSkill = typeof selectedEntry === 'string'
      ? selectedEntry
      : (selectedEntry?.skill || selectedEntry?.value || selectedEntry?.id || selectedEntry?.label);
    if (selectedSkill) skills.push(String(selectedSkill).trim());

    if (skills.length === 0) return;

    this._ensureGrantSnapshot(actor);
    actor._unlockGrants.skills ??= { training: new Set(), classSkills: new Set() };
    if (!(actor._unlockGrants.skills.training instanceof Set)) {
      actor._unlockGrants.skills.training = new Set(actor._unlockGrants.skills.training || []);
    }

    for (const skill of skills) {
      actor._unlockGrants.skills.training.add(skill);
    }

    swseLogger.debug(
      `[UnlockAdapter] ${ability.name} grants skill training: ${skills.join(', ')}`
    );
  }

  /**
   * Runtime-only grant snapshot used by capability/proficiency queries.
   * This does not mutate actor.system; it is rebuilt every ability registration cycle.
   *
   * @param {Object} actor
   * @private
   */
  static _ensureGrantSnapshot(actor) {
    if (!actor._unlockGrants) {
      actor._unlockGrants = {
        systemAccess: new Set(),
        proficiencies: {
          weapon: new Set(),
          armor: new Set(),
          exotic: new Set(),
          shield: new Set(),
        },
        skills: {
          training: new Set(),
          classSkills: new Set(),
        },
      };
    }

    if (!(actor._unlockGrants.systemAccess instanceof Set)) {
      actor._unlockGrants.systemAccess = new Set(actor._unlockGrants.systemAccess || []);
    }

    actor._unlockGrants.proficiencies = actor._unlockGrants.proficiencies || {};
    for (const key of ['weapon', 'armor', 'exotic', 'shield']) {
      if (!(actor._unlockGrants.proficiencies[key] instanceof Set)) {
        actor._unlockGrants.proficiencies[key] = new Set(actor._unlockGrants.proficiencies[key] || []);
      }
    }

    actor._unlockGrants.skills ??= { training: new Set(), classSkills: new Set() };
    for (const key of ['training', 'classSkills']) {
      if (!(actor._unlockGrants.skills[key] instanceof Set)) {
        actor._unlockGrants.skills[key] = new Set(actor._unlockGrants.skills[key] || []);
      }
    }
  }
}

