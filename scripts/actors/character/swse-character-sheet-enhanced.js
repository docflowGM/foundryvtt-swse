/**
 * Enhanced SWSE Actor Sheet
 * Implements all modern patterns and improvements
 */

export default class SWSEActorSheetEnhanced extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['swse', 'sheet', 'actor', 'character'],
      template: 'systems/swse/templates/actors/character/character-sheet-enhanced.hbs',
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
    return `systems/swse/templates/actors/${this.actor.type}/character-sheet-enhanced.hbs`;
  }

  getData() {
    const context = super.getData();
    const actorData = this.actor.toObject(false);
    
    context.system = actorData.system;
    context.flags = actorData.flags;
    
    // Enrich editor content
    context.enrichedBiography = TextEditor.enrichHTML(
      this.actor.system.biography || '', 
      {async: false}
    );
    
    // Prepare items
    this._prepareItems(context);
    
    // Prepare character data
    this._prepareCharacterData(context);
    
    // Calculate derived values
    context.hpPercentage = Math.round(
      (this.actor.system.hp.value / this.actor.system.hp.max) * 100
    );
    
    context.forceRerollDice = this._getForceRerollDice();
    context.conditionSteps = this._getConditionSteps();
    context.maxSuitePowers = this._getMaxSuitePowers();
    
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
    // TODO: Add modifiers from talents
    return base;
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
    // Group talents by class/tree
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
      
      // Determine talent state
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
    // Check if prerequisites are met
    if (talent.system.prerequisite) {
      const prereq = this.actor.items.get(talent.system.prerequisite);
      if (!prereq || !prereq.system.acquired) {
        return false;
      }
    }
    
    // Check if player has available selections
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

  async _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    
    if (!dataset.roll) return;
    
    const rollData = this.actor.getRollData();
    
    // Apply condition track penalties
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

  async _moveConditionTrack(steps) {
    const current = this.actor.system.conditionTrack?.current || 0;
    const newPos = Math.max(0, Math.min(5, current + steps));
    
    await this.actor.update({
      'system.conditionTrack.current': newPos
    });
    
    // Show notification with new penalties
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

  async _onToggleSuite(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const itemId = $(event.currentTarget).closest('[data-item-id]').data('itemId');
    const item = this.actor.items.get(itemId);
    
    if (!item) return;
    
    const inSuite = !item.system.inSuite;
    
    // Check suite limit
    if (inSuite) {
      const suiteSize = this.actor.items.filter(
        i => i.type === 'forcepower' && i.system.inSuite
      ).length;
      
      const maxSuite = this._getMaxSuitePowers();
      
      if (suiteSize >= maxSuite) {
        ui.notifications.warn(`Force Suite full (${maxSuite} powers maximum)`);
        return;
      }
    }
    
    await item.update({'system.inSuite': inSuite});
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
        ui.notifications.warn('Not enough Force Points!');
        return;
      }
      
      // Spend Force Points
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
        flavor: `Use the Force: ${item.name} (DC ${item.system.dc})`,
        rollMode: game.settings.get('core', 'rollMode')
      });
    }
    
    // Send power description to chat
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      content: `<h3>${item.name}</h3>
                <p><strong>Action:</strong> ${item.system.action}</p>
                <p><strong>Target:</strong> ${item.system.target}</p>
                <p><strong>Duration:</strong> ${item.system.duration}</p>
                <hr>
                <p>${item.system.description}</p>`,
      rollMode: game.settings.get('core', 'rollMode')
    });
  }

  _onPowerHeaderClick(event) {
    if ($(event.target).closest('.power-controls').length) return;
    
    const header = $(event.currentTarget);
    const details = header.next('.power-details');
    details.slideToggle(200);
    header.toggleClass('expanded');
  }

  async _onSpendForcePoint(event) {
    event.preventDefault();
    const type = event.currentTarget.dataset.type;
    
    const currentFP = this.actor.system.forcePoints?.value || 0;
    if (currentFP <= 0) {
      ui.notifications.warn('No Force Points available!');
      return;
    }
    
    let confirmed = false;
    let message = '';
    
    switch (type) {
      case 'reroll':
        message = `Spend 1 Force Point to reroll with ${this._getForceRerollDice()}?`;
        confirmed = await Dialog.confirm({
          title: 'Spend Force Point',
          content: `<p>${message}</p>`
        });
        break;
        
      case 'avoidDeath':
        message = 'Spend 1 Force Point to avoid death?';
        confirmed = await Dialog.confirm({
          title: 'Avoid Death',
          content: `<p>${message}</p>
                    <p><em>When you would be reduced to 0 HP, spend a Force Point to remain at 1 HP instead.</em></p>`
        });
        break;
        
      case 'reduceDarkside':
        const darkside = this.actor.system.darkSideScore || 0;
        if (darkside <= 0) {
          ui.notifications.info('No Dark Side Score to reduce.');
          return;
        }
        message = 'Spend 1 Force Point to reduce Dark Side Score by 1?';
        confirmed = await Dialog.confirm({
          title: 'Reduce Dark Side',
          content: `<p>${message}</p>`
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
      ui.notifications.info('Force Point spent!');
    }
  }

  async _onSelectTalent(event) {
    const node = $(event.currentTarget);
    const talentId = node.data('talentId');
    
    const talent = this.actor.items.get(talentId);
    if (!talent) return;
    
    // Check if locked
    if (node.hasClass('locked')) {
      ui.notifications.warn('Prerequisites not met');
      return;
    }
    
    // If already acquired, show details
    if (node.hasClass('acquired')) {
      talent.sheet.render(true);
      return;
    }
    
    // Acquire talent
    const confirmed = await Dialog.confirm({
      title: 'Acquire Talent',
      content: `<p>Acquire <strong>${talent.name}</strong>?</p>
                <p>${talent.system.description || ''}</p>`
    });
    
    if (confirmed) {
      await talent.update({'system.acquired': true});
      ui.notifications.info(`Acquired talent: ${talent.name}`);
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
    
    // Update button states
    html.find('.filter-btn').removeClass('active');
    $(event.currentTarget).addClass('active');
    
    // Filter trees
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
          // Check suite limit
          const suiteSize = this.actor.items.filter(
            i => i.type === 'forcepower' && i.system.inSuite
          ).length;
          
          const maxSuite = this._getMaxSuitePowers();
          
          if (suiteSize >= maxSuite) {
            ui.notifications.warn(`Force Suite full (${maxSuite} powers maximum)`);
            return;
          }
          
          await item.update({'system.inSuite': true});
        }
      }
    });
  }

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
        content: `<p>Delete <strong>${item.name}</strong>?</p>`
      });
      
      if (confirmed) {
        await item.delete();
      }
    }
  }
}
