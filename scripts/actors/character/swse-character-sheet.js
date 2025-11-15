/**
 * SWSE Character Sheet
 * FIXED VERSION - Event listeners match actual button classes
 */

import { SWSELevelUp } from '../../apps/swse-levelup.js';
import { SWSEStore } from '../../apps/store.js';
import { SWSEActorSheetBase } from '../../sheets/base-sheet.js';
import { CombatActionsMapper } from '../../utils/combat-actions-mapper.js';
import { FeatActionsMapper } from '../../utils/feat-actions-mapper.js';

export class SWSECharacterSheet extends SWSEActorSheetBase {

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
   * Post combat action to chat
   */
  async _onPostCombatAction(event) {
    event.preventDefault();
    const actionName = event.currentTarget.dataset.actionName;

    // Find the action data from the rendered context
    const actionRow = $(event.currentTarget).closest('.combat-action-row');
    const actionType = actionRow.data('actionType');
    const notes = actionRow.find('.action-notes').text();

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
}
