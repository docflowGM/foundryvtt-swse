// ============================================
// Feat and talent selection for CharGen
// ============================================

import { SWSELogger } from '../../utils/logger.js';
import { getTalentTrees, getTalentTreeName } from './chargen-property-accessor.js';
import { PrerequisiteRequirements } from '../../progression/feats/prerequisite_engine.js';
import { PrerequisiteValidator } from '../../utils/prerequisite-validator.js';
import { HouseRuleTalentCombination } from '../../houserules/houserule-talent-combination.js';
import { ClassesDB } from '../../data/classes-db.js';
import { SuggestionEngine } from '../../engine/SuggestionEngine.js';
import { SuggestionEngineCoordinator } from '../../engine/SuggestionEngineCoordinator.js';
import { BuildIntent } from '../../engine/BuildIntent.js';
import { MentorSurvey } from '../mentor-survey.js';

/**
 * Calculate feat/talent suggestions during chargen
 * Uses BuildIntent (which includes L1 mentor survey biases) to score feats/talents
 * @param {Array} items - Feats or talents to score
 * @param {Object} chargenContext - Chargen instance (this)
 * @param {string} itemType - 'feat' or 'talent'
 * @returns {Promise<Array>} Items with suggestion metadata
 */
export async function calculateChargenSuggestions(items, chargenContext, itemType = 'feat') {
  try {
    SWSELogger.log(`[CHARGEN-SUGGESTIONS] calculateChargenSuggestions() START - Type: ${itemType}, Items: ${items.length}`);

    // Create a temporary actor from chargen data
    const tempActor = chargenContext._createTempActorForValidation();
    if (!tempActor) {
      SWSELogger.warn(`[CHARGEN-SUGGESTIONS] No temp actor created, suggestions disabled`);
      return items; // Return items without suggestions as fallback
    }

    // Build pending data from chargen character data
    const pendingData = {
      selectedFeats: chargenContext.characterData.feats || [],
      selectedTalents: chargenContext.characterData.talents || [],
      selectedClass: chargenContext.characterData.classes?.[0],
      selectedSkills: Object.keys(chargenContext.characterData.skills || {})
        .filter(k => chargenContext.characterData.skills[k]?.trained)
        .map(k => ({ key: k })),
      abilityIncreases: {}
    };

    SWSELogger.log(`[CHARGEN-SUGGESTIONS] Pending data prepared:`, {
      feats: pendingData.selectedFeats.length,
      talents: pendingData.selectedTalents.length,
      class: pendingData.selectedClass?.name,
      skills: pendingData.selectedSkills.length
    });

    // Compute BuildIntent with L1 mentor survey biases
    SWSELogger.log(`[CHARGEN-SUGGESTIONS] Computing BuildIntent (will include L1 survey biases)...`);
    const buildIntent = await BuildIntent.analyze(tempActor, pendingData);

    SWSELogger.log(`[CHARGEN-SUGGESTIONS] BuildIntent computed:`, {
      themes: Object.keys(buildIntent.themes),
      primaryThemes: buildIntent.primaryThemes,
      combatStyle: buildIntent.combatStyle,
      hasMentorBiases: !!buildIntent.mentorBiases
    });

    // Call appropriate suggestion engine
    let suggestedItems = items;
    if (itemType === 'feat') {
      SWSELogger.log(`[CHARGEN-SUGGESTIONS] Calling SuggestionEngine.suggestFeats()...`);
      // Try to use coordinator API first
      if (game.swse?.suggestions?.suggestFeats) {
        SWSELogger.log(`[CHARGEN-SUGGESTIONS] Using coordinator API for feat suggestions`);
        suggestedItems = await game.swse.suggestions.suggestFeats(
          items,
          tempActor,
          pendingData,
          { buildIntent, includeFutureAvailability: true }
        );
      } else {
        SWSELogger.log(`[CHARGEN-SUGGESTIONS] Coordinator API not available, using direct engine`);
        suggestedItems = await SuggestionEngine.suggestFeats(
          items,
          tempActor,
          pendingData,
          { buildIntent, includeFutureAvailability: true }
        );
      }
    } else if (itemType === 'talent') {
      SWSELogger.log(`[CHARGEN-SUGGESTIONS] Calling SuggestionEngine.suggestTalents()...`);
      // Try to use coordinator API first
      if (game.swse?.suggestions?.suggestTalents) {
        SWSELogger.log(`[CHARGEN-SUGGESTIONS] Using coordinator API for talent suggestions`);
        suggestedItems = await game.swse.suggestions.suggestTalents(
          items,
          tempActor,
          pendingData,
          { buildIntent, includeFutureAvailability: true }
        );
      } else {
        SWSELogger.log(`[CHARGEN-SUGGESTIONS] Coordinator API not available, using direct engine`);
        suggestedItems = await SuggestionEngine.suggestTalents(
          items,
          tempActor,
          pendingData,
          { buildIntent, includeFutureAvailability: true }
        );
      }
    }

    SWSELogger.log(`[CHARGEN-SUGGESTIONS] calculateChargenSuggestions() COMPLETE - ${suggestedItems.length} items scored`);
    return suggestedItems;
  } catch (err) {
    SWSELogger.error(`[CHARGEN-SUGGESTIONS] ERROR calculating suggestions:`, err);
    // Return items without suggestions as fallback
    return items.map(item => ({
      ...item,
      suggestion: {
        tier: 0,
        reason: 'Suggestion engine error - legal option',
        icon: ''
      }
    }));
  }
}

/**
 * Handle feat selection
 */
export async function _onSelectFeat(event) {
  event.preventDefault();
  const id = event.currentTarget.dataset.featid;
  SWSELogger.log(`[CHARGEN-FEATS-TALENTS] _onSelectFeat: START - Feat ID: "${id}"`);

  if (!this._packs.feats || this._packs.feats.length === 0) {
    SWSELogger.error(`[CHARGEN-FEATS-TALENTS] ERROR: Feats pack is null or empty!`);
    ui.notifications.error("Feats data not loaded!");
    return;
  }
  SWSELogger.log(`[CHARGEN-FEATS-TALENTS] _onSelectFeat: Feats pack loaded with ${this._packs.feats.length} feats`);

  const feat = this._packs.feats.find(f => f._id === id || f.name === id);
  SWSELogger.log(`[CHARGEN-FEATS-TALENTS] _onSelectFeat: Feat lookup result:`, feat ? `FOUND - ${feat.name}` : 'NOT FOUND');

  if (!feat) {
    SWSELogger.error(`[CHARGEN-FEATS-TALENTS] ERROR: Feat not found with ID: "${id}"`);
    ui.notifications.warn("Feat not found!");
    return;
  }

  // Check for duplicates in characterData
  SWSELogger.log(`[CHARGEN-FEATS-TALENTS] _onSelectFeat: Checking for duplicates in characterData (${this.characterData.feats.length} existing feats)`);
  const alreadySelected = this.characterData.feats.find(f => f.name === feat.name || f._id === feat._id);
  if (alreadySelected) {
    SWSELogger.log(`[CHARGEN-FEATS-TALENTS] _onSelectFeat: Duplicate found - "${feat.name}" already selected`);
    ui.notifications.warn(`You've already selected "${feat.name}"!`);
    return;
  }

  // Check feat slot limit (unless free build mode is on)
  if (!this.freeBuild && this.characterData.feats.length >= this.characterData.featsRequired) {
    SWSELogger.log(`[CHARGEN-FEATS-TALENTS] _onSelectFeat: Feat slot limit reached (${this.characterData.feats.length}/${this.characterData.featsRequired})`);
    ui.notifications.warn(`You've already selected the maximum number of feats (${this.characterData.featsRequired})!`);
    return;
  }

  // If leveling up, also check existing actor items
  if (this.actor) {
    SWSELogger.log(`[CHARGEN-FEATS-TALENTS] _onSelectFeat: Checking actor items for existing feat...`);
    const existsOnActor = this.actor.items.some(item =>
      item.type === 'feat' && (item.name === feat.name || item.id === feat._id)
    );
    if (existsOnActor) {
      SWSELogger.log(`[CHARGEN-FEATS-TALENTS] _onSelectFeat: Feat already exists on actor`);
      ui.notifications.warn(`"${feat.name}" is already on your character sheet!`);
      return;
    }
    SWSELogger.log(`[CHARGEN-FEATS-TALENTS] _onSelectFeat: Feat not on actor, proceeding...`);
  }

  // Check prerequisites (unless in Free Build mode)
  if (!this.freeBuild) {
    SWSELogger.log(`[CHARGEN-FEATS-TALENTS] _onSelectFeat: Checking prerequisites (freeBuild: ${this.freeBuild})`);

    // Droids cannot select feats that require Force Sensitivity or Force Points
    if (this.characterData.isDroid) {
      SWSELogger.log(`[CHARGEN-FEATS-TALENTS] _onSelectFeat: Character is a droid, checking for Force-related prerequisites...`);
      const prereqs = feat.system?.prerequisite || "";
      const preqsLower = prereqs.toLowerCase();
      if (
        preqsLower.includes("force sensitivity") ||
        preqsLower.includes("force technique") ||
        preqsLower.includes("force secret") ||
        preqsLower.includes("force point")
      ) {
        SWSELogger.log(`[CHARGEN-FEATS-TALENTS] _onSelectFeat: Droid cannot select Force feat: "${feat.name}"`);
        ui.notifications.warn(`Droids cannot select "${feat.name}" because they cannot be Force-sensitive.`);
        return;
      }
    }

    const tempActor = this.actor || this._createTempActorForValidation();

    // Get the class being taken (first class in chargen, or for level-up use selectedClass)
    const classDoc = this.characterData.classes?.[0];
    const grantedFeats = PrerequisiteValidator.getAllGrantedFeats(tempActor, classDoc);

    const pendingData = {
      selectedFeats: this.characterData.feats || [],
      selectedClass: classDoc,
      abilityIncreases: {},
      selectedSkills: Object.keys(this.characterData.skills || {})
        .filter(k => this.characterData.skills[k]?.trained)
        .map(k => ({ key: k })), // Convert to object format expected by prerequisite validator
      selectedTalents: this.characterData.talents || [],
      grantedFeats: grantedFeats
    };

    SWSELogger.log(`[CHARGEN-FEATS-TALENTS] _onSelectFeat: Running PrerequisiteValidator for feat "${feat.name}"`);
    const prereqCheck = PrerequisiteValidator.checkFeatPrerequisites(feat, tempActor, pendingData);
    SWSELogger.log(`[CHARGEN-FEATS-TALENTS] _onSelectFeat: Prerequisite check result:`, prereqCheck);

    if (!prereqCheck.valid) {
      SWSELogger.log(`[CHARGEN-FEATS-TALENTS] _onSelectFeat: Prerequisites NOT met for "${feat.name}":`, prereqCheck.reasons);
      ui.notifications.warn(`Cannot select "${feat.name}": ${prereqCheck.reasons.join(', ')}`);
      return;
    }
    SWSELogger.log(`[CHARGEN-FEATS-TALENTS] _onSelectFeat: Prerequisites MET for "${feat.name}"`);
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

  // If opened from character sheet "Add Feat" button, add to actor and close
  if (this._parentSheet && this.actor) {
    // Add feat directly to actor
    const [created] = await this.actor.createEmbeddedDocuments('Item', [{
      name: feat.name,
      type: 'feat',
      data: feat.system || feat.data
    }]);
    if (created) {
      ui.notifications.info(`Added ${feat.name} to character sheet`);
      this.close();
    }
  }

  // Save filter state before render
  const filterCheckbox = document.querySelector('.filter-valid-feats');
  const wasFilterActive = filterCheckbox?.checked || false;

  // Re-render to show updated feat selection and enable Next button if requirement met
  await this.render();

  // Restore filter state after render
  if (wasFilterActive) {
    const newFilterCheckbox = document.querySelector('.filter-valid-feats');
    if (newFilterCheckbox) {
      newFilterCheckbox.checked = true;
      // Trigger change event to apply filter
      newFilterCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
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

            // If opened from character sheet "Add Feat" button, add to actor and close
            if (this._parentSheet && this.actor) {
              this.actor.createEmbeddedDocuments('Item', [{
                name: updatedFeat.name,
                type: 'feat',
                data: updatedFeat.system || updatedFeat.data
              }]).then(() => {
                ui.notifications.info(`Added ${updatedFeat.name} to character sheet`);
                dialog.close();
                this.close();
                resolve(true);
              });
            } else {
              dialog.close();
              resolve(true);
            }
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
 * Handle filtering to show only valid feats
 */
export function _onToggleFeatFilter(event) {
  const isChecked = event.currentTarget.checked;
  const featsContainer = event.currentTarget.closest('.step-feats');

  if (!featsContainer) return;

  // Toggle the filter class on the feats container
  if (isChecked) {
    featsContainer.classList.add('filter-valid-feats-only');
  } else {
    featsContainer.classList.remove('filter-valid-feats-only');
  }
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

    // Check talent slot limit for Block & Deflect (grants 2 talents)
    if (!this.freeBuild && (this.characterData.talents.length + talentsToAdd.length) > this.characterData.talentsRequired) {
      ui.notifications.warn(`You don't have enough talent slots for Block & Deflect (requires ${talentsToAdd.length} slots, you have ${this.characterData.talentsRequired - this.characterData.talents.length} available)!`);
      return;
    }

    // Check for duplicates and prerequisites for each talent
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

      // Check prerequisites for the Block & Deflect component talents (unless in Free Build mode)
      if (!this.freeBuild) {
        const tempActor = this.actor || this._createTempActorForValidation();
        const pendingData = {
          selectedFeats: this.characterData.feats || [],
          selectedClass: this.characterData.classes?.[0],
          selectedSkills: Object.keys(this.characterData.skills || {})
            .filter(k => this.characterData.skills[k]?.trained)
            .map(k => ({ key: k })),
          selectedTalents: this.characterData.talents || []
        };

        const prereqCheck = PrerequisiteRequirements.checkTalentPrerequisites(tempActor, talentToAdd, pendingData);
        if (!prereqCheck.valid) {
          ui.notifications.warn(`Cannot select "${talentToAdd.name}" from Block & Deflect: ${prereqCheck.reasons.join(', ')}`);
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

    // Check talent slot limit (unless free build mode is on)
    if (!this.freeBuild && this.characterData.talents.length >= this.characterData.talentsRequired) {
      ui.notifications.warn(`You've already selected the maximum number of talents (${this.characterData.talentsRequired})!`);
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

    // Check prerequisites (unless in Free Build mode)
    if (!this.freeBuild) {
      // Droids cannot select talents that require Force Sensitivity or Force Points
      if (this.characterData.isDroid) {
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

      // Check all prerequisites using PrerequisiteValidator
      const tempActor = this.actor || this._createTempActorForValidation();
      const pendingData = {
        selectedFeats: this.characterData.feats || [],
        selectedClass: this.characterData.classes?.[0],
        selectedSkills: Object.keys(this.characterData.skills || {})
          .filter(k => this.characterData.skills[k]?.trained)
          .map(k => ({ key: k })),
        selectedTalents: this.characterData.talents || []
      };

      const prereqCheck = PrerequisiteRequirements.checkTalentPrerequisites(tempActor, tal, pendingData);
      if (!prereqCheck.valid) {
        ui.notifications.warn(`Cannot select "${tal.name}": ${prereqCheck.reasons.join(', ')}`);
        return;
      }
    }

    // DEFENSIVE CLONE: Prevent mutation of cached compendium data
    this.characterData.talents.push(foundry.utils.deepClone(tal));
    ui.notifications.info(`Selected talent: ${tal.name}`);
  }

  // If opened from character sheet "Add Talent" button, add to actor and close
  if (this._parentSheet && this.actor) {
    // Add talent(s) directly to actor
    const talentsToAdd = Array.isArray(this.characterData.talents) &&
      this.characterData.talents.length > 0 ?
      this.characterData.talents.slice(-1) : // Get last added talent
      [];

    if (talentsToAdd.length > 0) {
      const itemsToCreate = talentsToAdd.map(tal => ({
        name: tal.name,
        type: 'talent',
        data: tal.system || tal.data
      }));

      const created = await this.actor.createEmbeddedDocuments('Item', itemsToCreate);
      if (created.length > 0) {
        ui.notifications.info(`Added ${created.map(c => c.name).join(', ')} to character sheet`);
        this.close();
        return;
      }
    }
  }

  // Clear selected tree and re-render to show updated selection
  // Don't auto-advance - let user click Next when ready
  this.selectedTalentTree = null;
  await this.render();
}

/**
 * Handle talent removal
 */
export async function _onRemoveTalent(event) {
  event.preventDefault();
  const talentId = event.currentTarget.dataset.talentid;
  const talentName = event.currentTarget.dataset.talentname;

  // Find and remove the talent
  const index = this.characterData.talents.findIndex(t =>
    t._id === talentId || t.name === talentName
  );

  if (index !== -1) {
    const removed = this.characterData.talents.splice(index, 1);
    ui.notifications.info(`Removed talent: ${removed[0]?.name || talentName}`);
    await this.render();
  }
}

/**
 * Get available talent trees for the selected class
 */
export function _getAvailableTalentTrees() {
  // Check for unrestricted mode (free build)
  const talentTreeRestriction = game.settings.get('foundryvtt-swse', "talentTreeRestriction");

  let trees = [];

  if (talentTreeRestriction === "unrestricted") {
    // Free build mode: return all talent trees from all talents
    const allTrees = new Set();
    if (this._packs.talents) {
      this._packs.talents.forEach(talent => {
        // Use property accessor to handle both 'tree' and 'talent_tree' property names
        const tree = getTalentTreeName(talent);
        if (tree) {
          allTrees.add(tree);
        }
      });
    }
    trees = Array.from(allTrees).sort();
    SWSELogger.log(`CharGen | Available talent trees (unrestricted mode): ${trees.length} trees`);
  } else {
    // Class-restricted mode
    if (!this.characterData.classes || this.characterData.classes.length === 0) {
      SWSELogger.warn("CharGen | No classes selected - cannot get talent trees");
      return [];
    }

    const selectedClassName = this.characterData.classes[0].name;
    const selectedClass = this._packs.classes?.find(c => c.name === selectedClassName);

    if (!selectedClass) {
      SWSELogger.error(`CharGen | Class "${selectedClassName}" not found in packs. Available classes:`,
        this._packs.classes?.map(c => c.name) || []);
      return [];
    }

    trees = getTalentTrees(selectedClass);

    if (!trees || trees.length === 0) {
      SWSELogger.warn(`CharGen | No talent trees found for class "${selectedClassName}". Class data:`, selectedClass.system?.talentTrees || selectedClass.system?.talent_trees);
    }

    SWSELogger.log(`CharGen | Available talent trees for ${selectedClass.name}:`, trees);
  }

  // -----------------------------------------------------------
  // FILTER TREES BASED ON CHARACTER REQUIREMENTS
  // -----------------------------------------------------------

  // Dark Side talent tree requires DSP > 0
  // In chargen, characters start with 0 DSP, so filter it out
  const darkSideScore = this.characterData?.darkSideScore || 0;
  if (darkSideScore === 0) {
    trees = trees.filter(tree => tree !== "Dark Side");
  }

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

  // Get starting class features (e.g., Force Sensitivity from Jedi)
  const classFeatures = this._getStartingClassFeatures();

  // Create a mock actor object with the structure expected by PrerequisiteValidator
  const tempActor = {
    system: {
      level: this.characterData.level || 1,
      bab: this.characterData.bab || 0,
      attributes: foundry.utils.deepClone(this.characterData.abilities),
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

        // Add auto-granted class features
        if (classFeatures && classFeatures.length > 0) {
          for (const feature of classFeatures) {
            items.push({
              type: 'feat',
              name: feature.name,
              system: feature.system || {}
            });
          }
        }

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
              system: {
                tree: getTalentTreeName(talent) || talent.system?.talent_tree || "Unknown",
                prerequisite: talent.system?.prerequisite || "",
                benefit: talent.system?.benefit || "",
                special: talent.system?.special || "",
                uses: talent.system?.uses || {current: 0, max: 0, perEncounter: false, perDay: false}
              }
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

        // Add auto-granted class features
        if (classFeatures && classFeatures.length > 0) {
          for (const feature of classFeatures) {
            items.push({
              type: 'feat',
              name: feature.name,
              system: feature.system || {}
            });
          }
        }

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
              system: {
                tree: getTalentTreeName(talent) || talent.system?.talent_tree || "Unknown",
                prerequisite: talent.system?.prerequisite || "",
                benefit: talent.system?.benefit || "",
                special: talent.system?.special || "",
                uses: talent.system?.uses || {current: 0, max: 0, perEncounter: false, perDay: false}
              }
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
      },
      find: (filterFn) => {
        const items = [];

        // Add auto-granted class features
        if (classFeatures && classFeatures.length > 0) {
          for (const feature of classFeatures) {
            items.push({
              type: 'feat',
              name: feature.name,
              system: feature.system || {}
            });
          }
        }

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
              system: {
                tree: getTalentTreeName(talent) || talent.system?.talent_tree || "Unknown",
                prerequisite: talent.system?.prerequisite || "",
                benefit: talent.system?.benefit || "",
                special: talent.system?.special || "",
                uses: talent.system?.uses || {current: 0, max: 0, perEncounter: false, perDay: false}
              }
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

        return items.find(filterFn);
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

/**
 * Get starting class features (e.g., Force Sensitivity from Jedi)
 * These are auto-granted by the class and should be available for prerequisite checking
 * @private
 * @returns {Array<Object>} Array of feature objects with name and system properties
 */
export function _getStartingClassFeatures() {
  const features = [];

  // Get the selected class
  const selectedClassName = this.characterData.classes?.[0]?.name;
  if (!selectedClassName) {
    return features;
  }

  try {
    // Get the class definition from ClassesDB
    const classDef = ClassesDB.byName(selectedClassName);
    if (!classDef) {
      return features;
    }

    // Extract starting features from the class definition
    const startingFeatures = classDef.startingFeatures || [];
    for (const feature of startingFeatures) {
      features.push({
        name: feature.name,
        system: {
          description: feature.description || `Starting feature from ${selectedClassName}`,
          source: `${selectedClassName} (Starting)`,
          featType: "class_feature",
          prerequisite: feature.prerequisite || "",
          benefit: feature.description || `Starting feature from ${selectedClassName}`
        }
      });
    }

    // Extract level 1 features from level progression
    if (classDef.levelProgression && Array.isArray(classDef.levelProgression)) {
      const level1Data = classDef.levelProgression.find(lp => lp.level === 1);
      if (level1Data && level1Data.features) {
        for (const feature of level1Data.features) {
          // Skip talent_choice and feat_grant as these are handled via UI selection
          if (feature.type === 'talent_choice' || feature.type === 'feat_grant') {
            continue;
          }

          // Skip Lightsaber as it's a weapon, not a feat prerequisite
          if (feature.name === 'Lightsaber') {
            continue;
          }

          // Add proficiencies and class features
          if (feature.type === 'proficiency' || feature.type === 'class_feature') {
            features.push({
              name: feature.name,
              system: {
                description: feature.description || `Class feature from ${selectedClassName} level 1`,
                source: `${selectedClassName} 1`,
                featType: feature.type === 'proficiency' ? 'proficiency' : 'class_feature',
                prerequisite: feature.prerequisite || "",
                benefit: feature.description || `Class feature from ${selectedClassName} level 1`
              }
            });
          }
        }
      }
    }
  } catch (err) {
    SWSELogger.warn(`[CHARGEN-FEATS] Failed to get starting class features for ${selectedClassName}:`, err);
  }

  return features;
}
