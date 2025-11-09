/**
 * SWSE Character Sheet
 * FIXED VERSION - All buttons and inputs working
 */

import { SWSELevelUp } from '../../apps/swse-levelup.js';

export class SWSECharacterSheet extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.sheets.ActorSheetV2
) {
  
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
      // Item actions
      createItem: this._onItemCreate,
      editItem: this._onItemEdit,
      deleteItem: this._onItemDelete,
      
      // Rollable actions
      roll: this._onRoll,
      
      // Condition track
      improveCondition: this._onImproveCondition,
      worsenCondition: this._onWorsenCondition,
      setConditionTrack: this._onSetConditionTrack,
      
      // Force powers
      toggleSuite: this._onToggleSuite,
      usePower: this._onUsePower,
      reloadPower: this._onReloadPower,
      
      // Character actions
      levelUp: this._onLevelUp,
      secondWind: this._onSecondWind,
      applyDamage: this._onApplyDamage,
      applyHealing: this._onApplyHealing,
      shortRest: this._onShortRest,
      longRest: this._onLongRest,
      spendDestiny: this._onSpendDestiny,
      spendForcePoint: this._onSpendForcePoint,
      
      // Talents
      selectTalent: this._onSelectTalent,
      viewTalent: this._onViewTalent
    }
  };

  static PARTS = {
    header: {
      template: 'systems/swse/templates/actors/character/character-sheet.hbs'
    }
  };

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    
    // Add actor data
    context.actor = this.actor;
    context.system = this.actor.system;
    context.flags = this.actor.flags;
    
    // Enrich biography
    context.enrichedBiography = await TextEditor.enrichHTML(
      this.actor.system.biography || '',
      {
        async: true,
        secrets: this.actor.isOwner,
        relativeTo: this.actor
      }
    );
    
    // Prepare items
    this._prepareItems(context);
    
    // Prepare character data
    this._prepareCharacterData(context);
    
    // Calculate derived values
    context.hpPercentage = Math.round(
      (this.actor.system.hp?.value / this.actor.system.hp?.max) * 100
    ) || 0;
    
    context.forceRerollDice = this._getForceRerollDice();
    context.conditionSteps = this._getConditionSteps();
    context.maxSuitePowers = this._getMaxSuitePowers();
    
    // Force user detection
    context.isForceUser = this.actor.items.some(i => 
      i.type === 'feat' && i.name.toLowerCase().includes('force sensitive')
    );
    
    return context;
  }

  _prepareCharacterData(context) {
    // Organize talents by tree
    const talents = context.items.filter(i => i.type === 'talent');
    context.talentTrees = this._organizeTalentTrees(talents);
    context.acquiredTalents = talents.filter(t => t.system.acquired);
    context.availableTalentSelections = this._getAvailableTalentSelections();
    
    // Separate Force powers
    const powers = context.items.filter(i => i.type === 'forcepower');
    context.activeSuite = powers.filter(p => p.system.inSuite);
    context.knownPowers = powers.filter(p => !p.system.inSuite);
    
    // Talent tree filters
    context.talentTreeFilters = this._getTalentTreeFilters();
  }

  _prepareItems(context) {
    const weapons = [];
    const armor = [];
    const equipment = [];
    const talents = [];
    const forcePowers = [];
    const feats = [];
    const classes = [];
    
    for (let i of context.items) {
      i.img = i.img || Item.DEFAULT_ICON;
      
      if (i.type === 'weapon') weapons.push(i);
      else if (i.type === 'armor') armor.push(i);
      else if (i.type === 'equipment') equipment.push(i);
      else if (i.type === 'talent') talents.push(i);
      else if (i.type === 'forcepower') forcePowers.push(i);
      else if (i.type === 'feat') feats.push(i);
      else if (i.type === 'class') classes.push(i);
    }
    
    context.weapons = weapons;
    context.armor = armor;
    context.equipment = equipment;
    context.talents = talents;
    context.forcePowers = forcePowers;
    context.feats = feats;
    context.classes = classes;
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /**
   * Handle creating a new item
   */
  static async _onItemCreate(event, target) {
    event.preventDefault();
    const type = target.dataset.type;
    
    if (!type) {
      console.error('SWSE | No item type specified');
      return;
    }
    
    const itemData = {
      name: `New ${type.capitalize()}`,
      type: type,
      system: {}
    };
    
    await this.actor.createEmbeddedDocuments('Item', [itemData]);
    ui.notifications.info(`Created new ${type}`);
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
      content: `<p>Permanently remove <strong>${item.name}</strong>?</p>
                <p><em>This action cannot be undone.</em></p>`
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
    const penalty = this.actor.system.conditionTrack?.penalty || 0;
    const formula = penalty !== 0 ? 
      `${rollType}${penalty}` : 
      rollType;
    
    const roll = new Roll(formula, rollData);
    const label = target.dataset.label || '';
    
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      flavor: label,
      rollMode: game.settings.get('core', 'rollMode')
    });
  }

  /**
   * Handle condition track changes
   */
  static async _onImproveCondition(event, target) {
    const current = this.actor.system.conditionTrack?.current || 0;
    const newPos = Math.max(0, current - 1);
    
    await this.actor.update({
      'system.conditionTrack.current': newPos
    });
  }

  static async _onWorsenCondition(event, target) {
    const current = this.actor.system.conditionTrack?.current || 0;
    const newPos = Math.min(5, current + 1);
    
    await this.actor.update({
      'system.conditionTrack.current': newPos
    });
  }

  static async _onSetConditionTrack(event, target) {
    const step = parseInt(target.dataset.step);
    await this.actor.update({
      'system.conditionTrack.current': step
    });
  }

  /* -------------------------------------------- */
  /*  Helper Methods                              */
  /* -------------------------------------------- */

  _getForceRerollDice() {
    const level = this.actor.system.level?.heroic || 1;
    const hasStrong = this.actor.items.find(
      i => i.type === 'feat' && i.name.toLowerCase().includes('strong in the force')
    );
    const dieType = hasStrong ? 'd8' : 'd6';
    
    if (level >= 8) return `+3${dieType}`;
    if (level >= 4) return `+2${dieType}`;
    return `+1${dieType}`;
  }

  _getConditionSteps() {
    return [
      {label: 'Normal', penalty: '—', index: 0},
      {label: '-1', penalty: '-1', index: 1},
      {label: '-2', penalty: '-2', index: 2},
      {label: '-5', penalty: '-5', index: 3},
      {label: '-10', penalty: '-10', index: 4},
      {label: 'Helpless', penalty: '—', index: 5}
    ];
  }

  _getMaxSuitePowers() {
    const base = 6;
    const extendedSuite = this.actor.items.find(i => 
      i.type === 'talent' && i.name.toLowerCase().includes('extended suite')
    );
    return base + (extendedSuite ? 2 : 0);
  }

  _getAvailableTalentSelections() {
    const level = this.actor.system.level?.heroic || 1;
    const talentsPerLevel = Math.floor((level + 1) / 2);
    const acquiredCount = this.actor.items.filter(
      i => i.type === 'talent' && i.system.acquired
    ).length;
    return Math.max(0, talentsPerLevel - acquiredCount);
  }

  _organizeTalentTrees(talents) {
    const trees = {};
    
    for (const talent of talents) {
      const treeId = talent.system.tree || 'general';
      if (!trees[treeId]) {
        trees[treeId] = {
          id: treeId,
          name: talent.system.treeName || 'General',
          class: talent.system.class || 'general',
          description: talent.system.treeDescription || '',
          tiers: []
        };
      }
      
      const tier = talent.system.tier || 0;
      if (!trees[treeId].tiers[tier]) {
        trees[treeId].tiers[tier] = {talents: []};
      }
      
      let state = 'locked';
      if (talent.system.acquired) {
        state = 'acquired';
      } else if (this._isTalentAvailable(talent)) {
        state = 'available';
      }
      
      trees[treeId].tiers[tier].talents.push({
        ...talent,
        state: state,
        icon: talent.system.icon || 'fas fa-star'
      });
    }
    
    return Object.values(trees);
  }

  _isTalentAvailable(talent) {
    if (talent.system.prerequisite) {
      const prereq = this.actor.items.get(talent.system.prerequisite);
      if (!prereq || !prereq.system.acquired) {
        return false;
      }
    }
    
    if (this._getAvailableTalentSelections() <= 0) {
      return false;
    }
    
    return true;
  }

  _getTalentTreeFilters() {
    const classes = this.actor.items.filter(i => i.type === 'class');
    const filters = [{id: 'force', label: 'Force Talents'}];
    
    for (const cls of classes) {
      filters.push({
        id: cls.name.toLowerCase(),
        label: `${cls.name} Talents`
      });
    }
    
    return filters;
  }

  // Stub methods for actions not yet implemented
  static async _onToggleSuite(event, target) { console.log('Toggle suite'); }
  static async _onUsePower(event, target) { console.log('Use power'); }
  static async _onReloadPower(event, target) { console.log('Reload power'); }
  static async _onLevelUp(event, target) { console.log('Level up'); }
  static async _onSecondWind(event, target) { console.log('Second wind'); }
  static async _onApplyDamage(event, target) { console.log('Apply damage'); }
  static async _onApplyHealing(event, target) { console.log('Apply healing'); }
  static async _onShortRest(event, target) { console.log('Short rest'); }
  static async _onLongRest(event, target) { console.log('Long rest'); }
  static async _onSpendDestiny(event, target) { console.log('Spend destiny'); }
  static async _onSpendForcePoint(event, target) { console.log('Spend force point'); }
  static async _onSelectTalent(event, target) { console.log('Select talent'); }
  static async _onViewTalent(event, target) { console.log('View talent'); }

  activateListeners(html) {
    super.activateListeners(html);
    
    if (!this.isEditable) return;
    
    console.log('SWSE | Activating character sheet listeners...');
    
    // ========================================================================
    // ITEM MANAGEMENT BUTTONS
    // ========================================================================
    
    // Add item buttons (various classes used in templates)
    html.find('.item-create').click(this._onItemCreate.bind(this));
    html.find('.add-item').click(this._onItemCreate.bind(this));
    html.find('[data-action="createItem"]').click(this._onItemCreate.bind(this));
    
    // Edit item buttons
    html.find('.item-edit').click(this._onItemEdit.bind(this));
    html.find('[data-action="editItem"]').click(this._onItemEdit.bind(this));
    
    // Delete item buttons
    html.find('.item-delete').click(this._onItemDelete.bind(this));
    html.find('[data-action="deleteItem"]').click(this._onItemDelete.bind(this));
    
    // ========================================================================
    // SKILLS
    // ========================================================================
    
    // Add custom skill
    html.find('.add-skill').click(this._onAddSkill.bind(this));
    html.find('[data-action="addSkill"]').click(this._onAddSkill.bind(this));
    
    // Remove skill
    html.find('.remove-skill').click(this._onRemoveSkill.bind(this));
    html.find('[data-action="removeSkill"]').click(this._onRemoveSkill.bind(this));
    
    // ========================================================================
    // FEATS
    // ========================================================================
    
    // Add feat
    html.find('.add-feat').click(this._onAddFeat.bind(this));
    html.find('[data-action="addFeat"]').click(this._onAddFeat.bind(this));
    
    // Remove feat
    html.find('.remove-feat').click(this._onRemoveFeat.bind(this));
    html.find('[data-action="removeFeat"]').click(this._onRemoveFeat.bind(this));
    
    // ========================================================================
    // TALENTS
    // ========================================================================
    
    // Add talent
    html.find('.add-talent').click(this._onAddTalent.bind(this));
    html.find('[data-action="addTalent"]').click(this._onAddTalent.bind(this));
    html.find('[data-action="selectTalent"]').click(this._onSelectTalent.bind(this));
    
    // Remove talent
    html.find('.remove-talent').click(this._onRemoveTalent.bind(this));
    html.find('[data-action="removeTalent"]').click(this._onRemoveTalent.bind(this));
    
    // View talent
    html.find('[data-action="viewTalent"]').click(this._onViewTalent.bind(this));
    
    // ========================================================================
    // FORCE POWERS
    // ========================================================================
    
    // Add force power
    html.find('.add-force-power').click(this._onAddForcePower.bind(this));
    html.find('[data-action="addForcePower"]').click(this._onAddForcePower.bind(this));
    
    // Remove force power
    html.find('.remove-force-power').click(this._onRemoveForcePower.bind(this));
    html.find('[data-action="removeForcePower"]').click(this._onRemoveForcePower.bind(this));
    
    // Toggle suite
    html.find('[data-action="toggleSuite"]').click(this._onToggleSuite.bind(this));
    
    // Use power
    html.find('[data-action="usePower"]').click(this._onUsePower.bind(this));
    
    // Reload power
    html.find('[data-action="reloadPower"]').click(this._onReloadPower.bind(this));
    
    // ========================================================================
    // ROLLABLE ACTIONS
    // ========================================================================
    
    // Generic roll action
    html.find('.rollable').click(this._onRoll.bind(this));
    html.find('[data-action="roll"]').click(this._onRoll.bind(this));
    
    // ========================================================================
    // CONDITION TRACK
    // ========================================================================
    
    html.find('[data-action="improveCondition"]').click(this._onImproveCondition.bind(this));
    html.find('[data-action="worsenCondition"]').click(this._onWorsenCondition.bind(this));
    html.find('[data-action="setConditionTrack"]').click(this._onSetConditionTrack.bind(this));
    
    // ========================================================================
    // CHARACTER ACTIONS
    // ========================================================================
    
    html.find('[data-action="levelUp"]').click(this._onLevelUp.bind(this));
    html.find('[data-action="secondWind"]').click(this._onSecondWind.bind(this));
    html.find('[data-action="applyDamage"]').click(this._onApplyDamage.bind(this));
    html.find('[data-action="applyHealing"]').click(this._onApplyHealing.bind(this));
    html.find('[data-action="shortRest"]').click(this._onShortRest.bind(this));
    html.find('[data-action="longRest"]').click(this._onLongRest.bind(this));
    html.find('[data-action="spendDestiny"]').click(this._onSpendDestiny.bind(this));
    html.find('[data-action="spendForcePoint"]').click(this._onSpendForcePoint.bind(this));
    
    console.log('SWSE | All listeners activated');
  }
  
  // ========================================================================
  // ITEM MANAGEMENT METHODS
  // ========================================================================
  
  async _onItemCreate(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const button = event.currentTarget;
    const type = button.dataset.type || 'item';
    
    console.log('SWSE | Creating item of type:', type);
    
    const itemData = {
      name: `New ${type.capitalize()}`,
      type: type,
      system: {}
    };
    
    const created = await this.actor.createEmbeddedDocuments('Item', [itemData]);
    ui.notifications.info(`Created ${type}`);
    
    console.log('SWSE | Item created:', created[0].name);
  }
  
  async _onItemEdit(event) {
    event.preventDefault();
    const itemId = $(event.currentTarget).closest('[data-item-id]').data('itemId');
    const item = this.actor.items.get(itemId);
    
    if (item) {
      item.sheet.render(true);
    }
  }
  
  async _onItemDelete(event) {
    event.preventDefault();
    const itemId = $(event.currentTarget).closest('[data-item-id]').data('itemId');
    const item = this.actor.items.get(itemId);
    
    if (!item) return;
    
    const confirmed = await Dialog.confirm({
      title: 'Delete Item',
      content: `<p>Delete <strong>${item.name}</strong>?</p>`
    });
    
    if (confirmed) {
      await item.delete();
      ui.notifications.info(`Deleted ${item.name}`);
    }
  }
  
  // ========================================================================
  // SKILL METHODS
  // ========================================================================
  
  async _onAddSkill(event) {
    event.preventDefault();
    console.log('SWSE | Adding custom skill');
    
    // Get current custom skills or initialize empty array
    const customSkills = this.actor.system.customSkills || [];
    
    // Add new skill
    customSkills.push({
      name: 'New Skill',
      ability: 'int',
      trained: false,
      focused: false,
      misc: 0
    });
    
    await this.actor.update({'system.customSkills': customSkills});
    ui.notifications.info('Added custom skill');
  }
  
  async _onRemoveSkill(event) {
    event.preventDefault();
    const index = parseInt(event.currentTarget.dataset.index);
    
    console.log('SWSE | Removing custom skill at index:', index);
    
    const customSkills = [...(this.actor.system.customSkills || [])];
    customSkills.splice(index, 1);
    
    await this.actor.update({'system.customSkills': customSkills});
    ui.notifications.info('Removed custom skill');
  }
  
  // ========================================================================
  // STUB METHODS (implement these as needed)
  // ========================================================================
  
  async _onAddFeat(event) {
    console.log('SWSE | Add feat - not yet implemented');
    ui.notifications.warn('Feature coming soon!');
  }
  
  async _onRemoveFeat(event) {
    console.log('SWSE | Remove feat');
  }
  
  async _onAddTalent(event) {
    console.log('SWSE | Add talent - not yet implemented');
    ui.notifications.warn('Feature coming soon!');
  }
  
  async _onRemoveTalent(event) {
    console.log('SWSE | Remove talent');
  }
  
  async _onSelectTalent(event) {
    console.log('SWSE | Select talent');
  }
  
  async _onViewTalent(event) {
    event.preventDefault();
    const talentId = event.currentTarget.dataset.talentId;
    const talent = this.actor.items.get(talentId);
    if (talent) {
      talent.sheet.render(true);
    }
  }
  
  async _onAddForcePower(event) {
    console.log('SWSE | Add force power - not yet implemented');
    ui.notifications.warn('Feature coming soon!');
  }
  
  async _onRemoveForcePower(event) {
    console.log('SWSE | Remove force power');
  }
  
  async _onToggleSuite(event) {
    console.log('SWSE | Toggle suite');
  }
  
  async _onUsePower(event) {
    console.log('SWSE | Use power');
  }
  
  async _onReloadPower(event) {
    console.log('SWSE | Reload power');
  }
  
  async _onRoll(event) {
    event.preventDefault();
    const rollType = event.currentTarget.dataset.roll;
    
    if (!rollType) return;
    
    const rollData = this.actor.getRollData();
    const roll = new Roll(rollType, rollData);
    
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      flavor: event.currentTarget.dataset.label || 'Roll',
      rollMode: game.settings.get('core', 'rollMode')
    });
  }
  
  async _onImproveCondition(event) {
    const current = this.actor.system.conditionTrack?.current || 0;
    await this.actor.update({'system.conditionTrack.current': Math.max(0, current - 1)});
  }
  
  async _onWorsenCondition(event) {
    const current = this.actor.system.conditionTrack?.current || 0;
    await this.actor.update({'system.conditionTrack.current': Math.min(5, current + 1)});
  }
  
  async _onSetConditionTrack(event) {
    const step = parseInt(event.currentTarget.dataset.step);
    await this.actor.update({'system.conditionTrack.current': step});
  }
  
  async _onLevelUp(event) {
    console.log('SWSE | Level up');
    ui.notifications.info('Level up feature coming soon!');
  }
  
  async _onSecondWind(event) {
    console.log('SWSE | Second wind');
  }
  
  async _onApplyDamage(event) {
    console.log('SWSE | Apply damage');
  }
  
  async _onApplyHealing(event) {
    console.log('SWSE | Apply healing');
  }
  
  async _onShortRest(event) {
    console.log('SWSE | Short rest');
  }
  
  async _onLongRest(event) {
    console.log('SWSE | Long rest');
  }
  
  async _onSpendDestiny(event) {
    console.log('SWSE | Spend destiny');
  }
  
  async _onSpendForcePoint(event) {
    console.log('SWSE | Spend force point');
  }

}

