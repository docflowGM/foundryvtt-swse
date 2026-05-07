// ============================================
// Force power selection for CharGen
// ============================================

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { AbilityEngine } from "/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js";
import { PrerequisiteChecker } from "/systems/foundryvtt-swse/scripts/data/prerequisite-checker.js";
import { _findClassItem } from "/systems/foundryvtt-swse/scripts/apps/chargen/chargen-shared.js";
import { ForceRules } from "/systems/foundryvtt-swse/scripts/engine/force/ForceRules.js";

/**
 * Handle force power selection
 */
export async function _onSelectForcePower(event) {
  event.preventDefault();
  const id = event.currentTarget.dataset.powerid;

  if (!this._packs.forcePowers || this._packs.forcePowers.length === 0) {
    ui.notifications.error('Force Powers data not loaded!');
    SWSELogger.error('CharGen | Force Powers pack is null or empty');
    return;
  }

  const power = this._packs.forcePowers.find(p => p._id === id || p.name === id);

  if (!power) {
    ui.notifications.warn('Force Power not found!');
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
      item.type === 'force-power' && (item.name === power.name || item.id === power._id)
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
        // Defensive lookup: try ID first, fall back to name
        const classDoc = _findClassItem(this._packs?.classes || [], c);
        return classDoc?.system?.forceSensitive === true;
      })
      .reduce((sum, cls) => sum + (cls.level || 1), 0);

    if (forceLevels < requiredLevels) {
      ui.notifications.warn(
        `Cannot select "${power.name}": Requires ${requiredLevels} levels in a Force-using class (you have ${forceLevels})`
      );
      return;
    }

    // Check other prerequisites
    const assessment = AbilityEngine.evaluateAcquisition(tempActor, power, pendingData);
    if (!assessment.legal) {
      ui.notifications.warn(`Cannot select "${power.name}": ${assessment.missingPrereqs.join(', ')}`);
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
  ui.notifications.info('Force power removed');
  await this.render();
}

/**
 * Calculate how many force powers the character should get at character creation
 * Uses the same canonical capability signal as level-up: feats actually granted or owned
 * (NOT direct class membership - the class grants feats, feats grant the capability)
 */
export function _getForcePowersNeeded() {
  let powerCount = 0;

  // === Canonical Force Capability Check ===
  // Check 1: Force Sensitivity feat (granted by Jedi or selected by player)
  // This is the ACTUAL source of the capability, not the Jedi class itself

  const selectedFeats = this.characterData.feats || [];

  // Get feats granted by the selected class
  const selectedClass = this.characterData.classes?.[0];
  let grantedFeats = [];
  if (selectedClass) {
    const classDoc = _findClassItem(this._packs?.classes || [], selectedClass);
    if (classDoc) {
      grantedFeats = PrerequisiteChecker.getLevel1GrantedFeats(classDoc);
    }
  }

  // Check if Force Sensitivity feat is present (via selection OR class grant)
  const hasForceSensitivity = selectedFeats.some(f =>
    f.name.toLowerCase().includes('force sensitivity')
  ) || grantedFeats.some(name =>
    name.toLowerCase().includes('force sensitivity')
  );

  if (hasForceSensitivity) {
    powerCount += 1;
    SWSELogger.log(`CharGen | Force Sensitivity feat: +1 power`);
  }

  // Check 2: Force Training feat (each grants 1 + WIS/CHA modifier, min 1)
  // Force Training itself is the source - not dependent on other feats
  const forceTrainingFeats = selectedFeats.filter(f =>
    f.name.toLowerCase().includes('force training')
  );

  if (forceTrainingFeats.length > 0) {
    // Get the force ability modifier (WIS or CHA based on game setting)
    const forceAbility = ForceRules.getTrainingAttribute();
    const abilityKey = forceAbility === 'charisma' ? 'cha' : 'wis';
    const modifier = this.characterData.abilities[abilityKey]?.mod || 0;

    // Each Force Training grants 1 + modifier powers (minimum 1)
    const powersPerTraining = Math.max(1, 1 + modifier);
    const trainingPowers = forceTrainingFeats.length * powersPerTraining;
    powerCount += trainingPowers;
    SWSELogger.log(`CharGen | Force Training: ${forceTrainingFeats.length} feat(s) × ${powersPerTraining} = +${trainingPowers} power(s)`);
  }

  SWSELogger.log(`CharGen | Force powers needed: ${powerCount}`, {
    hasForceSensitivity,
    forceTrainingCount: forceTrainingFeats.length,
    grantedFeats: grantedFeats
  });

  return powerCount;
}

/**
 * Calculate suggestions for force powers during chargen
 * Adds suggestion tier metadata for UI display
 * @returns {Promise<Array>} Force powers with suggestion metadata
 */
export async function _calculateForcePowerSuggestions(powers) {
  if (!Array.isArray(powers) || powers.length === 0) {
    return powers;
  }

  try {
    const { SuggestionService } = await import("/systems/foundryvtt-swse/SuggestionService.js");
    const { UNIFIED_TIERS } = await import("/systems/foundryvtt-swse/suggestion-unified-tiers.js");

    const tempActor = this._createTempActorForValidation();
    if (!tempActor) {
      SWSELogger.warn('[CHARGEN-SUGGESTIONS] No temp actor for force power suggestions');
      return powers;
    }

    const pendingData = {
      selectedFeats: this.characterData.feats || [],
      selectedClass: this.characterData.classes?.[0],
      selectedTalents: this.characterData.talents || [],
      selectedSkills: Object.keys(this.characterData.skills || {}).filter(k => this.characterData.skills[k]?.trained),
      selectedPowers: this.characterData.powers || []
    };

    // Get suggestions for each power
    const suggestedPowers = await Promise.all(powers.map(async (power) => {
      const suggestion = await SuggestionService.getSuggestions(
        tempActor,
        'chargen',
        {
          domain: 'forcepowers',
          item: power,
          pendingData
        }
      );

      const tier = suggestion?.[0]?.tier ?? UNIFIED_TIERS.AVAILABLE;
      const reason = suggestion?.[0]?.reason ?? 'Available';

      return {
        ...power,
        suggestion: {
          tier,
          reason,
          cssClass: `tier-${tier}`,
          iconClass: this._getSuggestionIcon(tier)
        },
        isSuggested: tier >= UNIFIED_TIERS.THEMATIC_FIT
      };
    }));

    return suggestedPowers;
  } catch (err) {
    SWSELogger.error('[CHARGEN-SUGGESTIONS] Error calculating force power suggestions:', err);
    return powers; // Return without suggestions as fallback
  }
}

/**
 * Get suggestion icon for tier
 * @param {number} tier - Suggestion tier (0-6)
 * @returns {string} Icon class for display
 */
function _getSuggestionIcon(tier) {
  const iconMap = {
    6: 'fa-solid fa-crown',      // Prestige prerequisite
    5: 'fa-solid fa-star',       // Prestige ready now
    4: 'fa-solid fa-link',       // Path continuation
    3: 'fa-solid fa-gem',        // Strong synergy
    2: 'fa-solid fa-bolt',       // Ability synergy
    1: 'fa-solid fa-check',      // Thematic fit
    0: 'fa-solid fa-circle'      // Available
  };
  return iconMap[tier] || 'fa-solid fa-circle';
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
      // Defensive lookup: try ID first, fall back to name
      const classDoc = _findClassItem(this._packs?.classes || [], c);
      return classDoc?.system?.forceSensitive === true;
    })
    .reduce((sum, cls) => sum + (cls.level || 1), 0);

  const availablePowers = this._packs.forcePowers.filter(power => {
    const powerLevel = power.system?.powerLevel || 1;
    const requiredLevels = powerLevel * 5;
    return forceLevels >= requiredLevels;
  });

  SWSELogger.log(`CharGen | Available force powers: ${availablePowers.length} (character has ${forceLevels} force-using class levels)`);

  // Add suggestion metadata to force powers
  try {
    return await this._calculateForcePowerSuggestions.call(this, availablePowers);
  } catch (err) {
    SWSELogger.warn('CharGen | Error calculating force power suggestions:', err);
    return availablePowers; // Return without suggestions as fallback
  }
}

/**
 * Bind Force Power card UX (flip + read).
 */
export function _bindForcePowerCardUI(root) {
  const step = root.querySelector('.step-force-powers');
  if (!step) {return;}

  step.onclick = async (ev) => {
    const btn = ev.target.closest('button');
    if (!btn) {return;}

    const card = btn.closest('.power-card');
    if (!card) {return;}

    if (btn.classList.contains('power-details-toggle')) {
      ev.preventDefault();
      card.classList.toggle('is-flipped');
      return;
    }

    if (btn.classList.contains('power-read')) {
      ev.preventDefault();
      const uuid = card.dataset.uuid;
      if (!uuid) {return;}
      const doc = await fromUuid(uuid);
      doc?.sheet?.render(true);
    }
  };
}
