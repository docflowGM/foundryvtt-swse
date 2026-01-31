/**
 * Mentor Goal Dialog
 * Allows player to set a personal goal toward an archetype or prestige class
 *
 * This is a lightweight UX flow that:
 * - Shows descriptive archetypes and prestige classes
 * - Lets the player select one or both
 * - Confirms the selection
 * - Writes to MentorMemory to bias suggestions
 */

import { getClassArchetypes, getArchetypeByKey } from '../engine/ArchetypeDefinitions.js';
import { PRESTIGE_SIGNALS } from '../engine/BuildIntent.js';
import { getMentorMemory, setMentorMemory, setCommittedPath, setTargetClass } from '../engine/mentor-memory.js';
import { SWSELogger } from '../utils/logger.js';

export class MentorGoalDialog extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "mentor-goal-dialog",
      classes: ["swse", "mentor-goal-dialog"],
      template: "systems/foundryvtt-swse/templates/apps/mentor-goal-dialog.hbs",
      width: 700,
      height: 600,
      resizable: true,
      draggable: true,
      scrollY: [".archetype-list", ".prestige-list"]
    });
  }

  constructor(actor, mentorId, options = {}) {
    super({}, options);
    this.actor = actor;
    this.mentorId = mentorId;
    this.selectedArchetype = null;
    this.selectedPrestige = null;
  }

  get title() {
    return `Set Your Path — ${this.actor.name}`;
  }

  async getData() {
    const data = await super.getData();

    // Get all archetypes for the player's primary class
    const classItems = this.actor.items.filter(i => i.type === 'class');
    const primaryClass = classItems.length > 0 ? classItems[0].name : null;

    // Get archetype definitions
    let archetypeList = [];
    if (primaryClass) {
      const classArchetypesObj = getClassArchetypes(primaryClass);
      archetypeList = classArchetypesObj.map(archetype => ({
        key: archetype.key,
        displayName: archetype.displayName,
        description: archetype.description,
        philosophyStatement: archetype.philosophyStatement,
        selected: this.selectedArchetype === archetype.key
      }));
    }

    // Get top prestige classes from signals
    const prestigeList = Object.entries(PRESTIGE_SIGNALS)
      .slice(0, 15) // Show top 15 for brevity
      .map(([name, _data]) => ({
        name,
        description: `A prestige class that specializes in focused techniques.`,
        selected: this.selectedPrestige === name
      }));

    data.actor = this.actor;
    data.primaryClass = primaryClass;
    data.archetypes = archetypeList;
    data.prestiges = prestigeList;
    data.selectedArchetype = this.selectedArchetype;
    data.selectedPrestige = this.selectedPrestige;
    data.hasSelection = this.selectedArchetype || this.selectedPrestige;

    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Archetype selection
    html.find('.archetype-card').click(this._onSelectArchetype.bind(this));

    // Prestige selection
    html.find('.prestige-card').click(this._onSelectPrestige.bind(this));

    // Confirm
    html.find('.confirm-goal').click(this._onConfirmGoal.bind(this));

    // Cancel
    html.find('.cancel-goal').click(this._onCancel.bind(this));
  }

  _onSelectArchetype(event) {
    event.preventDefault();
    const archetypeKey = event.currentTarget.dataset.archetype;

    // Toggle selection
    if (this.selectedArchetype === archetypeKey) {
      this.selectedArchetype = null;
    } else {
      this.selectedArchetype = archetypeKey;
    }

    this.render();
  }

  _onSelectPrestige(event) {
    event.preventDefault();
    const prestigeName = event.currentTarget.dataset.prestige;

    // Toggle selection
    if (this.selectedPrestige === prestigeName) {
      this.selectedPrestige = null;
    } else {
      this.selectedPrestige = prestigeName;
    }

    this.render();
  }

  async _onConfirmGoal(event) {
    event.preventDefault();

    // Must have at least one selection
    if (!this.selectedArchetype && !this.selectedPrestige) {
      ui.notifications.warn("Please select at least one path or prestige class.");
      return;
    }

    // Build confirmation message
    let confirmMsg = "You want to work toward ";
    const selections = [];

    if (this.selectedArchetype) {
      const classItems = this.actor.items.filter(i => i.type === 'class');
      const primaryClass = classItems.length > 0 ? classItems[0].name : null;
      const archetype = getArchetypeByKey(this.selectedArchetype, primaryClass);
      if (archetype) {
        selections.push(`being a **${archetype.displayName}**`);
      }
    }

    if (this.selectedPrestige) {
      selections.push(`reaching **${this.selectedPrestige}**`);
    }

    confirmMsg += selections.join(" and ") + "?\n\nYour mentor will guide suggestions toward this path.";

    // Show confirmation dialog
    const confirmed = await Dialog.confirm({
      title: "Confirm Your Goal",
      content: `<p>${confirmMsg}</p>`,
      yes: () => this._saveGoal(),
      no: () => {}
    });
  }

  async _saveGoal() {
    try {
      // Get current mentor memory
      let memory = getMentorMemory(this.actor, this.mentorId);

      // Update with selections
      if (this.selectedArchetype) {
        memory = setCommittedPath(memory, this.selectedArchetype);
      }

      if (this.selectedPrestige) {
        memory = setTargetClass(memory, this.selectedPrestige);
      }

      // Save to actor
      await setMentorMemory(this.actor, this.mentorId, memory);

      // Build confirmation message
      let successMsg = "Your goal has been set. ";
      if (this.selectedArchetype && this.selectedPrestige) {
        successMsg += "You are now working toward both " + this.selectedArchetype + " and " + this.selectedPrestige + ".";
      } else if (this.selectedArchetype) {
        successMsg += "You are now working toward " + this.selectedArchetype + ".";
      } else {
        successMsg += "You are now working toward " + this.selectedPrestige + ".";
      }
      successMsg += " Mentor suggestions will be biased accordingly.";

      ui.notifications.info(successMsg);

      // Close this dialog
      this.close();
    } catch (err) {
      SWSELogger.error('Error saving mentor goal:', err);
      ui.notifications.error("Failed to save your goal. Please try again.");
    }
  }

  _onCancel(event) {
    event.preventDefault();
    this.close();
  }

  async _updateObject(event, formData) {
    // Not used - handled via listeners
  }
}
