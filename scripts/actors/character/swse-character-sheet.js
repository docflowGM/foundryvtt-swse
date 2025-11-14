/**
 * SWSE Character Sheet
 * FIXED VERSION - Event listeners match actual button classes
 */

import { SWSELevelUp } from '../../apps/swse-levelup.js';
import { SWSEStore } from '../../apps/store.js';
import { SWSEActorSheetBase } from '../../sheets/base-sheet.js';

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

    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);

    if (!this.options.editable) return;

    // Add character-specific listeners
    html.find('.level-up').click(this._onLevelUp.bind(this));
    html.find('.open-store').click(this._onOpenStore.bind(this));

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
}
