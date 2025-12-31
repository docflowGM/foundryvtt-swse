// ============================================
// Feat and talent selection for CharGen
// ============================================

import { SWSELogger } from '../../utils/logger.js';
import { getTalentTrees, getTalentTreeName } from './chargen-property-accessor.js';
import { PrerequisiteValidator } from '../../utils/prerequisite-validator.js';
import { HouseRuleTalentCombination } from '../../houserules/houserule-talent-combination.js';

/**
 * Handle feat selection
 */
export async function _onSelectFeat(event) {
  event.preventDefault();
  const id = event.currentTarget.dataset.featid;

  if (!this._packs.feats || this._packs.feats.length === 0) {
    ui.notifications.error("Feats data not loaded!");
    SWSELogger.error("CharGen | Feats pack is null or empty");
    return;
  }

  const feat = this._packs.feats.find(f => f._id === id || f.name === id);

  if (!feat) {
    ui.notifications.warn("Feat not found!");
    return;
  }

  // Check for duplicates in characterData
  const alreadySelected = this.characterData.feats.find(f => f.name === feat.name || f._id === feat._id);
  if (alreadySelected) {
    ui.notifications.warn(`You've already selected "${feat.name}"!`);
    return;
  }

  // If leveling up, also check existing actor items
  if (this.actor) {
    const existsOnActor = this.actor.items.some(item =>
      item.type === 'feat' && (item.name === feat.name || item.id === feat._id)
    );
    if (existsOnActor) {
      ui.notifications.warn(`"${feat.name}" is already on your character sheet!`);
      return;
    }
  }

  // Check prerequisites (unless in Free Build mode)
  if (!this.freeBuild) {
    // Droids cannot select feats that require Force Sensitivity or Force Points
    if (this.characterData.isDroid) {
      const prereqs = feat.system?.prerequisites || "";
      const preqsLower = prereqs.toLowerCase();
      if (
        preqsLower.includes("force sensitivity") ||
        preqsLower.includes("force technique") ||
        preqsLower.includes("force secret") ||
        preqsLower.includes("force point")
      ) {
        ui.notifications.warn(`Droids cannot select "${feat.name}" because they cannot be Force-sensitive.`);
        return;
      }
    }

    const tempActor = this.actor || this._createTempActorForValidation();
    const pendingData = {
      selectedFeats: this.characterData.feats || [],
      selectedClass: this.characterData.classes?.[0],
      abilityIncreases: {},
      selectedSkills: Object.keys(this.characterData.skills || {})
        .filter(k => this.characterData.skills[k]?.trained)
        .map(k => ({ key: k })), // Convert to object format expected by prerequisite validator
      selectedTalents: this.characterData.talents || []
    };

    const prereqCheck = PrerequisiteValidator.checkFeatPrerequisites(feat, tempActor, pendingData);
    if (!prereqCheck.valid) {
      ui.notifications.warn(`Cannot select "${feat.name}": ${prereqCheck.reasons.join(', ')}`);
      return;
    }
  }

  // Check if this is a Skill Focus feat
  if (feat.name.toLowerCase().includes('skill focus')) {
    // Clone before passing to handler (handler will further modify it)
    await this._handleSkillFocusFeat(foundry.utils.deepClone(feat));
  } else {
    // DEFENSIVE CLONE: Prevent mutation of cached compendium data
    this.characterData.feats.push(foundry.utils.deepClone(feat));
    ui.notifications.info(`Selected feat: ${feat.name}`);
  }

  // Re-render to show updated feat selection and enable Next button if requirement met
  await this.render();
}

/**
 * Handle Skill Focus feat selection in chargen
 */
export async function _handleSkillFocusFeat(feat) {
  // Get trained skills
  const trainedSkills = Object.entries(this.characterData.skills || {})
    .filter(([key, skill]) => skill.trained)
    .map(([key, skill]) => key);

  if (trainedSkills.length === 0) {
    ui.notifications.warn("You must train at least one skill before selecting Skill Focus. Please train a skill in the Skills step first.");
    return;
  }

  // Build skill list for dialog
  const skillNames = {
    acrobatics: "Acrobatics",
    climb: "Climb",
    deception: "Deception",
    endurance: "Endurance",
    gatherInfo: "Gather Information",
    initiative: "Initiative",
    jump: "Jump",
    mechanics: "Mechanics",
    perception: "Perception",
    persuasion: "Persuasion",
    pilot: "Pilot",
    stealth: "Stealth",
    survival: "Survival",
    swim: "Swim",
    treatInjury: "Treat Injury",
    useComputer: "Use Computer",
    useTheForce: "Use the Force"
  };

  // Create options HTML
  const skillOptions = trainedSkills
    .map(key => `<option value="${key}">${skillNames[key] || key}</option>`)
    .join('');

  // Show dialog to select skill - use Promise to wait for selection
  return new Promise((resolve) => {
    const dialog = new Dialog({
      title: `${feat.name} - Select Skill`,
      content: `
        <div class="form-group">
          <label>Choose a trained skill to focus:</label>
          <select id="skill-focus-selection" style="width: 100%; padding: 5px;">
            ${skillOptions}
          </select>
          <p class="hint-text" style="margin-top: 10px;">
            <i class="fas fa-info-circle"></i>
            Skill Focus grants a +5 bonus to the selected skill.
          </p>
        </div>
      `,
      buttons: {
        select: {
          icon: '<i class="fas fa-check"></i>',
          label: "Select",
          callback: (html) => {
            const selectedSkill = html.find('#skill-focus-selection').val();

            // Mark the skill as focused in character data
            if (!this.characterData.skills[selectedSkill]) {
              this.characterData.skills[selectedSkill] = { trained: true, focused: false };
            }
            this.characterData.skills[selectedSkill].focused = true;

            // Update feat description to note which skill
            const skillName = skillNames[selectedSkill] || selectedSkill;
            const updatedFeat = {
              ...feat,
              system: {
                ...feat.system,
                description: `${feat.system.description || ''}\n\n<strong>Focused Skill:</strong> ${skillName}`
              }
            };

            this.characterData.feats.push(updatedFeat);
            ui.notifications.info(`${feat.name} applied to ${skillName}. You gain +5 to this skill.`);
            dialog.close();
            resolve(true);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: () => {
            ui.notifications.warn("Skill Focus feat cancelled.");
            dialog.close();
            resolve(false);
          }
        }
      },
      default: "select",
      close: () => resolve(false)
    }, {
      width: 400
    });
    dialog.render(true);
  });
}

/**
 * Handle removing a feat
 */
export async function _onRemoveFeat(event) {
  event.preventDefault();
  const id = event.currentTarget.dataset.featid;

  // Find the feat being removed
  const removedFeat = this.characterData.feats.find(f => f._id === id || f.name === id);

  // If it's a Skill Focus feat, unfocus the skill
  if (removedFeat && removedFeat.name.toLowerCase().includes('skill focus')) {
    // Parse the focused skill from the description
    const descMatch = removedFeat.system?.description?.match(/<strong>Focused Skill:<\/strong>\s*(.+?)(?:<|$)/);
    if (descMatch) {
      const focusedSkillName = descMatch[1].trim();

      // Find the skill key by name
      const skillNames = {
        "Acrobatics": "acrobatics",
        "Climb": "climb",
        "Deception": "deception",
        "Endurance": "endurance",
        "Gather Information": "gatherInfo",
        "Initiative": "initiative",
        "Jump": "jump",
        "Mechanics": "mechanics",
        "Perception": "perception",
        "Persuasion": "persuasion",
        "Pilot": "pilot",
        "Stealth": "stealth",
        "Survival": "survival",
        "Swim": "swim",
        "Treat Injury": "treatInjury",
        "Use Computer": "useComputer",
        "Use the Force": "useTheForce"
      };

      const skillKey = skillNames[focusedSkillName];
      if (skillKey && this.characterData.skills[skillKey]) {
        this.characterData.skills[skillKey].focused = false;
        ui.notifications.info(`Removed Skill Focus from ${focusedSkillName}`);
      }
    }
  }

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

  if (!this._packs.talents || this._packs.talents.length === 0) {
    ui.notifications.error("Talents data not loaded!");
    SWSELogger.error("CharGen | Talents pack is null or empty");
    return;
  }

  const tal = this._packs.talents.find(t => t._id === id || t.name === id);

  if (!tal) {
    ui.notifications.warn("Talent not found!");
    return;
  }

  // Check if this is the combined Block & Deflect talent
  if (HouseRuleTalentCombination.isBlockDeflectCombined(tal)) {
    // Get the actual talents to grant (Block and Deflect)
    const talentNamesToGrant = HouseRuleTalentCombination.getActualTalentsToGrant(tal.name);
    const talentsToAdd = [];

    // Find each talent and add it
    for (const talentName of talentNamesToGrant) {
      // Need to load the actual talent from the original data
      // Since we processed the talents, we need to find the real ones
      let actualTalent = null;

      if (talentName === "Block") {
        actualTalent = await game.packs.get("foundryvtt-swse.talents")?.getDocuments().then(docs => docs.find(d => d.name === "Block"));
      } else if (talentName === "Deflect") {
        actualTalent = await game.packs.get("foundryvtt-swse.talents")?.getDocuments().then(docs => docs.find(d => d.name === "Deflect"));
      }

      if (actualTalent) {
        talentsToAdd.push(actualTalent.toObject());
      }
    }

    if (talentsToAdd.length === 0) {
      ui.notifications.error("Could not find Block or Deflect talents!");
      return;
    }

    // Check for duplicates for each talent
    for (const talentToAdd of talentsToAdd) {
      const alreadySelected = this.characterData.talents.find(t => t.name === talentToAdd.name || t._id === talentToAdd._id);
      if (alreadySelected) {
        ui.notifications.warn(`You've already selected "${talentToAdd.name}"!`);
        return;
      }

      if (this.actor) {
        const existsOnActor = this.actor.items.some(item =>
          item.type === 'talent' && (item.name === talentToAdd.name || item.id === talentToAdd._id)
        );
        if (existsOnActor) {
          ui.notifications.warn(`"${talentToAdd.name}" is already on your character sheet!`);
          return;
        }
      }
    }

    // Add both talents
    for (const talentToAdd of talentsToAdd) {
      this.characterData.talents.push(foundry.utils.deepClone(talentToAdd));
    }

    ui.notifications.info(`Selected combined talent: Block & Deflect (grants both Block and Deflect)`);
  } else {
    // Standard talent selection
    // Check for duplicates in characterData
    const alreadySelected = this.characterData.talents.find(t => t.name === tal.name || t._id === tal._id);
    if (alreadySelected) {
      ui.notifications.warn(`You've already selected "${tal.name}"!`);
      return;
    }

    // If leveling up, also check existing actor items
    if (this.actor) {
      const existsOnActor = this.actor.items.some(item =>
        item.type === 'talent' && (item.name === tal.name || item.id === tal._id)
      );
      if (existsOnActor) {
        ui.notifications.warn(`"${tal.name}" is already on your character sheet!`);
        return;
      }
    }

    // Droids cannot select talents that require Force Sensitivity or Force Points (unless in Free Build mode)
    if (this.characterData.isDroid && !this.freeBuild) {
      const prereqs = tal.system?.prerequisites || "";
      const preqsLower = prereqs.toLowerCase();
      if (
        preqsLower.includes("force sensitivity") ||
        preqsLower.includes("force technique") ||
        preqsLower.includes("force secret") ||
        preqsLower.includes("force point")
      ) {
        ui.notifications.warn(`Droids cannot select "${tal.name}" because they cannot be Force-sensitive.`);
        return;
      }
    }

    // DEFENSIVE CLONE: Prevent mutation of cached compendium data
    this.characterData.talents.push(foundry.utils.deepClone(tal));
    ui.notifications.info(`Selected talent: ${tal.name}`);
  }

  // Clear selected tree and advance to next step
  this.selectedTalentTree = null;
  await this._onNextStep(event);
}

/**
 * Get available talent trees for the selected class
 */
export function _getAvailableTalentTrees() {
  // Check for unrestricted mode (free build)
  const talentTreeRestriction = game.settings.get('foundryvtt-swse', "talentTreeRestriction");

  if (talentTreeRestriction === "unrestricted") {
    // Free build mode: return all talent trees from all talents
    const allTrees = new Set();
    if (this._packs.talents) {
      this._packs.talents.forEach(talent => {
        const tree = talent.system?.tree;
        if (tree) {
          allTrees.add(tree);
        }
      });
    }
    const trees = Array.from(allTrees);
    SWSELogger.log(`CharGen | Available talent trees (unrestricted mode):`, trees);
    return trees;
  }

  // Class-restricted mode
  if (!this.characterData.classes || this.characterData.classes.length === 0) {
    return [];
  }

  const selectedClass = this._packs.classes?.find(c => c.name === this.characterData.classes[0].name);
  if (!selectedClass) {
    return [];
  }

  const trees = getTalentTrees(selectedClass);
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
      defenses: foundry.utils.deepClone(this.characterData.defenses),
      // Include mentor biases for suggestion engine
      swse: {
        mentorBuildIntentBiases: this.characterData.mentorBiases || {},
        mentorSurveyCompleted: this.characterData.mentorSurveyCompleted || false
      }
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
