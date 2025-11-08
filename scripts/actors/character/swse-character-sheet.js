/**
 * SWSE Character Sheet
 * Comprehensive character sheet with all features
 */

import { SWSELevelUp } from '../../apps/swse-levelup.js';

export class SWSECharacterSheet extends ActorSheet {
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
      }],
      dragDrop: [{
        dragSelector: '.item-list .item',
        dropSelector: null
      }, {
        dragSelector: '.power-item',
        dropSelector: '.suite-drop-zone'
      }],
      scrollY: ['.sheet-body']
    });
  }

  get template() {
    return `systems/swse/templates/actors/${this.actor.type}/character-sheet.hbs`;
  }

  async getData() {
    const context = super.getData();
    const actorData = this.actor.toObject(false);
    
    context.system = actorData.system;
    context.flags = actorData.flags;
    
    // Enrich editor content
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
    
    // Separate Force powers into suite and known
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
    // Check for talents that increase suite size
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

  activateListeners(html) {
    super.activateListeners(html);
    
    if (!this.isEditable) return;
    
    // Rollable items
    html.on('click', '.rollable', this._onRoll.bind(this));
    
    // Item controls
    html.on('click', '.item-create', this._onItemCreate.bind(this));
    html.on('click', '[data-action="editItem"]', this._onItemEdit.bind(this));
    html.on('click', '[data-action="deleteItem"]', this._onItemDelete.bind(this));
    
    // Condition track
    html.on('click', '[data-action="improveCondition"]', 
      () => this._moveConditionTrack(-1));
    html.on('click', '[data-action="worsenCondition"]', 
      () => this._moveConditionTrack(1));
    html.on('click', '[data-action="setConditionTrack"]', 
      this._onConditionStepClick.bind(this));
    
    // Force powers
    html.on('click', '[data-action="toggleSuite"]', 
      this._onToggleSuite.bind(this));
    html.on('click', '[data-action="usePower"]', 
      this._onUsePower.bind(this));
    html.on('click', '.power-header', 
      this._onPowerHeaderClick.bind(this));
    
    // Character-specific actions
    html.on('click', '[data-action="levelUp"]', this._onLevelUp.bind(this));
    html.on('click', '[data-action="secondWind"]', this._onSecondWind.bind(this));
    html.on('click', '[data-action="applyDamage"]', this._onApplyDamage.bind(this));
    html.on('click', '[data-action="applyHealing"]', this._onApplyHealing.bind(this));
    html.on('click', '[data-action="shortRest"]', this._onShortRest.bind(this));
    html.on('click', '[data-action="longRest"]', this._onLongRest.bind(this));
    html.on('click', '[data-action="spendDestiny"]', this._onSpendDestiny.bind(this));
    html.on('click', '[data-action="reloadPower"]', this._onReloadPower.bind(this));
    
    // Force Point actions
    html.on('click', '[data-action="spendForcePoint"]', 
      this._onSpendForcePoint.bind(this));
    
    // Talent selection
    html.on('click', '[data-action="selectTalent"]', 
      this._onSelectTalent.bind(this));
    html.on('click', '[data-action="viewTalent"]', 
      this._onViewTalent.bind(this));
    
    // Talent tree controls
    html.on('click', '.filter-btn', this._onFilterTalents.bind(this));
    html.on('click', '[data-action="toggleTree"]', this._onToggleTree.bind(this));
    
    // Drag and drop for Force powers
    this._setupDragAndDrop(html);
  }

  // === ROLL HANDLERS ===

  async _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    
    if (!dataset.roll) return;
    
    const rollData = this.actor.getRollData();
    const penalty = this.actor.system.conditionTrack?.penalty || 0;
    const formula = penalty !== 0 ? 
      `${dataset.roll}${penalty}` : 
      dataset.roll;
    
    const roll = new Roll(formula, rollData);
    const label = dataset.label || '';
    
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      flavor: label,
      rollMode: game.settings.get('core', 'rollMode')
    });
  }

  // === CONDITION TRACK ===

  async _moveConditionTrack(steps) {
    const current = this.actor.system.conditionTrack?.current || 0;
    const newPos = Math.max(0, Math.min(5, current + steps));
    
    await this.actor.update({
      'system.conditionTrack.current': newPos
    });
    
    const penalties = [0, -1, -2, -5, -10, 0];
    const labels = ['Normal', '-1', '-2', '-5', '-10', 'Helpless'];
    const newPenalty = penalties[newPos];
    
    let message = `Condition Track: ${labels[newPos]}`;
    if (newPenalty !== 0) {
      message += ` (${newPenalty} to all rolls)`;
    }
    
    ui.notifications.info(message);
  }

  async _onConditionStepClick(event) {
    const step = parseInt(event.currentTarget.dataset.step);
    await this.actor.update({
      'system.conditionTrack.current': step
    });
  }

  // === FORCE POWERS ===

  async _onToggleSuite(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const itemId = $(event.currentTarget).closest('[data-item-id]').data('itemId');
    const item = this.actor.items.get(itemId);
    
    if (!item) return;
    
    const inSuite = !item.system.inSuite;
    
    if (inSuite) {
      const suiteSize = this.actor.items.filter(
        i => i.type === 'forcepower' && i.system.inSuite
      ).length;
      
      const maxSuite = this._getMaxSuitePowers();
      
      if (suiteSize >= maxSuite) {
        ui.notifications.warn(`Your Force Suite is full! Maximum ${maxSuite} powers.`);
        return;
      }
    }
    
    await item.update({'system.inSuite': inSuite});
    
    const message = inSuite 
      ? `${item.name} added to your Force Suite` 
      : `${item.name} removed from your Force Suite`;
    ui.notifications.info(message);
  }

  async _onUsePower(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const itemId = $(event.currentTarget).closest('[data-item-id]').data('itemId');
    const item = this.actor.items.get(itemId);
    
    if (!item) return;
    
    // Check Force Point cost
    if (item.system.forcePointCost) {
      const currentFP = this.actor.system.forcePoints?.value || 0;
      if (currentFP < item.system.forcePointCost) {
        ui.notifications.warn('Insufficient Force Points! The Force is not with you.');
        return;
      }
      
      await this.actor.update({
        'system.forcePoints.value': currentFP - item.system.forcePointCost
      });
    }
    
    // Roll Use the Force if needed
    if (item.system.useTheForce) {
      const utf = this.actor.system.skills?.useTheForce?.mod || 0;
      const penalty = this.actor.system.conditionTrack?.penalty || 0;
      const formula = `1d20+${utf}${penalty}`;
      
      const roll = new Roll(formula, this.actor.getRollData());
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({actor: this.actor}),
        flavor: `<strong>Use the Force:</strong> ${item.name} (DC ${item.system.dc || 'varies'})`,
        rollMode: game.settings.get('core', 'rollMode')
      });
    }
    
    // Send power description to chat
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      content: `<div class="swse force-power-use">
                  <h3><i class="fas fa-hand-sparkles"></i> ${item.name}</h3>
                  <p><strong>Action:</strong> ${item.system.action || 'Standard'}</p>
                  <p><strong>Target:</strong> ${item.system.target || 'One target'}</p>
                  <p><strong>Duration:</strong> ${item.system.duration || 'Instantaneous'}</p>
                  <hr>
                  <p>${item.system.description || ''}</p>
                </div>`,
      rollMode: game.settings.get('core', 'rollMode')
    });
  }

  async _onReloadPower(event) {
    const powerId = event.currentTarget.closest('[data-item-id]')?.dataset.itemId;
    const power = this.actor.items.get(powerId);
    
    if (!power) return;
    
    const spent = await this.actor.spendForcePoint('reload Force Power');
    if (!spent) return;
    
    await power.update({
      'system.uses.current': power.system.uses?.max || 1
    });
    
    ui.notifications.info(`${power.name} restored through the Force!`);
  }

  _onPowerHeaderClick(event) {
    if ($(event.target).closest('.power-controls').length) return;
    
    const header = $(event.currentTarget);
    const details = header.next('.power-details');
    details.slideToggle(200);
    header.toggleClass('expanded');
  }

  // === FORCE POINTS ===

  async _onSpendForcePoint(event) {
    event.preventDefault();
    const type = event.currentTarget.dataset.type;
    
    const currentFP = this.actor.system.forcePoints?.value || 0;
    if (currentFP <= 0) {
      ui.notifications.warn('No Force Points remaining! Your connection to the Force weakens...');
      return;
    }
    
    let confirmed = false;
    let message = '';
    
    switch (type) {
      case 'reroll':
        message = `Channel the Force to reroll with ${this._getForceRerollDice()}?`;
        confirmed = await Dialog.confirm({
          title: 'Spend Force Point',
          content: `<p>${message}</p>
                    <p><em>The Force flows through you, offering a second chance...</em></p>`
        });
        break;
        
      case 'avoidDeath':
        message = 'Draw upon the Force to cheat death?';
        confirmed = await Dialog.confirm({
          title: 'Survive Through the Force',
          content: `<p>${message}</p>
                    <p><em>Through the Force, you cling to consciousness. Spend a Force Point to remain at 1 HP.</em></p>`
        });
        break;
        
      case 'reduceDarkside':
        const darkside = this.actor.system.darkSideScore || 0;
        if (darkside <= 0) {
          ui.notifications.info('You walk in the light. No darkness to cleanse.');
          return;
        }
        message = 'Seek redemption and reduce your Dark Side Score by 1?';
        confirmed = await Dialog.confirm({
          title: 'Path to Redemption',
          content: `<p>${message}</p>
                    <p><em>The light beckons. Will you turn from the dark path?</em></p>`
        });
        break;
    }
    
    if (confirmed) {
      const updates = {
        'system.forcePoints.value': currentFP - 1
      };
      
      if (type === 'reduceDarkside') {
        updates['system.darkSideScore'] = Math.max(0, 
          (this.actor.system.darkSideScore || 0) - 1);
      }
      
      await this.actor.update(updates);
      ui.notifications.info('The Force guides your actions!');
    }
  }

  // === CHARACTER ACTIONS ===

  async _onLevelUp(event) {
    const leveled = await SWSELevelUp.open(this.actor);
    
    if (leveled) {
      // Check for feat eligibility
      const newLevel = this.actor.system.level;
      if (newLevel % 2 === 1) {
        ui.notifications.info('You may select a new feat!');
      }
      
      // Check for talent eligibility
      if (newLevel % 2 === 0) {
        ui.notifications.info('You may select a new talent from your class talent trees!');
      }
      
      // Check for ability score increase
      if (newLevel % 4 === 0) {
        ui.notifications.info('You may increase an ability score by 1!');
      }
      
      // Re-render to show changes
      this.render(false);
    }
  }

  async _onSecondWind(event) {
    const result = await this.actor.useSecondWind();
    
    if (result) {
      ui.notifications.info('You dig deep and find the strength to fight on!');
    }
  }

  async _onApplyDamage(event) {
    const amount = await this._getDamageAmount();
    if (amount !== null) {
      await this.actor.applyDamage(amount, {checkThreshold: true});
    }
  }

  async _onApplyHealing(event) {
    const amount = await this._getHealingAmount();
    if (amount !== null) {
      await this.actor.applyHealing(amount);
      ui.notifications.info('Bacta does wonders for battlefield injuries!');
    }
  }

  async _onShortRest(event) {
    if (!this.actor.rest) {
      ui.notifications.warn('Rest system not yet implemented');
      return;
    }
    
    await this.actor.rest('short');
    ui.notifications.info('A brief respite restores your strength.');
  }

  async _onLongRest(event) {
    if (!this.actor.rest) {
      ui.notifications.warn('Rest system not yet implemented');
      return;
    }
    
    await this.actor.rest('long');
    ui.notifications.info('A full night\'s rest in your quarters leaves you refreshed and ready.');
  }

  async _onSpendDestiny(event) {
    const dp = this.actor.system.destinyPoints;
    
    if (!dp || dp.value <= 0) {
      ui.notifications.warn('No Destiny Points remaining! Your fate is in your own hands.');
      return;
    }
    
    await this.actor.update({
      'system.destinyPoints.value': dp.value - 1
    });
    
    ui.notifications.info(`Destiny Point spent! The galaxy shifts. Remaining: ${dp.value - 1}/${dp.max}`);
  }

  // === TALENTS ===

  async _onSelectTalent(event) {
    const node = $(event.currentTarget);
    const talentId = node.data('talentId');
    
    const talent = this.actor.items.get(talentId);
    if (!talent) return;
    
    if (node.hasClass('locked')) {
      ui.notifications.warn('Prerequisites not met. Master the foundation before advancing.');
      return;
    }
    
    if (node.hasClass('acquired')) {
      talent.sheet.render(true);
      return;
    }
    
    const confirmed = await Dialog.confirm({
      title: 'Acquire Talent',
      content: `<p>Learn <strong>${talent.name}</strong>?</p>
                <p>${talent.system.description || ''}</p>
                <p><em>This will expand your capabilities in ${talent.system.treeName || 'this area'}.</em></p>`
    });
    
    if (confirmed) {
      await talent.update({'system.acquired': true});
      ui.notifications.info(`You have learned: ${talent.name}`);
    }
  }

  _onViewTalent(event) {
    event.preventDefault();
    const talentId = event.currentTarget.dataset.talentId;
    const talent = this.actor.items.get(talentId);
    if (talent) {
      talent.sheet.render(true);
    }
  }

  _onFilterTalents(event) {
    const filter = event.currentTarget.dataset.filter;
    const html = $(this.element);
    
    html.find('.filter-btn').removeClass('active');
    $(event.currentTarget).addClass('active');
    
    if (filter === 'all') {
      html.find('.talent-tree').show();
    } else {
      html.find('.talent-tree').hide();
      html.find(`.talent-tree[data-tree-id*="${filter}"]`).show();
    }
  }

  _onToggleTree(event) {
    event.preventDefault();
    const header = $(event.currentTarget).closest('.tree-header');
    const content = header.next('.tree-content');
    
    header.toggleClass('collapsed');
    content.slideToggle(200);
  }

  // === ITEMS ===

  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    const type = header.dataset.type;
    
    const itemData = {
      name: `New ${type.capitalize()}`,
      type: type,
      system: {}
    };
    
    await this.actor.createEmbeddedDocuments('Item', [itemData]);
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
    
    if (item) {
      const confirmed = await Dialog.confirm({
        title: 'Delete Item',
        content: `<p>Permanently remove <strong>${item.name}</strong>?</p>
                  <p><em>This action cannot be undone.</em></p>`
      });
      
      if (confirmed) {
        await item.delete();
      }
    }
  }

  // === DRAG AND DROP ===

  _setupDragAndDrop(html) {
    const dropZone = html.find('.suite-drop-zone')[0];
    if (!dropZone) return;
    
    dropZone.addEventListener('dragover', (event) => {
      event.preventDefault();
      dropZone.classList.add('drag-over');
    });
    
    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });
    
    dropZone.addEventListener('drop', async (event) => {
      event.preventDefault();
      dropZone.classList.remove('drag-over');
      
      const data = JSON.parse(event.dataTransfer.getData('text/plain'));
      if (data.type === 'Item' && data.uuid) {
        const item = await fromUuid(data.uuid);
        if (item && item.type === 'forcepower' && !item.system.inSuite) {
          const suiteSize = this.actor.items.filter(
            i => i.type === 'forcepower' && i.system.inSuite
          ).length;
          
          const maxSuite = this._getMaxSuitePowers();
          
          if (suiteSize >= maxSuite) {
            ui.notifications.warn(`Your Force Suite is at capacity! Maximum ${maxSuite} powers.`);
            return;
          }
          
          await item.update({'system.inSuite': true});
          ui.notifications.info(`${item.name} flows into your Force Suite`);
        }
      }
    });
  }

  // === HELPER DIALOGS ===

  async _getDamageAmount() {
    return new Promise((resolve) => {
      new Dialog({
        title: 'Take Damage',
        content: `
          <form>
            <div class="form-group">
              <label>Damage Amount</label>
              <input type="number" name="amount" value="0" min="0" autofocus/>
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" name="threshold" checked/>
                Check Damage Threshold
              </label>
            </div>
          </form>
        `,
        buttons: {
          apply: {
            icon: '<i class="fas fa-check"></i>',
            label: 'Apply',
            callback: html => {
              const amount = parseInt(html.find('[name="amount"]').val());
              resolve(amount);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: 'Cancel',
            callback: () => resolve(null)
          }
        },
        default: 'apply'
      }).render(true);
    });
  }

  async _getHealingAmount() {
    return new Promise((resolve) => {
      new Dialog({
        title: 'Apply Healing',
        content: `
          <form>
            <div class="form-group">
              <label>Healing Amount</label>
              <input type="number" name="amount" value="0" min="0" autofocus/>
            </div>
          </form>
        `,
        buttons: {
          apply: {
            icon: '<i class="fas fa-check"></i>',
            label: 'Apply',
            callback: html => {
              const amount = parseInt(html.find('[name="amount"]').val());
              resolve(amount);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: 'Cancel',
            callback: () => resolve(null)
          }
        },
        default: 'apply'
      }).render(true);
    });
  }
}
