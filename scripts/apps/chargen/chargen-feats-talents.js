// ============================================
// Feat and talent selection for CharGen
// ============================================

import { SWSELogger } from '../../utils/logger.js';

/**
 * Handle feat selection
 */
export async function _onSelectFeat(event) {
  event.preventDefault();
  const id = event.currentTarget.dataset.featid;
  const feat = this._packs.feats.find(f => f._id === id || f.name === id);

  if (!feat) {
    ui.notifications.warn("Feat not found!");
    return;
  }

  // Check for duplicates
  const alreadySelected = this.characterData.feats.find(f => f.name === feat.name || f._id === feat._id);
  if (alreadySelected) {
    ui.notifications.warn(`You've already selected "${feat.name}"!`);
    return;
  }

  this.characterData.feats.push(feat);
  ui.notifications.info(`Selected feat: ${feat.name}`);

  // Re-render to show updated feat selection and enable Next button if requirement met
  await this.render();
}

/**
 * Handle removing a feat
 */
export async function _onRemoveFeat(event) {
  event.preventDefault();
  const id = event.currentTarget.dataset.featid;
  this.characterData.feats = this.characterData.feats.filter(f => f._id !== id && f.name !== id);
  await this.render();
}

/**
 * Handle talent tree selection - shows talents within the selected tree
 */
export async function _onSelectTalentTree(event) {
  event.preventDefault();
  const treeName = event.currentTarget.dataset.tree;

  this.selectedTalentTree = treeName;
  SWSELogger.log(`CharGen | Selected talent tree: ${treeName}`);

  // Re-render to show talents in this tree
  await this.render();
}

/**
 * Handle back from talent tree to tree list
 */
export async function _onBackToTalentTrees(event) {
  event.preventDefault();
  this.selectedTalentTree = null;
  await this.render();
}

/**
 * Handle talent selection
 */
export async function _onSelectTalent(event) {
  event.preventDefault();
  const id = event.currentTarget.dataset.talentid;
  const tal = this._packs.talents.find(t => t._id === id || t.name === id);

  if (!tal) {
    ui.notifications.warn("Talent not found!");
    return;
  }

  // Check for duplicates
  const alreadySelected = this.characterData.talents.find(t => t.name === tal.name || t._id === tal._id);
  if (alreadySelected) {
    ui.notifications.warn(`You've already selected "${tal.name}"!`);
    return;
  }

  this.characterData.talents.push(tal);
  ui.notifications.info(`Selected talent: ${tal.name}`);

  // Clear selected tree and advance to next step
  this.selectedTalentTree = null;
  await this._onNextStep(event);
}

/**
 * Get available talent trees for the selected class
 */
export function _getAvailableTalentTrees() {
  if (!this.characterData.classes || this.characterData.classes.length === 0) {
    return [];
  }

  const selectedClass = this._packs.classes?.find(c => c.name === this.characterData.classes[0].name);
  if (!selectedClass) {
    return [];
  }

  const trees = selectedClass.system?.talent_trees || selectedClass.system?.talentTrees || [];
  SWSELogger.log(`CharGen | Available talent trees for ${selectedClass.name}:`, trees);

  return trees;
}

/**
 * Get number of feats needed for this level
 */
export function _getFeatsNeeded() {
  const lvl = this.characterData.level || 1;
  return Math.ceil(lvl / 2);
}

/**
 * Create a temporary actor-like object for prerequisite validation during character generation
 */
export function _createTempActorForValidation() {
  // Ensure abilities are calculated
  this._recalcAbilities();

  // Create a mock actor object with the structure expected by PrerequisiteValidator
  const tempActor = {
    system: {
      level: this.characterData.level || 1,
      bab: this.characterData.bab || 0,
      abilities: foundry.utils.deepClone(this.characterData.abilities),
      skills: {},
      defenses: foundry.utils.deepClone(this.characterData.defenses)
    },
    items: {
      filter: (filterFn) => {
        const items = [];

        // Add feats
        if (this.characterData.feats) {
          for (const feat of this.characterData.feats) {
            items.push({
              type: 'feat',
              name: feat.name || feat,
              system: feat.system || {}
            });
          }
        }

        // Add talents
        if (this.characterData.talents) {
          for (const talent of this.characterData.talents) {
            items.push({
              type: 'talent',
              name: talent.name || talent,
              system: talent.system || {}
            });
          }
        }

        // Add classes
        if (this.characterData.classes) {
          for (const cls of this.characterData.classes) {
            items.push({
              type: 'class',
              name: cls.name || cls,
              system: cls.system || { level: 1 }
            });
          }
        }

        return items.filter(filterFn);
      },
      some: (filterFn) => {
        const items = [];

        // Add feats
        if (this.characterData.feats) {
          for (const feat of this.characterData.feats) {
            items.push({
              type: 'feat',
              name: feat.name || feat,
              system: feat.system || {}
            });
          }
        }

        // Add talents
        if (this.characterData.talents) {
          for (const talent of this.characterData.talents) {
            items.push({
              type: 'talent',
              name: talent.name || talent,
              system: talent.system || {}
            });
          }
        }

        // Add classes
        if (this.characterData.classes) {
          for (const cls of this.characterData.classes) {
            items.push({
              type: 'class',
              name: cls.name || cls,
              system: cls.system || { level: 1, forceSensitive: cls.system?.forceSensitive || false }
            });
          }
        }

        return items.some(filterFn);
      }
    }
  };

  // Map skills to the expected structure
  for (const [key, skill] of Object.entries(this.characterData.skills)) {
    tempActor.system.skills[key] = {
      trained: skill.trained || false,
      focused: skill.focused || false
    };
  }

  return tempActor;
}
