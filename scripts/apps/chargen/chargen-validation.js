/**
 * Validation and Gating for Character Generator
 * Handles step validation, progression gating, and character completeness checks
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ChargenRules } from "/systems/foundryvtt-swse/scripts/engine/chargen/ChargenRules.js";
import { TalentSlotValidator } from "/systems/foundryvtt-swse/scripts/engine/progression/talents/slot-validator.js";
import { confirm } from "/systems/foundryvtt-swse/scripts/utils/ui-utils.js";

/**
 * Validate current step before proceeding
 * @param {string} currentStep - The current step key
 * @param {Object} characterData - The character data
 * @param {boolean} freeBuild - Whether free build mode is enabled
 * @param {Function} getValidationHelpers - Function to get droid and other validation helpers
 * @returns {boolean} True if step is valid
 */
export function validateCurrentStep(currentStep, characterData, freeBuild, getValidationHelpers = null) {
  if (freeBuild) {
    return true;
  }

  switch (currentStep) {
    case 'name':
      if (!characterData.name || characterData.name.trim() === '') {
        ui.notifications.warn('Please enter a character name.');
        return false;
      }
      break;

    case 'type':
      break;

    case 'degree':
      if (!characterData.droidDegree) {
        ui.notifications.warn('Please select a droid degree.');
        return false;
      }
      break;

    case 'size':
      if (!characterData.droidSize) {
        ui.notifications.warn('Please select a droid size.');
        return false;
      }
      break;

    case 'droid-builder':
      return true;

    case 'droid-final':
      if (getValidationHelpers) {
        return getValidationHelpers.validateDroidBuilder();
      }
      return true;

    case 'species':
      if (!characterData.species) {
        ui.notifications.warn('Please select a species.');
        return false;
      }
      break;

    case 'abilities': {
      const abilities = characterData.isDroid
        ? ['str', 'dex', 'int', 'wis', 'cha']
        : ['str', 'dex', 'con', 'int', 'wis', 'cha'];
      const allSet = abilities.every(ab => {
        const base = characterData.abilities[ab]?.base;
        return base !== undefined && base >= 8 && base <= 18;
      });

      if (!allSet) {
        ui.notifications.warn('Please set all ability scores.');
        return false;
      }

      if (characterData.abilityGenerationMethod === 'point-mode') {
        const cumulativeCosts = {
          8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 6, 15: 8, 16: 10, 17: 13, 18: 16
        };
        const pointCosts = (value) => cumulativeCosts[value] || 0;

        const totalSpent = abilities.reduce((sum, ab) => {
          return sum + pointCosts(characterData.abilities[ab]?.base || 8);
        }, 0);

        const pointBuyPool = characterData.isDroid
          ? ChargenRules.getDroidPointBuyPool()
          : ChargenRules.getLivingPointBuyPool();

        if (totalSpent > pointBuyPool) {
          ui.notifications.warn(`You've overspent your point buy budget! (${totalSpent}/${pointBuyPool} points)`);
          return false;
        }

        if (totalSpent < pointBuyPool - 2) {
          ui.notifications.warn(`You still have ${pointBuyPool - totalSpent} point buy points to spend. Use them all!`);
          return false;
        }
      }
      break;
    }

    case 'class':
      if (characterData.classes.length === 0) {
        ui.notifications.warn('Please select a class.');
        return false;
      }
      break;

    case 'background':
      break;

    case 'skills': {
      const trainedCount = Object.values(characterData.skills || {}).filter(s => s.trained).length;
      const requiredCount = characterData.trainedSkillsAllowed || 0;
      if (trainedCount < requiredCount) {
        ui.notifications.warn(`You must train ${requiredCount} skills (currently trained: ${trainedCount}).`);
        return false;
      }
      if (trainedCount > requiredCount) {
        ui.notifications.warn(`You can only train ${requiredCount} skills (currently trained: ${trainedCount}). Untrain ${trainedCount - requiredCount} skill(s).`);
        return false;
      }
      break;
    }

    case 'languages':
      break;

    case 'feats': {
      const selectedFeatsCount = (characterData.feats || []).length;
      const requiredFeats = characterData.featsRequired || 1;
      if (selectedFeatsCount < requiredFeats) {
        ui.notifications.warn(`You must select ${requiredFeats} feat(s) (currently selected: ${selectedFeatsCount}).`);
        return false;
      }
      break;
    }

    case 'talents': {
      const talentSlots = characterData.talentSlots || [];
      const selectedTalents = characterData.talents || [];

      if (!talentSlots || talentSlots.length === 0) {
        const selectedTalentsCount = selectedTalents.length;
        const requiredTalents = characterData.talentsRequired || 1;
        if (selectedTalentsCount < requiredTalents) {
          ui.notifications.warn(`You must select ${requiredTalents} talent(s) (currently selected: ${selectedTalentsCount}).`);
          return false;
        }
      } else {
        const validation = TalentSlotValidator.validateTotalSlots(selectedTalents, talentSlots);
        if (!validation.valid) {
          ui.notifications.warn(validation.message);
          return false;
        }
        if (selectedTalents.length < talentSlots.length) {
          ui.notifications.warn(`You must select ${talentSlots.length} talent(s) (currently selected: ${selectedTalents.length}).`);
          return false;
        }
      }
      break;
    }

    case 'force-powers': {
      const selectedPowersCount = (characterData.powers || []).length;
      const requiredPowers = getValidationHelpers ? getValidationHelpers.getForcePowersNeeded() : 0;
      if (selectedPowersCount < requiredPowers) {
        ui.notifications.warn(`You must select ${requiredPowers} Force power(s) (currently selected: ${selectedPowersCount}).`);
        return false;
      }
      break;
    }

    case 'starship-maneuvers': {
      const selectedManeuversCount = (characterData.starshipManeuvers || []).length;
      const requiredManeuvers = getValidationHelpers ? getValidationHelpers.getStarshipManeuversNeeded() : 0;
      if (selectedManeuversCount < requiredManeuvers) {
        ui.notifications.warn(`You must select ${requiredManeuvers} starship maneuver(s) (currently selected: ${selectedManeuversCount}).`);
        return false;
      }
      break;
    }

    case 'summary':
      if (characterData.startingCreditsFormula && !characterData.creditsChosen) {
        characterData.credits = characterData.startingCreditsFormula.maxPossible;
        characterData.creditsChosen = true;
      }
      break;
  }

  return true;
}

/**
 * Validate final character before creation
 * Runs even in free build mode to prevent broken characters
 * @param {Object} characterData - The character data
 * @param {boolean} freeBuild - Whether free build mode is enabled
 * @returns {Promise<boolean>} True if valid
 */
export async function validateFinalCharacter(characterData, freeBuild) {
  const errors = [];

  if (!characterData.name || characterData.name.trim() === '') {
    errors.push('Character must have a name');
  }

  const abilityKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  for (const key of abilityKeys) {
    const ability = characterData.abilities[key];
    if (!ability || typeof ability.base !== 'number' || !Number.isFinite(ability.base)) {
      errors.push(`Ability ${key.toUpperCase()} must be a valid number`);
    }
  }

  if (characterData.isDroid) {
    if (!characterData.droidSystems?.locomotion) {
      errors.push('Droids must have a locomotion system');
    }
    if (!characterData.droidSystems?.processor) {
      errors.push('Droids must have a processor');
    }
    if (!characterData.droidDegree) {
      errors.push('Droids must have a degree selected');
    }
  }

  if (!characterData.isDroid && !characterData.species) {
    errors.push('Living characters must have a species');
  }

  if (!characterData.classes || characterData.classes.length === 0) {
    errors.push('Character must have at least one class');
  }

  if (characterData.startingCreditsFormula && !characterData.creditsChosen) {
    characterData.credits = characterData.startingCreditsFormula.maxPossible;
    characterData.creditsChosen = true;
  }

  if (errors.length > 0) {
    if (!freeBuild) {
      ui.notifications.error(`Validation errors:\n${errors.join('\n')}`);
      return false;
    } else {
      const confirmed = await confirm(
        'Validation Warnings',
        `
          <p><strong>The following issues were found:</strong></p>
          <ul>
            ${errors.map(e => `<li>${e}</li>`).join('')}
          </ul>
          <p>Creating a character with these issues may cause problems.</p>
          <p><strong>Continue anyway?</strong></p>
        `
      );
      return confirmed;
    }
  }

  return true;
}

/**
 * Validate finalized derived values
 * @param {Object} characterData - The character data
 * @throws {Error} if any values are invalid
 */
export function validateFinalizedValues(characterData) {
  const errors = [];

  if (!Number.isFinite(characterData.hp?.max)) {
    errors.push(`HP max is invalid: ${characterData.hp?.max}`);
  }

  const defenseKeys = ['fort', 'reflex', 'will'];
  for (const key of defenseKeys) {
    const defense = characterData.defenses?.[key]?.total;
    if (!Number.isFinite(defense)) {
      errors.push(`${key.toUpperCase()} defense is invalid: ${defense}`);
    }
  }

  if (!Number.isFinite(characterData.secondWind?.healing)) {
    errors.push(`Second Wind healing is invalid: ${characterData.secondWind?.healing}`);
  }

  if (!Number.isFinite(characterData.damageThreshold)) {
    errors.push(`Damage Threshold is invalid: ${characterData.damageThreshold}`);
  }

  if (characterData.bab != null && !Number.isFinite(characterData.bab)) {
    errors.push(`Base Attack Bonus is invalid: ${characterData.bab}`);
  }

  if (errors.length > 0) {
    const errorMsg = `Character finalization failed - invalid derived values:\n${errors.map(e => `• ${e}`).join('\n')}`;
    SWSELogger.error('[CHARGEN] ' + errorMsg.replace(/\n/g, ' '));
    throw new Error(errorMsg);
  }

  SWSELogger.log('[CHARGEN] Finalized character values validated successfully');
}

/**
 * Assert character has all required progression data
 * @param {Object} characterData - The character data
 * @throws {Error} if any required field is missing
 */
export function assertCharacterComplete(characterData) {
  const errors = [];

  if (!characterData.name || characterData.name.trim() === '') {
    errors.push('Character name is required');
  }

  const abilityKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  for (const key of abilityKeys) {
    const ability = characterData.abilities[key];
    if (!ability || typeof ability.base !== 'number' || !Number.isFinite(ability.base)) {
      errors.push(`Ability ${key.toUpperCase()} is required and must be a number`);
    }
  }

  if (!characterData.classes || characterData.classes.length === 0) {
    errors.push('At least one class is required');
  }

  if (!characterData.isDroid && !characterData.species) {
    errors.push('Species is required for non-droid characters');
  }

  if (characterData.isDroid) {
    if (!characterData.droidSystems?.locomotion) {
      errors.push('Droid locomotion system is required');
    }
    if (!characterData.droidSystems?.processor) {
      errors.push('Droid processor is required');
    }
    if (!characterData.droidDegree) {
      errors.push('Droid degree is required');
    }
  }

  if (errors.length > 0) {
    SWSELogger.error('[CHARGEN] Character precondition check failed:', errors);
    throw new Error(
      `Character is incomplete and cannot be created:\n${errors.map(e => `• ${e}`).join('\n')}`
    );
  }
}
