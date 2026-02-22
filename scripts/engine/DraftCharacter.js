// scripts/engine/DraftCharacter.js
import { swseLogger } from '../utils/logger.js';
import { ActorEngine } from '../governance/actor-engine/actor-engine.js';

/**
 * DraftCharacter - Separate state model for character-in-progress
 *
 * This model holds all progression choices in a staging area completely
 * separate from the Actor document. It allows for:
 * - Preview of derived stats without touching the real character
 * - Backtracking (changing earlier choices invalidates later ones)
 * - Validation before commit
 * - Atomic merge to Actor only on confirmation
 *
 * Key Principles:
 * - Immutable base: Original actor state never changes
 * - Derived preview: Computed stats shown to user
 * - Validation: All rules checked before commit
 * - Merge-only: Actor updated only via explicit merge()
 *
 * Usage:
 *   const draft = new DraftCharacter(actor);
 *   draft.setSpecies("Human");
 *   draft.addClass("Jedi", 1);
 *   draft.addTalent("Block");
 *   const preview = draft.computePreview();
 *   await draft.mergeToActor(); // Commits to real actor
 */
export class DraftCharacter {
  constructor(actor) {
    if (!actor) {
      throw new Error('DraftCharacter requires a valid actor');
    }

    this.actor = actor;
    this.draftId = foundry.utils.randomID();

    // Base state (snapshot of actor at draft creation)
    this.baseState = actor.toObject();

    // Draft choices (what's being built)
    this.choices = {
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
      hp: []
    };

    // Computed state (derived from choices + base)
    this.computed = null;

    // Validation state
    this.isValid = true;
    this.validationErrors = [];

    swseLogger.log(`[DRAFT] Created DraftCharacter ${this.draftId} for ${actor.name}`);
  }

  // ============================================================================
  // CHOICE SETTERS - Build the character
  // ============================================================================

  /**
   * Set species choice
   */
  setSpecies(speciesId, abilityChoice = null) {
    swseLogger.log(`[DRAFT] Setting species: ${speciesId}`);

    // Invalidate downstream choices that depend on species
    this._invalidateDownstream('species');

    this.choices.species = { speciesId, abilityChoice };
    this._markDirty();
  }

  /**
   * Set background choice
   */
  setBackground(backgroundId) {
    swseLogger.log(`[DRAFT] Setting background: ${backgroundId}`);
    this._invalidateDownstream('background');
    this.choices.background = backgroundId;
    this._markDirty();
  }

  /**
   * Set ability scores
   */
  setAbilities(abilities, method = 'pointBuy') {
    swseLogger.log(`[DRAFT] Setting abilities via ${method}`);
    this._invalidateDownstream('abilities');
    this.choices.abilities = { abilities, method };
    this._markDirty();
  }

  /**
   * Add a class level
   */
  addClass(classId, classData = null) {
    swseLogger.log(`[DRAFT] Adding class: ${classId}`);

    const existingLevels = this.choices.classLevels.filter(cl => cl.classId === classId).length;
    const levelInClass = existingLevels + 1;

    this.choices.classLevels.push({
      classId,
      levelInClass,
      classData
    });

    this._markDirty();
  }

  /**
   * Remove a class level by index
   */
  removeClass(index) {
    if (index >= 0 && index < this.choices.classLevels.length) {
      const removed = this.choices.classLevels.splice(index, 1)[0];
      swseLogger.log(`[DRAFT] Removed class level: ${removed.classId} ${removed.levelInClass}`);

      // Invalidate any talents/feats that came from this class
      this._invalidateDownstream('class');
      this._markDirty();
    }
  }

  /**
   * Add skill training
   */
  addSkill(skillId) {
    if (!this.choices.skills.includes(skillId)) {
      this.choices.skills.push(skillId);
      swseLogger.log(`[DRAFT] Added skill: ${skillId}`);
      this._markDirty();
    }
  }

  /**
   * Remove skill training
   */
  removeSkill(skillId) {
    const index = this.choices.skills.indexOf(skillId);
    if (index !== -1) {
      this.choices.skills.splice(index, 1);
      swseLogger.log(`[DRAFT] Removed skill: ${skillId}`);
      this._markDirty();
    }
  }

  /**
   * Clear all skills
   */
  clearSkills() {
    this.choices.skills = [];
    swseLogger.log(`[DRAFT] Cleared all skills`);
    this._markDirty();
  }

  /**
   * Add feat selection
   */
  addFeat(featId) {
    if (!this.choices.feats.includes(featId)) {
      this.choices.feats.push(featId);
      swseLogger.log(`[DRAFT] Added feat: ${featId}`);
      this._markDirty();
    }
  }

  /**
   * Remove feat selection
   */
  removeFeat(featId) {
    const index = this.choices.feats.indexOf(featId);
    if (index !== -1) {
      this.choices.feats.splice(index, 1);
      swseLogger.log(`[DRAFT] Removed feat: ${featId}`);
      this._markDirty();
    }
  }

  /**
   * Clear all feats
   */
  clearFeats() {
    this.choices.feats = [];
    swseLogger.log(`[DRAFT] Cleared all feats`);
    this._markDirty();
  }

  /**
   * Add talent selection
   */
  addTalent(talentId) {
    if (!this.choices.talents.includes(talentId)) {
      this.choices.talents.push(talentId);
      swseLogger.log(`[DRAFT] Added talent: ${talentId}`);
      this._markDirty();
    }
  }

  /**
   * Remove talent selection
   */
  removeTalent(talentId) {
    const index = this.choices.talents.indexOf(talentId);
    if (index !== -1) {
      this.choices.talents.splice(index, 1);
      swseLogger.log(`[DRAFT] Removed talent: ${talentId}`);
      this._markDirty();
    }
  }

  /**
   * Clear all talents
   */
  clearTalents() {
    this.choices.talents = [];
    swseLogger.log(`[DRAFT] Cleared all talents`);
    this._markDirty();
  }

  /**
   * Add ability increase (for levels 4/8/12/16/20)
   */
  addAbilityIncrease(ability, amount = 1) {
    this.choices.abilityIncreases[ability] =
      (this.choices.abilityIncreases[ability] || 0) + amount;
    swseLogger.log(`[DRAFT] Added ability increase: ${ability} +${amount}`);
    this._markDirty();
  }

  /**
   * Add HP
   */
  addHP(value) {
    this.choices.hp.push(value);
    swseLogger.log(`[DRAFT] Added HP: ${value}`);
    this._markDirty();
  }

  // ============================================================================
  // BACKTRACKING - Invalidate downstream choices
  // ============================================================================

  /**
   * Invalidate downstream choices when an earlier choice changes
   * @private
   */
  _invalidateDownstream(changedStep) {
    swseLogger.log(`[DRAFT] Invalidating downstream choices from: ${changedStep}`);

    const dependencyChain = [
      'species',
      'background',
      'abilities',
      'class',
      'skills',
      'feats',
      'talents'
    ];

    const changedIndex = dependencyChain.indexOf(changedStep);
    if (changedIndex === -1) {return;}

    // Clear everything after this step
    for (let i = changedIndex + 1; i < dependencyChain.length; i++) {
      const step = dependencyChain[i];

      switch (step) {
        case 'background':
          this.choices.background = null;
          break;
        case 'abilities':
          this.choices.abilities = null;
          break;
        case 'class':
          this.choices.classLevels = [];
          break;
        case 'skills':
          this.choices.skills = [];
          break;
        case 'feats':
          this.choices.feats = [];
          break;
        case 'talents':
          this.choices.talents = [];
          break;
      }

      swseLogger.log(`[DRAFT] Invalidated: ${step}`);
    }
  }

  /**
   * Mark draft as dirty (needs recompute)
   * @private
   */
  _markDirty() {
    this.computed = null;
    this.validationErrors = [];
    this.isValid = false;
  }

  // ============================================================================
  // PREVIEW COMPUTATION - Show what the character will look like
  // ============================================================================

  /**
   * Compute a preview of what the character will look like
   * Returns a simulated character state without touching the real actor
   */
  async computePreview() {
    swseLogger.log(`[DRAFT] Computing preview for draft ${this.draftId}`);

    // Clone base state
    const preview = foundry.utils.deepClone(this.baseState);

    // Apply species
    if (this.choices.species) {
      const { PROGRESSION_RULES } = await import('../progression/data/progression-data.js');
      const speciesData = PROGRESSION_RULES.species[this.choices.species.speciesId];

      if (speciesData) {
        preview.system.progression = preview.system.progression || {};
        preview.system.progression.species = this.choices.species.speciesId;

        // Apply ability mods
        if (speciesData.abilityMods) {
          for (const [ability, mod] of Object.entries(speciesData.abilityMods)) {
            if (mod !== 0) {
              preview.system.attributes = preview.system.attributes || {};
              preview.system.attributes[ability] = preview.system.attributes[ability] || {};
              preview.system.attributes[ability].racial = mod;
            }
          }
        }

        // Apply size/speed
        if (speciesData.size) {preview.system.size = speciesData.size;}
        if (speciesData.speed !== undefined) {preview.system.speed = speciesData.speed;}
      }
    }

    // Apply background
    if (this.choices.background) {
      preview.system.progression = preview.system.progression || {};
      preview.system.progression.background = this.choices.background;
    }

    // Apply abilities
    if (this.choices.abilities) {
      preview.system.progression = preview.system.progression || {};
      preview.system.progression.abilityMethod = this.choices.abilities.method;

      for (const [ability, data] of Object.entries(this.choices.abilities.abilities)) {
        const value = data.value || data;
        preview.system.attributes = preview.system.attributes || {};
        preview.system.attributes[ability] = preview.system.attributes[ability] || {};
        preview.system.attributes[ability].base = value;
      }
    }

    // Apply class levels
    if (this.choices.classLevels.length > 0) {
      preview.system.progression = preview.system.progression || {};
      preview.system.progression.classLevels = this.choices.classLevels.map(cl => ({
        class: cl.classId,
        level: cl.levelInClass
      }));
      preview.system.level = this.choices.classLevels.length;
    }

    // Apply skills
    if (this.choices.skills.length > 0) {
      preview.system.progression = preview.system.progression || {};
      preview.system.progression.trainedSkills = [...this.choices.skills];
    }

    // Apply feats
    if (this.choices.feats.length > 0) {
      preview.system.progression = preview.system.progression || {};
      preview.system.progression.feats = [...this.choices.feats];
    }

    // Apply talents
    if (this.choices.talents.length > 0) {
      preview.system.progression = preview.system.progression || {};
      preview.system.progression.talents = [...this.choices.talents];
    }

    // Apply ability increases
    if (Object.keys(this.choices.abilityIncreases).length > 0) {
      for (const [ability, increase] of Object.entries(this.choices.abilityIncreases)) {
        preview.system.attributes = preview.system.attributes || {};
        preview.system.attributes[ability] = preview.system.attributes[ability] || {};
        const currentBase = preview.system.attributes[ability].base || 10;
        preview.system.attributes[ability].base = currentBase + increase;
      }
    }

    // Apply HP
    if (this.choices.hp.length > 0) {
      const totalHPGain = this.choices.hp.reduce((sum, hp) => sum + hp, 0);
      preview.system.hp = preview.system.hp || {};
      preview.system.hp.max = (preview.system.hp.max || 0) + totalHPGain;
    }

    // Cache computed preview
    this.computed = preview;

    swseLogger.log(`[DRAFT] Preview computed - Level ${preview.system.level || 0}`);

    return preview;
  }

  // ============================================================================
  // VALIDATION - Check if draft is valid
  // ============================================================================

  /**
   * Validate the draft character
   * Returns true if valid, false otherwise
   */
  async validate() {
    swseLogger.log(`[DRAFT] Validating draft ${this.draftId}`);

    this.validationErrors = [];

    // Validate species
    if (this.choices.species) {
      const { PROGRESSION_RULES } = await import('../progression/data/progression-data.js');
      if (!PROGRESSION_RULES.species[this.choices.species.speciesId]) {
        this.validationErrors.push(`Unknown species: ${this.choices.species.speciesId}`);
      }
    }

    // Validate background
    if (this.choices.background) {
      const { PROGRESSION_RULES } = await import('../progression/data/progression-data.js');
      if (!PROGRESSION_RULES.backgrounds[this.choices.background]) {
        this.validationErrors.push(`Unknown background: ${this.choices.background}`);
      }
    }

    // Validate class levels
    for (const cl of this.choices.classLevels) {
      if (!cl.classId) {
        this.validationErrors.push('Class level missing classId');
      }
    }

    // Validate talent count
    const grantedTalents = await this._calculateGrantedTalents();
    if (this.choices.talents.length > grantedTalents) {
      this.validationErrors.push(
        `Too many talents selected: ${this.choices.talents.length}/${grantedTalents}`
      );
    }

    // Validate feat count
    const grantedFeats = await this._calculateGrantedFeats();
    if (this.choices.feats.length > grantedFeats) {
      this.validationErrors.push(
        `Too many feats selected: ${this.choices.feats.length}/${grantedFeats}`
      );
    }

    // Validate ability increases
    const grantedAbilityPoints = await this._calculateGrantedAbilityPoints();
    const usedAbilityPoints = Object.values(this.choices.abilityIncreases).reduce(
      (sum, val) => sum + val,
      0
    );
    if (usedAbilityPoints > grantedAbilityPoints) {
      this.validationErrors.push(
        `Too many ability points used: ${usedAbilityPoints}/${grantedAbilityPoints}`
      );
    }

    // TODO: Add more validation (prerequisites, uniqueness, etc.)

    this.isValid = this.validationErrors.length === 0;

    swseLogger.log(`[DRAFT] Validation ${this.isValid ? 'passed' : 'failed'} - Errors: ${this.validationErrors.length}`);

    return this.isValid;
  }

  /**
   * Calculate how many talents this draft grants
   * @private
   */
  async _calculateGrantedTalents() {
    let total = 0;

    for (const cl of this.choices.classLevels) {
      if (cl.classData?.levelProgression) {
        const levelFeatures = cl.classData.levelProgression[cl.levelInClass] || {};
        total += levelFeatures.talents || 0;
      }
    }

    return total;
  }

  /**
   * Calculate how many feats this draft grants
   * @private
   */
  async _calculateGrantedFeats() {
    let total = 0;

    // Everyone gets 1 feat at level 1
    if (this.choices.classLevels.length > 0) {
      total = 1;
    }

    // Humans get +1 bonus feat
    if (this.choices.species?.speciesId === 'Human') {
      total += 1;
    }

    // Add class bonus feats
    for (const cl of this.choices.classLevels) {
      if (cl.classData?.levelProgression) {
        const levelFeatures = cl.classData.levelProgression[cl.levelInClass] || {};
        total += levelFeatures.bonusFeats || 0;
      }
    }

    return total;
  }

  /**
   * Calculate how many ability increase points this draft grants
   * @private
   */
  async _calculateGrantedAbilityPoints() {
    const level = this.choices.classLevels.length;

    // Ability increase at levels 4, 8, 12, 16, 20
    if (level % 4 === 0 && level > 0) {
      return 2;
    }

    return 0;
  }

  // ============================================================================
  // MERGE - Commit draft to actor
  // ============================================================================

  /**
   * Merge this draft into the actor
   * This is the only way draft choices become permanent
   */
  async mergeToActor() {
    swseLogger.log(`[DRAFT] Merging draft ${this.draftId} to actor ${this.actor.name}`);

    // Validate first
    const valid = await this.validate();
    if (!valid) {
      throw new Error(`Cannot merge invalid draft: ${this.validationErrors.join(', ')}`);
    }

    // Compute final preview
    const preview = await this.computePreview();

    // Build atomic update object
    const updates = {};

    // Copy all progression data from preview
    if (preview.system.progression) {
      for (const [key, value] of Object.entries(preview.system.progression)) {
        updates[`system.progression.${key}`] = value;
      }
    }

    // Copy attributes
    if (preview.system.attributes) {
      for (const [ability, data] of Object.entries(preview.system.attributes)) {
        if (data.base !== undefined) {
          updates[`system.attributes.${ability}.base`] = data.base;
        }
        if (data.racial !== undefined) {
          updates[`system.attributes.${ability}.racial`] = data.racial;
        }
      }
    }

    // Copy level
    if (preview.system.level !== undefined) {
      updates['system.level'] = preview.system.level;
    }

    // Copy HP
    // PHASE 2: Write HP to authoritative location (system.derived.*)
    if (preview.system.hp?.max !== undefined) {
      updates['system.derived.hp.max'] = preview.system.hp.max;
    }

    // Copy size/speed
    if (preview.system.size) {
      updates['system.size'] = preview.system.size;
    }
    if (preview.system.speed !== undefined) {
      updates['system.speed'] = preview.system.speed;
    }

    // Apply updates atomically
    swseLogger.log(`[DRAFT] Applying ${Object.keys(updates).length} updates to actor...`);
    await ActorEngine.updateActor(this.actor, updates);

    // Create items from choices
    await this._createItems();

    swseLogger.log(`[DRAFT] Draft merged successfully`);

    return {
      success: true,
      draftId: this.draftId,
      updatesApplied: Object.keys(updates).length
    };
  }

  /**
   * Create items from draft choices
   * @private
   */
  async _createItems() {
    const itemsToCreate = [];

    // Create feat items
    if (this.choices.feats.length > 0) {
      const { FeatRegistry } = await import('../progression/feats/feat-registry.js');
      if (!FeatRegistry.isBuilt) {await FeatRegistry.build();}

      for (const featName of this.choices.feats) {
        const existing = this.actor.items.find(i => i.type === 'feat' && i.name === featName);
        if (!existing) {
          const featDoc = FeatRegistry.get(featName);
          if (featDoc) {
            itemsToCreate.push({
              ...featDoc.toObject(),
              flags: {
                swse: {
                  source: 'draft',
                  draftId: this.draftId
                }
              }
            });
          }
        }
      }
    }

    // Create talent items
    if (this.choices.talents.length > 0) {
      for (const talentName of this.choices.talents) {
        const existing = this.actor.items.find(i => i.type === 'talent' && i.name === talentName);
        if (!existing) {
          itemsToCreate.push({
            name: talentName,
            type: 'talent',
            system: {
              description: 'Granted by draft'
            },
            flags: {
              swse: {
                source: 'draft',
                draftId: this.draftId
              }
            }
          });
        }
      }
    }

    if (itemsToCreate.length > 0) {
      swseLogger.log(`[DRAFT] Creating ${itemsToCreate.length} items...`);
      await ActorEngine.createEmbeddedDocuments(this.actor, 'Item', itemsToCreate);
    }
  }

  // ============================================================================
  // EXPORT - Get draft as plain object
  // ============================================================================

  /**
   * Export draft choices as a plain object (for saving/loading)
   */
  toObject() {
    return {
      draftId: this.draftId,
      actorId: this.actor.id,
      choices: foundry.utils.deepClone(this.choices)
    };
  }

  /**
   * Load draft choices from a plain object
   */
  fromObject(data) {
    if (data.draftId) {this.draftId = data.draftId;}
    if (data.choices) {this.choices = foundry.utils.deepClone(data.choices);}
    this._markDirty();
  }
}

export default DraftCharacter;
