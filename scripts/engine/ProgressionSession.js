// scripts/engine/ProgressionSession.js
import { swseLogger } from '../utils/logger.js';
import { applyActorUpdateAtomic } from '../utils/actor-utils.js';

/**
 * ProgressionSession - Session-level transaction wrapper for character progression
 *
 * Implements the "all-or-nothing" transactional pattern for character creation
 * and level-up workflows. All changes are staged in memory and only committed
 * atomically when the user confirms.
 *
 * Key Principles:
 * - Staging: All choices buffered in stagedChanges
 * - Validation: Full validation before commit
 * - Atomicity: Either all changes apply or none do
 * - Rollback: Can always revert to pre-session state
 * - Isolation: Actor state never touched until commit
 *
 * Usage:
 *   const session = new ProgressionSession(actor, "levelup");
 *   await session.addClassLevel("jedi");
 *   await session.addTalent("Block");
 *   const preview = await session.preview();
 *   await session.commit(); // or session.rollback()
 */
export class ProgressionSession {
  constructor(actor, mode = "levelup") {
    swseLogger.log(`[SESSION] Creating ProgressionSession - mode: ${mode}, actor: ${actor.name}`);

    if (!actor) {
      throw new Error('ProgressionSession requires a valid actor');
    }

    this.actor = actor;
    this.mode = mode; // "chargen" or "levelup"
    this.sessionId = foundry.utils.randomID();
    this.createdAt = Date.now();

    // Snapshot for rollback (deep clone actor data)
    this.snapshot = actor.toObject();
    swseLogger.log(`[SESSION] Created snapshot of actor state`);

    // Staged changes (buffered until commit)
    this.stagedChanges = {
      // Character progression
      species: null,
      background: null,
      abilities: null,

      // Class levels (array of { classId, level, choices })
      classLevels: [],

      // Selections
      skills: [],
      feats: [],
      talents: [],
      forcePowers: [],
      forceTechniques: [],
      forceSecrets: [],
      starshipManeuvers: [],

      // Ability increases (for level 4/8/12/16/20)
      abilityIncreases: {},

      // HP choices
      hp: [],

      // Items to create
      itemsToCreate: [],

      // Items to delete
      itemsToDelete: []
    };

    // Validation errors
    this.errors = [];

    // Lock to prevent concurrent commits
    this.isCommitting = false;
    this.isCommitted = false;
    this.isRolledBack = false;

    swseLogger.log(`[SESSION] Session ${this.sessionId} initialized`);
  }

  // ============================================================================
  // STAGING METHODS - Buffer choices without touching Actor
  // ============================================================================

  /**
   * Stage a class level addition
   */
  async addClassLevel(classId, choices = {}) {
    swseLogger.log(`[SESSION] Staging class level: ${classId}`);

    // Load class data for validation
    const { PROGRESSION_RULES } = await import('../progression/data/progression-data.js');
    const { getClassData } = await import('../progression/utils/class-data-loader.js');

    let classData = PROGRESSION_RULES.classes[classId];
    if (!classData || !classData.levelProgression) {
      classData = await getClassData(classId);
    }

    if (!classData) {
      this.errors.push(`Unknown class: ${classId}`);
      return false;
    }

    // Calculate level in this class
    const existingLevels = this.stagedChanges.classLevels.filter(cl => cl.classId === classId).length;
    const levelInClass = existingLevels + 1;

    this.stagedChanges.classLevels.push({
      classId,
      levelInClass,
      choices,
      classData // Cache for later use
    });

    swseLogger.log(`[SESSION] Staged class level: ${classId} level ${levelInClass}`);
    return true;
  }

  /**
   * Stage species selection
   */
  async setSpecies(speciesId, abilityChoice = null) {
    swseLogger.log(`[SESSION] Staging species: ${speciesId}`);
    this.stagedChanges.species = { speciesId, abilityChoice };
    return true;
  }

  /**
   * Stage background selection
   */
  async setBackground(backgroundId) {
    swseLogger.log(`[SESSION] Staging background: ${backgroundId}`);
    this.stagedChanges.background = backgroundId;
    return true;
  }

  /**
   * Stage ability scores
   */
  async setAbilities(abilities, method = "pointBuy") {
    swseLogger.log(`[SESSION] Staging abilities: ${method}`);
    this.stagedChanges.abilities = { abilities, method };
    return true;
  }

  /**
   * Stage skill selections
   */
  async addSkills(skills) {
    swseLogger.log(`[SESSION] Staging ${skills.length} skills`);
    this.stagedChanges.skills.push(...skills);
    return true;
  }

  /**
   * Stage feat selections
   */
  async addFeats(feats) {
    swseLogger.log(`[SESSION] Staging ${feats.length} feats`);
    this.stagedChanges.feats.push(...feats);
    return true;
  }

  /**
   * Stage talent selections
   */
  async addTalents(talents) {
    swseLogger.log(`[SESSION] Staging ${talents.length} talents`);
    this.stagedChanges.talents.push(...talents);
    return true;
  }

  /**
   * Stage ability score increase (for level 4/8/12/16/20)
   */
  async addAbilityIncrease(ability, amount = 1) {
    swseLogger.log(`[SESSION] Staging ability increase: ${ability} +${amount}`);
    this.stagedChanges.abilityIncreases[ability] =
      (this.stagedChanges.abilityIncreases[ability] || 0) + amount;
    return true;
  }

  /**
   * Stage HP choice
   */
  async addHP(value) {
    swseLogger.log(`[SESSION] Staging HP: ${value}`);
    this.stagedChanges.hp.push(value);
    return true;
  }

  // ============================================================================
  // PREVIEW - Show what will happen on commit (PURE)
  // ============================================================================

  /**
   * Preview the character state if commit were to happen now
   * Returns a simulated character object without mutating the real actor
   */
  async preview() {
    swseLogger.log(`[SESSION] Generating preview for session ${this.sessionId}`);

    // Clone the snapshot to simulate changes
    const simulatedActor = foundry.utils.deepClone(this.snapshot);

    // Apply staged changes to simulation
    const progression = simulatedActor.system.progression || {};

    // Species
    if (this.stagedChanges.species) {
      progression.species = this.stagedChanges.species.speciesId;
      // Would also apply ability mods, size, speed here
    }

    // Background
    if (this.stagedChanges.background) {
      progression.background = this.stagedChanges.background;
    }

    // Abilities
    if (this.stagedChanges.abilities) {
      // Would set base ability scores here
    }

    // Class levels
    if (this.stagedChanges.classLevels.length > 0) {
      progression.classLevels = this.stagedChanges.classLevels.map(cl => ({
        class: cl.classId,
        level: cl.levelInClass,
        choices: cl.choices
      }));
    }

    // Calculate new character level
    const newLevel = (progression.classLevels || []).length;
    simulatedActor.system.level = newLevel;

    // Skills
    if (this.stagedChanges.skills.length > 0) {
      progression.trainedSkills = [...new Set(this.stagedChanges.skills)];
    }

    // Feats
    if (this.stagedChanges.feats.length > 0) {
      progression.feats = [...new Set(this.stagedChanges.feats)];
    }

    // Talents
    if (this.stagedChanges.talents.length > 0) {
      progression.talents = [...new Set(this.stagedChanges.talents)];
    }

    // Ability increases
    if (Object.keys(this.stagedChanges.abilityIncreases).length > 0) {
      for (const [ability, increase] of Object.entries(this.stagedChanges.abilityIncreases)) {
        const currentBase = simulatedActor.system.attributes?.[ability]?.base || 10;
        simulatedActor.system.attributes[ability].base = currentBase + increase;
      }
    }

    // HP
    if (this.stagedChanges.hp.length > 0) {
      const totalHPGain = this.stagedChanges.hp.reduce((sum, hp) => sum + hp, 0);
      simulatedActor.system.hp.max = (simulatedActor.system.hp?.max || 0) + totalHPGain;
    }

    // Calculate grants and budgets
    const grants = await this._calculateGrants();
    const budget = await this._calculateBudget();
    const violations = await this._validateChoices();

    swseLogger.log(`[SESSION] Preview complete - Level: ${newLevel}, Errors: ${violations.length}`);

    return {
      sessionId: this.sessionId,
      mode: this.mode,
      valid: violations.length === 0,
      errors: violations,
      simulatedActor,
      currentLevel: this.snapshot.system.level || 0,
      newLevel,
      grants,
      budget,
      stagedChanges: this.stagedChanges
    };
  }

  // ============================================================================
  // COMMIT - Atomically apply all changes to Actor
  // ============================================================================

  /**
   * Commit all staged changes to the actor (ATOMIC)
   * Either all changes apply or none do
   */
  async commit() {
    swseLogger.log(`[SESSION] Committing session ${this.sessionId}`);

    // Guard against double-commit
    if (this.isCommitting) {
      throw new Error('Session is already committing');
    }
    if (this.isCommitted) {
      throw new Error('Session has already been committed');
    }
    if (this.isRolledBack) {
      throw new Error('Session has been rolled back and cannot be committed');
    }

    this.isCommitting = true;

    try {
      // Validate before commit
      const preview = await this.preview();
      if (!preview.valid) {
        throw new Error(`Cannot commit: ${preview.errors.join(', ')}`);
      }

      swseLogger.log(`[SESSION] Validation passed, applying changes...`);

      // Build atomic update object
      const updates = {};

      // Species
      if (this.stagedChanges.species) {
        updates['system.progression.species'] = this.stagedChanges.species.speciesId;

        // Apply species ability mods (would need to load species data)
        const { PROGRESSION_RULES } = await import('../progression/data/progression-data.js');
        const speciesData = PROGRESSION_RULES.species[this.stagedChanges.species.speciesId];
        if (speciesData?.abilityMods) {
          for (const [ability, mod] of Object.entries(speciesData.abilityMods)) {
            if (mod !== 0) {
              updates[`system.attributes.${ability}.racial`] = mod;
            }
          }
        }
        if (speciesData?.size) {
          updates['system.size'] = speciesData.size;
        }
        if (speciesData?.speed !== undefined) {
          updates['system.speed'] = speciesData.speed;
        }
      }

      // Background
      if (this.stagedChanges.background) {
        updates['system.progression.background'] = this.stagedChanges.background;
      }

      // Abilities
      if (this.stagedChanges.abilities) {
        updates['system.progression.abilityMethod'] = this.stagedChanges.abilities.method;
        for (const [ability, data] of Object.entries(this.stagedChanges.abilities.abilities)) {
          const value = data.value || data;
          updates[`system.attributes.${ability}.base`] = value;
        }
      }

      // Class levels
      if (this.stagedChanges.classLevels.length > 0) {
        const classLevels = this.stagedChanges.classLevels.map(cl => ({
          class: cl.classId,
          level: cl.levelInClass,
          choices: cl.choices
        }));
        updates['system.progression.classLevels'] = classLevels;
        updates['system.level'] = classLevels.length;
      }

      // Skills
      if (this.stagedChanges.skills.length > 0) {
        updates['system.progression.trainedSkills'] = [...new Set(this.stagedChanges.skills)];
      }

      // Feats
      if (this.stagedChanges.feats.length > 0) {
        updates['system.progression.feats'] = [...new Set(this.stagedChanges.feats)];
      }

      // Talents
      if (this.stagedChanges.talents.length > 0) {
        updates['system.progression.talents'] = [...new Set(this.stagedChanges.talents)];
      }

      // Ability increases
      if (Object.keys(this.stagedChanges.abilityIncreases).length > 0) {
        for (const [ability, increase] of Object.entries(this.stagedChanges.abilityIncreases)) {
          const currentBase = this.actor.system.attributes?.[ability]?.base || 10;
          updates[`system.attributes.${ability}.base`] = currentBase + increase;
        }
      }

      // HP
      if (this.stagedChanges.hp.length > 0) {
        const totalHPGain = this.stagedChanges.hp.reduce((sum, hp) => sum + hp, 0);
        const currentMax = this.actor.system.hp?.max || 0;
        updates['system.hp.max'] = currentMax + totalHPGain;
      }

      // Apply all updates atomically
      swseLogger.log(`[SESSION] Applying ${Object.keys(updates).length} updates to actor...`);
      await applyActorUpdateAtomic(this.actor, updates);

      // Create items from SSOT
      await this._createProgressionItems();

      // Recalculate derived stats
      try {
        const { recalcDerivedStats } = await import('../progression/engine/autocalc/derived-stats.js');
        await recalcDerivedStats(this.actor);
      } catch (err) {
        swseLogger.warn("Derived stats recalculation failed:", err);
      }

      // Mark as committed
      this.isCommitted = true;
      this.isCommitting = false;

      // Emit hook
      Hooks.callAll('swse:progressionSession:committed', {
        actor: this.actor,
        sessionId: this.sessionId,
        mode: this.mode,
        changes: this.stagedChanges
      });

      // Post chat summary
      await this._postCommitSummary();

      swseLogger.log(`[SESSION] Session ${this.sessionId} committed successfully`);

      return {
        success: true,
        sessionId: this.sessionId,
        newLevel: preview.newLevel
      };

    } catch (err) {
      this.isCommitting = false;
      swseLogger.error(`[SESSION] Commit failed:`, err);
      throw err;
    }
  }

  // ============================================================================
  // ROLLBACK - Revert to pre-session state
  // ============================================================================

  /**
   * Rollback all changes and restore actor to pre-session state
   */
  async rollback() {
    swseLogger.log(`[SESSION] Rolling back session ${this.sessionId}`);

    if (this.isCommitted) {
      throw new Error('Cannot rollback a committed session');
    }

    if (this.isRolledBack) {
      swseLogger.warn(`[SESSION] Session already rolled back`);
      return;
    }

    // For now, rollback just clears staged changes
    // In a more advanced implementation, we might restore the actor from snapshot
    this.stagedChanges = {
      species: null,
      background: null,
      abilities: null,
      classLevels: [],
      skills: [],
      feats: [],
      talents: [],
      forcePowers: [],
      forceTechniques: [],
      forceSecrets: [],
      starshipManeuvers: [],
      abilityIncreases: {},
      hp: [],
      itemsToCreate: [],
      itemsToDelete: []
    };

    this.isRolledBack = true;

    // Emit hook
    Hooks.callAll('swse:progressionSession:rolledBack', {
      actor: this.actor,
      sessionId: this.sessionId
    });

    swseLogger.log(`[SESSION] Session ${this.sessionId} rolled back`);
  }

  // ============================================================================
  // BACKTRACKING - Remove staged choices
  // ============================================================================

  /**
   * Remove a staged class level
   */
  removeClassLevel(index) {
    if (index >= 0 && index < this.stagedChanges.classLevels.length) {
      this.stagedChanges.classLevels.splice(index, 1);
      swseLogger.log(`[SESSION] Removed class level at index ${index}`);
    }
  }

  /**
   * Clear all staged talents
   */
  clearTalents() {
    this.stagedChanges.talents = [];
    swseLogger.log(`[SESSION] Cleared all talents`);
  }

  /**
   * Clear all staged feats
   */
  clearFeats() {
    this.stagedChanges.feats = [];
    swseLogger.log(`[SESSION] Cleared all feats`);
  }

  /**
   * Remove a specific talent
   */
  removeTalent(talentId) {
    const index = this.stagedChanges.talents.indexOf(talentId);
    if (index !== -1) {
      this.stagedChanges.talents.splice(index, 1);
      swseLogger.log(`[SESSION] Removed talent: ${talentId}`);
    }
  }

  /**
   * Remove a specific feat
   */
  removeFeat(featId) {
    const index = this.stagedChanges.feats.indexOf(featId);
    if (index !== -1) {
      this.stagedChanges.feats.splice(index, 1);
      swseLogger.log(`[SESSION] Removed feat: ${featId}`);
    }
  }

  // ============================================================================
  // VALIDATION HELPERS
  // ============================================================================

  /**
   * Calculate what this session grants
   */
  async _calculateGrants() {
    const grants = {
      talents: 0,
      bonusFeats: 0,
      forcePoints: 0,
      abilityIncrease: 0,
      features: []
    };

    // Calculate from staged class levels
    for (const cl of this.stagedChanges.classLevels) {
      const levelFeatures = cl.classData?.levelProgression?.[cl.levelInClass] || {};
      grants.talents += levelFeatures.talents || 0;
      grants.bonusFeats += levelFeatures.bonusFeats || 0;
      grants.forcePoints += levelFeatures.forcePoints || 0;
      grants.features.push(...(levelFeatures.features || []));
    }

    // First level always grants 1 feat
    if (this.mode === "chargen") {
      grants.bonusFeats += 1;
    }

    // Ability increase at levels 4/8/12/16/20
    const newLevel = this.stagedChanges.classLevels.length;
    if (newLevel % 4 === 0 && newLevel > 0) {
      grants.abilityIncrease = 2;
    }

    return grants;
  }

  /**
   * Calculate the budget (what player can choose)
   */
  async _calculateBudget() {
    const grants = await this._calculateGrants();

    return {
      talents: grants.talents,
      feats: grants.bonusFeats,
      abilityPoints: grants.abilityIncrease
    };
  }

  /**
   * Validate all staged choices
   */
  async _validateChoices() {
    const errors = [];
    const budget = await this._calculateBudget();

    // Validate talent count
    if (this.stagedChanges.talents.length > budget.talents) {
      errors.push(`Too many talents: ${this.stagedChanges.talents.length}/${budget.talents}`);
    }

    // Validate feat count
    if (this.stagedChanges.feats.length > budget.feats) {
      errors.push(`Too many feats: ${this.stagedChanges.feats.length}/${budget.feats}`);
    }

    // Validate ability increase
    const totalAbilityPoints = Object.values(this.stagedChanges.abilityIncreases).reduce((sum, val) => sum + val, 0);
    if (totalAbilityPoints > budget.abilityPoints) {
      errors.push(`Too many ability points: ${totalAbilityPoints}/${budget.abilityPoints}`);
    }

    // TODO: Add more validation (prerequisites, uniqueness, etc.)

    return errors;
  }

  /**
   * Create progression items from SSOT
   */
  async _createProgressionItems() {
    const itemsToCreate = [];

    // Create feat items
    if (this.stagedChanges.feats.length > 0) {
      const { FeatRegistry } = await import('../progression/feats/feat-registry.js');
      if (!FeatRegistry.isBuilt) await FeatRegistry.build();

      for (const featName of this.stagedChanges.feats) {
        const existing = this.actor.items.find(i => i.type === 'feat' && i.name === featName);
        if (!existing) {
          const featDoc = FeatRegistry.get(featName);
          if (featDoc) {
            itemsToCreate.push({
              ...featDoc.toObject(),
              flags: {
                swse: {
                  source: 'progression',
                  sessionId: this.sessionId
                }
              }
            });
          }
        }
      }
    }

    // Create talent items
    if (this.stagedChanges.talents.length > 0) {
      for (const talentName of this.stagedChanges.talents) {
        const existing = this.actor.items.find(i => i.type === 'talent' && i.name === talentName);
        if (!existing) {
          // Would load from TalentTreeRegistry
          itemsToCreate.push({
            name: talentName,
            type: 'talent',
            system: {
              description: 'Granted by progression'
            },
            flags: {
              swse: {
                source: 'progression',
                sessionId: this.sessionId
              }
            }
          });
        }
      }
    }

    if (itemsToCreate.length > 0) {
      swseLogger.log(`[SESSION] Creating ${itemsToCreate.length} items...`);
      await this.actor.createEmbeddedDocuments('Item', itemsToCreate);
    }
  }

  /**
   * Post commit summary to chat
   */
  async _postCommitSummary() {
    try {
      const preview = await this.preview();

      const content = await renderTemplate('systems/foundryvtt-swse/templates/chat/progression-session-summary.hbs', {
        actor: this.actor,
        mode: this.mode,
        sessionId: this.sessionId,
        newLevel: preview.newLevel,
        grants: preview.grants,
        changes: this.stagedChanges
      });

      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content,
        flags: {
          swse: {
            type: 'progressionSession',
            sessionId: this.sessionId,
            mode: this.mode
          }
        }
      });
    } catch (err) {
      swseLogger.warn('Failed to post session summary:', err);
    }
  }
}

export default ProgressionSession;
