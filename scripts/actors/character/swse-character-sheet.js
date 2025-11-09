/**
 * SWSE Character Sheet
 * FIXED VERSION - Event listeners match actual button classes
 */

import { SWSELevelUp } from '../../apps/swse-levelup.js';

export class SWSECharacterSheet extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.sheets.ActorSheetV2
) {
  
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ['swse', 'sheet', 'actor', 'character'],
    position: {
      width: 800,
      height: 900
    },
    window: {
      resizable: true,
      positioned: true
    },
    actions: {
      // NEW: Match actual button classes
      addWeapon: this._onAddWeapon,
      addFeat: this._onAddFeat,
      addSkill: this._onAddSkill,
      addForcepower: this._onAddForcepower,
      addTalent: this._onAddTalent,
      levelUp: this._onLevelUp,
      
      // Generic handlers
      editItem: this._onItemEdit,
      deleteItem: this._onItemDelete,
      roll: this._onRoll
    }
  };

  /** @override */
  static PARTS = {
    header: {
      template: 'systems/swse/templates/actors/character/character-sheet.hbs'
    }
  };

  /* -------------------------------------------- */
  /*  Event Handlers - Item Creation             */
  /* -------------------------------------------- */

  /**
   * Handle adding a weapon
   */
  static async _onAddWeapon(event, target) {
    console.log('SWSE | Adding weapon');
    return await this._createItem(event, 'weapon');
  }

  /**
   * Handle adding a feat
   */
  static async _onAddFeat(event, target) {
    console.log('SWSE | Adding feat');
    return await this._createItem(event, 'feat');
  }

  /**
   * Handle adding a skill
   */
  static async _onAddSkill(event, target) {
    console.log('SWSE | Adding skill');
    return await this._createItem(event, 'skill');
  }

  /**
   * Handle adding a force power
   */
  static async _onAddForcepower(event, target) {
    console.log('SWSE | Adding force power');
    return await this._createItem(event, 'forcepower');
  }

  /**
   * Handle adding a talent
   */
  static async _onAddTalent(event, target) {
    console.log('SWSE | Adding talent');
    return await this._createItem(event, 'talent');
  }

  /**
   * Generic item creation
   */
  static async _createItem(event, type) {
    event?.preventDefault();
    
    const itemData = {
      name: `New ${type.capitalize()}`,
      type: type,
      system: {}
    };
    
    const created = await this.actor.createEmbeddedDocuments('Item', [itemData]);
    ui.notifications.info(`Created new ${type}: ${created[0].name}`);
    
    return created;
  }

  /**
   * Handle level up
   */
  static async _onLevelUp(event, target) {
    console.log('SWSE | Level up clicked');
    
    // Open level up dialog
    const dialog = new SWSELevelUp(this.actor);
    dialog.render(true);
  }

  /**
   * Handle editing an item
   */
  static async _onItemEdit(event, target) {
    event.preventDefault();
    const itemId = target.closest('[data-item-id]')?.dataset.itemId;
    
    if (!itemId) {
      console.error('SWSE | No item ID found');
      return;
    }
    
    const item = this.actor.items.get(itemId);
    if (item) {
      item.sheet.render(true);
    }
  }

  /**
   * Handle deleting an item
   */
  static async _onItemDelete(event, target) {
    event.preventDefault();
    const itemId = target.closest('[data-item-id]')?.dataset.itemId;
    
    if (!itemId) {
      console.error('SWSE | No item ID found');
      return;
    }
    
    const item = this.actor.items.get(itemId);
    if (!item) return;
    
    const confirmed = await Dialog.confirm({
      title: 'Delete Item',
      content: `<p>Permanently remove <strong>${item.name}</strong>?</p>`
    });
    
    if (confirmed) {
      await item.delete();
      ui.notifications.info(`Deleted ${item.name}`);
    }
  }

  /**
   * Handle roll actions
   */
  static async _onRoll(event, target) {
    event.preventDefault();
    const rollType = target.dataset.roll;
    
    if (!rollType) return;
    
    const rollData = this.actor.getRollData();
    const roll = new Roll(rollType, rollData);
    
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      flavor: target.dataset.label || 'Roll',
      rollMode: game.settings.get('core', 'rollMode')
    });
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    
    context.actor = this.actor;
    context.system = this.actor.system;
    context.items = this.actor.items.contents;
    
    return context;
  }
}
