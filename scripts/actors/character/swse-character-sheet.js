/**
 * SWSE Character Sheet
 * FIXED VERSION - Event listeners match actual button classes
 */

import { SWSELevelUp } from '../../apps/swse-levelup.js';
import { SWSEStore } from '../../apps/store.js';
import { SWSEActorSheetBase } from '../../sheets/base-sheet.js';
import { CombatActionsMapper } from '../../utils/combat-actions-mapper.js';
import { FeatActionsMapper } from '../../utils/feat-actions-mapper.js';
import { SWSERoll } from '../../rolls/enhanced-rolls.js';

export class SWSECharacterSheet extends SWSEActorSheetBase {

  static _forcePowerDescriptions = null;
  static _combatActionsData = null;

  /**
   * Load Force power descriptions
   */
  static async loadForcePowerDescriptions() {
    if (this._forcePowerDescriptions) return this._forcePowerDescriptions;

    try {
      const response = await fetch('systems/swse/data/force-power-descriptions.json');
      this._forcePowerDescriptions = await response.json();
      return this._forcePowerDescriptions;
    } catch (error) {
      console.error('SWSE | Failed to load Force power descriptions:', error);
      return null;
    }
  }

  /**
   * Load combat actions data
   */
  static async loadCombatActionsData() {
    if (this._combatActionsData) return this._combatActionsData;

    try {
      const response = await fetch('systems/swse/data/combat-actions.json');
      this._combatActionsData = await response.json();
      return this._combatActionsData;
    } catch (error) {
      console.error('SWSE | Failed to load combat actions data:', error);
      return [];
    }
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['swse', 'sheet', 'actor', 'character'],
      template: 'systems/swse/templates/actors/character/character-sheet.hbs',
      width: 800,
      height: 900,
      tabs: [{
        navSelector: '.sheet-tabs',
        contentSelector: '.sheet-body',
        initial: 'summary'
      }]
    });
  }

  async getData() {
    const context = await super.getData();

    // Filter feats for Force Secrets and Force Techniques
    const feats = this.actor.items.filter(i => i.type === 'feat');

    context.forceSecrets = feats.filter(f =>
      f.name.toLowerCase().includes('force secret')
    );

    context.forceTechniques = feats.filter(f =>
      f.name.toLowerCase().includes('force technique')
    );

    // Organize force powers
    const allForcePowers = this.actor.items.filter(i => i.type === 'forcepower' || i.type === 'force-power');
    const forceSuite = this.actor.system.forceSuite || { powers: [], max: 0 };

    context.knownPowers = allForcePowers.filter(p => !forceSuite.powers?.includes(p.id));
    context.activeSuite = allForcePowers.filter(p => forceSuite.powers?.includes(p.id));

    // Force reroll dice calculation
    const forcePointDie = this.actor.system.forcePoints?.die || '1d6';
    context.forceRerollDice = forcePointDie;

    // Get combat actions from CombatActionsMapper
    // Get all combat actions as a flat list for the combat tab
    const actionsBySkill = CombatActionsMapper.getAllActionsBySkill();
    const allActions = [];

    for (const [skillKey, data] of Object.entries(actionsBySkill)) {
      if (data.combatActions && data.combatActions.length > 0) {
        allActions.push(...data.combatActions.map(action => ({
          ...action,
          skill: skillKey
        })));
      }
    }

    // Sort by action type and name
    allActions.sort((a, b) => {
      const typeOrder = { swift: 0, move: 1, standard: 2, 'full-round': 3 };
      const aType = typeOrder[a.actionType?.toLowerCase()] ?? 99;
      const bType = typeOrder[b.actionType?.toLowerCase()] ?? 99;
      if (aType !== bType) return aType - bType;
      return a.name.localeCompare(b.name);
    });

    // Add talent enhancements to combat actions
    const actionsWithEnhancements = CombatActionsMapper.addEnhancementsToActions(allActions, this.actor);

    // Get active enhancements from actor flags
    const activeEnhancements = this.actor.getFlag('swse', 'activeEnhancements') || {};

    // Mark which enhancements are active
    for (const action of actionsWithEnhancements) {
      if (action.enhancements && activeEnhancements[action.name]) {
        action.enhancements = action.enhancements.map(enhancement => ({
          ...enhancement,
          active: activeEnhancements[action.name].includes(enhancement.name)
        }));
      }
    }

    context.combatActions = actionsWithEnhancements;

    // Get feat-granted actions
    const featActions = FeatActionsMapper.getActionsByType(this.actor);
    const activeEffects = this.actor.effects.filter(e => e.flags?.swse?.type === 'feat-action');

    // Mark toggled actions
    for (const category of ['toggleable', 'variable', 'standard', 'passive']) {
      if (featActions[category]) {
        featActions[category] = featActions[category].map(action => {
          const effect = activeEffects.find(e => e.flags?.swse?.actionKey === action.key);
          return {
            ...action,
            toggled: !!effect,
            variableValue: effect?.flags?.swse?.variableValue || action.variableOptions?.min || 0
          };
        });
      }
    }

    context.featActions = featActions;

    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);

    if (!this.options.editable) return;

    // Add character-specific listeners
    html.find('.level-up').click(this._onLevelUp.bind(this));
    html.find('.character-generator').click(this._onOpenCharGen.bind(this));
    html.find('.open-store').click(this._onOpenStore.bind(this));

    // Combat actions filter and search
    html.find('.combat-action-search').on('input', this._onFilterCombatActions.bind(this));
    html.find('.action-type-filter').on('change', this._onFilterCombatActions.bind(this));

    // Combat action click to post to chat
    html.find('.action-name.rollable').click(this._onPostCombatAction.bind(this));

    // Feat action listeners
    html.find('.feat-action-toggle').click(this._onToggleFeatAction.bind(this));
    html.find('.feat-action-slider-input').on('input', this._onUpdateVariableAction.bind(this));
    html.find('.feat-action-use').click(this._onUseFeatAction.bind(this));

    // Talent enhancement listeners
    html.find('.talent-enhancement-toggle').on('change', this._onToggleTalentEnhancement.bind(this));

    console.log('SWSE | Character sheet listeners activated');
  }

  /**
   * Handle level up
   */
  async _onLevelUp(event) {
    event.preventDefault();
    console.log('SWSE | Level up clicked');

    // Use the enhanced version with visual talent trees and multi-classing
    await SWSELevelUp.openEnhanced(this.actor);
  }

  /**
   * Handle opening the character generator
   */
  async _onOpenCharGen(event) {
    event.preventDefault();
    console.log('SWSE | Character generator clicked');

    // Import and open the character generator
    try {
      const CharacterGenerator = (await import('../../apps/chargen.js')).default;
      const chargen = new CharacterGenerator(this.actor);
      chargen.render(true);
    } catch (err) {
      console.error("SWSE | Failed to open character generator:", err);
      ui.notifications.error("Failed to open the character generator. See console for details.");
    }
  }

  /**
   * Handle opening the store
   */
  async _onOpenStore(event) {
    event.preventDefault();
    console.log('SWSE | Store button clicked');

    // Create and render the store application
    const store = new SWSEStore(this.actor);
    store.render(true);
  }

  /**
   * Filter combat actions by search term and action type
   */
  _onFilterCombatActions(event) {
    const html = this.element;
    const searchTerm = html.find('.combat-action-search').val().toLowerCase();
    const actionType = html.find('.action-type-filter').val();

    html.find('.combat-action-row').each((i, row) => {
      const $row = $(row);
      const actionName = $row.data('action-name').toLowerCase();
      const rowActionType = $row.data('action-type');

      const matchesSearch = !searchTerm || actionName.includes(searchTerm);
      const matchesType = !actionType || rowActionType === actionType;

      $row.toggle(matchesSearch && matchesType);
    });
  }

  /**
   * Handle rolling a combat action (posts to chat)
   */
  async _onRollCombatAction(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const actionName = element.dataset.actionName;
    const notes = element.dataset.notes;
    const dc = element.dataset.dc;

    const content = `
      <div class="swse-combat-action">
        <h3>${actionName}</h3>
        <p><strong>Description:</strong> ${notes}</p>
        ${dc ? `<p><strong>DC:</strong> ${dc}</p>` : ''}
      </div>
    `;

    ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: content,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER
    });
  }

  /**
   * Handle toggling a feat action
   */
  async _onToggleFeatAction(event) {
    event.preventDefault();
    const actionKey = event.currentTarget.dataset.actionKey;

    const newState = await FeatActionsMapper.toggleAction(this.actor, actionKey);

    ui.notifications.info(`${newState ? 'Activated' : 'Deactivated'} feat action`);
  }

  /**
   * Handle updating a variable feat action
   */
  async _onUpdateVariableAction(event) {
    event.preventDefault();
    const actionKey = event.currentTarget.dataset.actionKey;
    const value = parseInt(event.currentTarget.value);

    // Update the display
    const $slider = $(event.currentTarget);
    $slider.closest('.feat-action-slider').find('.slider-value').text(value);

    // Update the effect
    await FeatActionsMapper.updateVariableAction(this.actor, actionKey, value);
  }

  /**
   * Handle using a feat action (posts to chat)
   */
  async _onUseFeatAction(event) {
    event.preventDefault();
    const actionKey = event.currentTarget.dataset.actionKey;
    const action = FeatActionsMapper.getAllFeatActions()[actionKey];

    if (!action) return;

    const content = `
      <div class="swse-feat-action">
        <h3><i class="fas fa-star"></i> ${action.name}</h3>
        <p><strong>Type:</strong> ${action.actionType}</p>
        <p><strong>Description:</strong> ${action.description}</p>
        ${action.trigger ? `<p><strong>Trigger:</strong> ${action.trigger}</p>` : ''}
        <p>${action.notes}</p>
      </div>
    `;

    ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: content,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER
    });
  }

  /**
   * Post combat action to chat (with optional DC check roll)
   */
  async _onPostCombatAction(event) {
    event.preventDefault();
    const actionName = event.currentTarget.dataset.actionName;

    // Load combat actions data
    const combatActionsData = await SWSECharacterSheet.loadCombatActionsData();
    const actionData = combatActionsData.find(a => a.name === actionName);

    if (!actionData) {
      ui.notifications.warn(`Combat action ${actionName} not found`);
      return;
    }

    // Check if this action has rollable skills with flat DCs
    const rollableSkills = actionData.relatedSkills?.filter(rs =>
      rs.dc && rs.dc.type === 'flat' && rs.skill && rs.skill !== 'Attack' && rs.skill !== 'Attack Roll'
    ) || [];

    // If no rollable skills, just post description to chat
    if (rollableSkills.length === 0) {
      await this._postCombatActionDescription(actionName, actionData);
      return;
    }

    // If only one rollable skill, roll it directly
    if (rollableSkills.length === 1) {
      const skillData = rollableSkills[0];
      const skillKey = this._getSkillKey(skillData.skill);

      if (skillKey) {
        await SWSERoll.rollCombatActionCheck(this.actor, skillKey, {
          name: actionName,
          actionType: actionData.action.type,
          dc: skillData.dc,
          outcome: skillData.outcome,
          when: skillData.when
        });
      } else {
        await this._postCombatActionDescription(actionName, actionData);
      }
      return;
    }

    // Multiple rollable skills - show selection dialog
    await this._showSkillSelectionDialog(actionName, actionData, rollableSkills);
  }

  /**
   * Post combat action description to chat (without rolling)
   */
  async _postCombatActionDescription(actionName, actionData) {
    const actionRow = $(event.currentTarget).closest('.combat-action-row');
    const actionType = actionData.action.type;
    const notes = actionData.notes;

    // Check for active talent enhancements
    const activeEnhancements = this.actor.getFlag('swse', 'activeEnhancements') || {};
    const actionEnhancements = activeEnhancements[actionName] || [];

    // Build enhancement text
    let enhancementText = '';
    if (actionEnhancements.length > 0) {
      enhancementText = `<div class="enhancement-active">
        <p><strong><i class="fas fa-star"></i> Active Talent Effects:</strong></p>
        <ul>
          ${actionEnhancements.map(e => `<li>${e}</li>`).join('')}
        </ul>
      </div>`;
    }

    // Create chat message
    const content = `
      <div class="swse-combat-action-chat">
        <h3><i class="fas fa-fist-raised"></i> ${this.actor.name} ${this._getActionVerb(actionName)}</h3>
        <div class="action-info">
          <span class="action-type-badge ${actionType}">${actionType}</span>
        </div>
        <p class="action-description">${notes}</p>
        ${enhancementText}
      </div>
    `;

    ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: content,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER
    });
  }

  /**
   * Show dialog to select which skill to roll
   */
  async _showSkillSelectionDialog(actionName, actionData, rollableSkills) {
    const skillOptions = rollableSkills.map(rs => {
      const displayName = SWSERoll._getSkillDisplayName(this._getSkillKey(rs.skill));
      const dcText = rs.dc ? `DC ${rs.dc.value}` : '';
      return `
        <div class="skill-option">
          <input type="radio" name="skill-choice" value="${rs.skill}" id="skill-${rs.skill.replace(/\s+/g, '-')}">
          <label for="skill-${rs.skill.replace(/\s+/g, '-')}">
            <strong>${displayName}</strong> ${dcText}
            ${rs.when ? `<br><em>${rs.when}</em>` : ''}
          </label>
        </div>
      `;
    }).join('');

    const content = `
      <div class="combat-action-skill-selection">
        <p>Select which skill to use for <strong>${actionName}</strong>:</p>
        ${skillOptions}
      </div>
    `;

    new Dialog({
      title: `${actionName} - Select Skill`,
      content: content,
      buttons: {
        roll: {
          icon: '<i class="fas fa-dice-d20"></i>',
          label: 'Roll Check',
          callback: async (html) => {
            const selectedSkill = html.find('input[name="skill-choice"]:checked').val();
            if (!selectedSkill) {
              ui.notifications.warn('Please select a skill');
              return;
            }

            const skillData = rollableSkills.find(rs => rs.skill === selectedSkill);
            const skillKey = this._getSkillKey(selectedSkill);

            if (skillKey) {
              await SWSERoll.rollCombatActionCheck(this.actor, skillKey, {
                name: actionName,
                actionType: actionData.action.type,
                dc: skillData.dc,
                outcome: skillData.outcome,
                when: skillData.when
              });
            }
          }
        },
        description: {
          icon: '<i class="fas fa-comment"></i>',
          label: 'Just Post Description',
          callback: async () => {
            await this._postCombatActionDescription(actionName, actionData);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: 'Cancel'
        }
      },
      default: 'roll'
    }).render(true);
  }

  /**
   * Convert skill name to skill key
   */
  _getSkillKey(skillName) {
    const skillMap = {
      'Acrobatics': 'acrobatics',
      'Climb': 'climb',
      'Deception': 'deception',
      'Endurance': 'endurance',
      'Gather Information': 'gatherInformation',
      'Initiative': 'initiative',
      'Jump': 'jump',
      'Knowledge': 'knowledge',
      'Mechanics': 'mechanics',
      'Perception': 'perception',
      'Persuasion': 'persuasion',
      'Pilot': 'pilot',
      'Ride': 'ride',
      'Stealth': 'stealth',
      'Survival': 'survival',
      'Swim': 'swim',
      'Treat Injury': 'treatInjury',
      'Use Computer': 'useComputer',
      'Use the Force': 'useTheForce'
    };

    // Try direct match
    if (skillMap[skillName]) {
      return skillMap[skillName];
    }

    // Try lowercase key lookup
    const lowerName = skillName.toLowerCase();
    for (const [key, value] of Object.entries(skillMap)) {
      if (key.toLowerCase() === lowerName) {
        return value;
      }
    }

    // Special cases
    if (skillName.toLowerCase().includes('any relevant skill')) {
      return null; // Will need user to select
    }

    return null;
  }

  /**
   * Get the appropriate verb for an action (e.g., "is taking aim", "is charging")
   */
  _getActionVerb(actionName) {
    const verbMap = {
      'Aim': 'is taking aim',
      'Charge': 'is charging',
      'Attack (single)': 'attacks',
      'Full attack': 'makes a full attack',
      'Total Defense': 'takes total defense',
      'Fight defensively': 'fights defensively',
      'Second Wind': 'takes a second wind',
      'Aid another': 'aids an ally',
      'Feint': 'attempts to feint',
      'Grapple / Grab': 'attempts to grapple',
      'Disarm': 'attempts to disarm',
      'Run': 'runs',
      'Draw or Holster Weapon': 'draws/holsters a weapon',
      'Reload': 'reloads',
      'Coup de grace': 'delivers a coup de grâce',
      'Ready an action (prepare)': 'readies an action',
      'Burst Fire / Autofire (vehicle or weapon)': 'fires on full auto',
      'Area Attack (burst/splash/cone)': 'makes an area attack',
      'Tumble': 'tumbles',
      'Stand up from prone': 'stands up',
      'Fall prone': 'falls prone',
      'Snipe': 'snipes from hiding'
    };

    return verbMap[actionName] || `uses ${actionName}`;
  }

  /**
   * Handle toggling a talent enhancement checkbox
   */
  async _onToggleTalentEnhancement(event) {
    const checkbox = event.currentTarget;
    const actionName = checkbox.dataset.actionName;
    const enhancementName = checkbox.dataset.enhancementName;
    const talentName = checkbox.dataset.talentName;

    const isChecked = checkbox.checked;

    // Store enhancement state in actor flags
    const enhancements = this.actor.getFlag('swse', 'activeEnhancements') || {};

    if (!enhancements[actionName]) {
      enhancements[actionName] = [];
    }

    if (isChecked) {
      // Add enhancement to active list
      if (!enhancements[actionName].includes(enhancementName)) {
        enhancements[actionName].push(enhancementName);
      }
      ui.notifications.info(`Enabled ${enhancementName} for ${actionName}`);
    } else {
      // Remove enhancement from active list
      enhancements[actionName] = enhancements[actionName].filter(e => e !== enhancementName);
      if (enhancements[actionName].length === 0) {
        delete enhancements[actionName];
      }
      ui.notifications.info(`Disabled ${enhancementName} for ${actionName}`);
    }

    // Update actor flags
    await this.actor.setFlag('swse', 'activeEnhancements', enhancements);
  }

  /**
   * Handle using a Force power - automatically rolls Use the Force
   */
  async _onUsePower(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const itemId = button.dataset.itemId;
    const power = this.actor.items.get(itemId);

    if (!power) {
      ui.notifications.error('Force power not found');
      return;
    }

    // Use the unified rolling system
    await SWSERoll.rollUseTheForce(this.actor, power);
  }
}
