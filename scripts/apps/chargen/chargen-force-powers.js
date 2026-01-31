// ============================================
// Force power selection for CharGen
// ============================================

import { SWSELogger } from '../../utils/logger.js';
import { PrerequisiteChecker } from '../../data/prerequisite-checker.js';
import { PrerequisiteValidator } from '../../utils/prerequisite-validator.js';

/**
 * Handle force power selection
 */
export async function _onSelectForcePower(event) {
  event.preventDefault();
  const id = event.currentTarget.dataset.powerid;

  if (!this._packs.forcePowers || this._packs.forcePowers.length === 0) {
    ui.notifications.error("Force Powers data not loaded!");
    SWSELogger.error("CharGen | Force Powers pack is null or empty");
    return;
  }

  const power = this._packs.forcePowers.find(p => p._id === id || p.name === id);

  if (!power) {
    ui.notifications.warn("Force Power not found!");
    return;
  }

  // Check for duplicates in characterData
  const alreadySelected = this.characterData.powers.find(p => p.name === power.name || p._id === power._id);
  if (alreadySelected) {
    ui.notifications.warn(`You've already selected "${power.name}"!`);
    return;
  }

  // Check power slot limit (unless free build mode is on)
  const powersNeeded = this._getForcePowersNeeded();
  if (!this.freeBuild && this.characterData.powers.length >= powersNeeded) {
    ui.notifications.warn(`You've already selected the maximum number of Force powers (${powersNeeded})!`);
    SWSELogger.log(`CharGen | Force power limit reached (${this.characterData.powers.length}/${powersNeeded})`);
    return;
  }

  // If leveling up, also check existing actor items
  if (this.actor) {
    const existsOnActor = this.actor.items.some(item =>
      item.type === 'forcepower' && (item.name === power.name || item.id === power._id)
    );
    if (existsOnActor) {
      ui.notifications.warn(`"${power.name}" is already on your character sheet!`);
      return;
    }
  }

  // Check prerequisites (unless in Free Build mode)
  if (!this.freeBuild) {
    const tempActor = this.actor || this._createTempActorForValidation();
    const pendingData = {
      selectedFeats: this.characterData.feats || [],
      selectedClass: this.characterData.classes?.[0],
      abilityIncreases: {},
      selectedSkills: Object.keys(this.characterData.skills || {}).filter(k => this.characterData.skills[k]?.trained),
      selectedTalents: this.characterData.talents || [],
      selectedPowers: this.characterData.powers || []
    };

    // Check power level requirement (must have 5 levels in Force-using class per power level)
    const powerLevel = power.system?.powerLevel || 1;
    const requiredLevels = powerLevel * 5;
    // Calculate force levels from classes - look up class docs to check force sensitivity
    const forceLevels = (this.characterData.classes || [])
      .filter(c => {
        // Look up the class document to check if it's force-sensitive
        const classDoc = this._packs?.classes?.find(cd => cd.name === c.name);
        return classDoc?.system?.forceSensitive === true;
      })
      .reduce((sum, cls) => sum + (cls.level || 1), 0);

    if (forceLevels < requiredLevels) {
      ui.notifications.warn(
        `Cannot select "${power.name}": Requires ${requiredLevels} levels in a Force-using class (you have ${forceLevels})`
      );
      return;
    }

    // Check other prerequisites (dual-check for migration safety)
    const canonical = PrerequisiteChecker.checkFeatPrerequisites(tempActor, power, pendingData);
    const legacy = PrerequisiteValidator.checkFeatPrerequisites(power, tempActor, pendingData);
    if (canonical.met !== legacy.valid) {
      console.warn("Prereq mismatch (force power) detected", { power: power.name, canonical, legacy });
    }
    if (!canonical.met) {
      ui.notifications.warn(`Cannot select "${power.name}": ${canonical.missing.join(', ')}`);
      return;
    }
  }

  // DEFENSIVE CLONE: Prevent mutation of cached compendium data
  this.characterData.powers.push(foundry.utils.deepClone(power));
  ui.notifications.info(`Selected force power: ${power.name}`);

  // Re-render to show updated power selection and enable Next button if requirement met
  await this.render();
}

/**
 * Handle removing a force power
 */
export async function _onRemoveForcePower(event) {
  event.preventDefault();
  const id = event.currentTarget.dataset.powerid;

  this.characterData.powers = this.characterData.powers.filter(p => p._id !== id && p.name !== id);
  ui.notifications.info("Force power removed");
  await this.render();
}

/**
 * Calculate how many force powers the character should get at character creation
 */
export function _getForcePowersNeeded() {
  // Only grant powers if character has Force Sensitivity
  if (!this.characterData.forceSensitive) {
    return 0;
  }

  // Check if Force Sensitivity feat is in the selected feats
  const hasForceSensitivityFeat = this.characterData.feats?.some(f =>
    f.name.toLowerCase().includes('force sensitivity') ||
    f.name.toLowerCase() === 'force sensitive'
  );

  // Force Sensitivity grants 1 power
  let powerCount = hasForceSensitivityFeat ? 1 : 0;

  // Check for Force Training feats (each grants 1 + WIS/CHA modifier)
  const forceTrainingFeats = this.characterData.feats?.filter(f =>
    f.name.toLowerCase().includes('force training')
  ) || [];

  if (forceTrainingFeats.length > 0) {
    // Get the force ability modifier (WIS or CHA based on game setting)
    const forceAbility = game.settings.get('foundryvtt-swse', 'forceTrainingAttribute') || 'wisdom';
    const abilityKey = forceAbility === 'charisma' ? 'cha' : 'wis';
    const modifier = this.characterData.abilities[abilityKey]?.mod || 0;

    // Each Force Training grants 1 + modifier powers
    const powersPerTraining = 1 + Math.max(0, modifier);
    powerCount += forceTrainingFeats.length * powersPerTraining;
  }

  SWSELogger.log(`CharGen | Force powers needed: ${powerCount}`, {
    forceSensitive: this.characterData.forceSensitive,
    hasForceSensitivityFeat,
    forceTrainingCount: forceTrainingFeats.length
  });

  return powerCount;
}

/**
 * Get available force powers for selection during chargen
 */
export async function _getAvailableForcePowers() {
  if (!this._packs.forcePowers || this._packs.forcePowers.length === 0) {
    return [];
  }

  // For level 1 characters, only show level 1 force powers
  // Higher level force powers require 5 levels per power level in a Force-using class
  const characterLevel = this.characterData.level || 1;
  // Calculate force levels from classes - look up class docs to check force sensitivity
  const forceLevels = (this.characterData.classes || [])
    .filter(c => {
      // Look up the class document to check if it's force-sensitive
      const classDoc = this._packs?.classes?.find(cd => cd.name === c.name);
      return classDoc?.system?.forceSensitive === true;
    })
    .reduce((sum, cls) => sum + (cls.level || 1), 0);

  const availablePowers = this._packs.forcePowers.filter(power => {
    const powerLevel = power.system?.powerLevel || 1;
    const requiredLevels = powerLevel * 5;
    return forceLevels >= requiredLevels;
  });

  SWSELogger.log(`CharGen | Available force powers: ${availablePowers.length} (character has ${forceLevels} force-using class levels)`);

  return availablePowers;
}
