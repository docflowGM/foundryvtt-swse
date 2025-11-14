/**
 * SWSE Character Sheet
 * FIXED VERSION - Event listeners match actual button classes
 */

import { SWSELevelUp } from '../../apps/swse-levelup.js';
import { SWSEStore } from '../../apps/store.js';
import { SWSEActorSheetBase } from '../../sheets/base-sheet.js';
import { CombatActionsMapper } from '../../utils/combat-actions-mapper.js';

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

    context.combatActions = allActions;

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
}
