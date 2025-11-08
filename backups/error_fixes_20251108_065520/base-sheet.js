/**
 * Base Actor Sheet
 * Provides common functionality for all SWSE actor sheets
 */

export class SWSEActorSheetBase extends ActorSheet {
  
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['swse', 'sheet', 'actor'],
      width: 720,
      height: 680,
      tabs: [{
        navSelector: '.sheet-tabs',
        contentSelector: '.sheet-body',
        initial: 'summary'
      }],
      dragDrop: [{dragSelector: '.item-list .item', dropSelector: null}],
      scrollY: ['.sheet-body']
    });
  }
  
  async getData() {
    const context = super.getData();
    const actor = this.actor;
    const system = actor.system;
    
    // Add actor data
    context.actor = actor;
    context.system = system;
    
    // Organize items by type
    this._prepareItems(context);
    
    // Enrich biography
    context.enrichedBiography = await TextEditor.enrichHTML(
      system.biography || '',
      {
        async: true,
        secrets: actor.isOwner,
        relativeTo: actor
      }
    );
    
    // Add useful calculated values
    context.halfLevel = Math.floor((system.level || 1) / 2);
    context.conditionPenalty = actor.conditionPenalty || 0;
    
    return context;
  }
  
  _prepareItems(context) {
    // Initialize categories
    const items = {
      weapons: [],
      armor: [],
      equipment: [],
      feats: [],
      talents: [],
      classes: [],
      species: null,
      forcePowers: []
    };
    
    // Categorize items
    for (const item of context.items) {
      const type = item.type;
      
      if (type === 'species') {
        items.species = item;
      } else if (type === 'forcepower') {
        items.forcePowers.push(item);
      } else if (items[type + 's']) {
        items[type + 's'].push(item);
      } else if (items[type]) {
        items[type].push(item);
      }
    }
    
    // Sort items
    for (const category of ['weapons', 'armor', 'feats', 'talents', 'classes', 'forcePowers']) {
      items[category].sort((a, b) => a.name.localeCompare(b.name));
    }
    
    Object.assign(context, items);
  }
  
  activateListeners(html) {
    super.activateListeners(html);
    
    // Event delegation pattern
    html.on('click', '[data-action]', this._onAction.bind(this));
    
    // Item controls
    html.on('click', '.item-control', this._onItemControl.bind(this));
    
    // Rollable elements
    html.on('click', '.rollable', this._onRoll.bind(this));
    
    // Editable elements (if owner)
    if (this.isEditable) {
      // Item quantity/equipped changes
      html.on('change', '.item-quantity', this._onItemQuantity.bind(this));
      html.on('change', '.item-equipped', this._onItemEquipped.bind(this));
    }
  }
  
  /**
   * Handle action buttons using data-action attribute
   */
  async _onAction(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const action = button.dataset.action;
    
    // Dispatch to specific handler
    const handlerName = `_on${action.charAt(0).toUpperCase() + action.slice(1)}`;
    const handler = this[handlerName];
    
    if (typeof handler === 'function') {
      return handler.call(this, event);
    } else {
      console.warn(`No handler found for action: ${action}`);
    }
  }
  
  /**
   * Handle item controls (edit, delete, toggle)
   */
  async _onItemControl(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const action = button.dataset.action;
    const li = button.closest('.item');
    const item = this.actor.items.get(li?.dataset.itemId);
    
    switch(action) {
      case 'create':
        return this._onItemCreate(button);
      case 'edit':
        return item?.sheet.render(true);
      case 'delete':
        return this._onItemDelete(item);
      case 'toggle':
        return item?.update({'system.equipped': !item.system.equipped});
      case 'quantity-up':
        return item?.update({'system.quantity': (item.system.quantity || 1) + 1});
      case 'quantity-down':
        return item?.update({'system.quantity': Math.max(0, (item.system.quantity || 1) - 1)});
    }
  }
  
  /**
   * Create new item
   */
  async _onItemCreate(button) {
    const type = button.dataset.type;
    const name = `New ${type.capitalize()}`;
    
    const itemData = {
      name: name,
      type: type,
      system: {}
    };
    
    const created = await this.actor.createEmbeddedDocuments('Item', [itemData]);
    return created[0]?.sheet.render(true);
  }
  
  /**
   * Delete item with confirmation
   */
  async _onItemDelete(item) {
    if (!item) return;
    
    const confirmed = await Dialog.confirm({
      title: `Delete ${item.name}?`,
      content: `<p>Are you sure you want to delete <strong>${item.name}</strong>?</p>`,
      yes: () => true,
      no: () => false
    });
    
    if (confirmed) {
      return item.delete();
    }
  }
  
  /**
   * Handle rolls
   */
  async _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    
    if (dataset.roll) {
      const roll = new Roll(dataset.roll, this.actor.getRollData());
      const label = dataset.label || 'Roll';
      
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({actor: this.actor}),
        flavor: label
      });
    }
  }
  
  /**
   * Handle quantity changes
   */
  async _onItemQuantity(event) {
    const input = event.currentTarget;
    const li = input.closest('.item');
    const item = this.actor.items.get(li?.dataset.itemId);
    const quantity = parseInt(input.value) || 0;
    
    return item?.update({'system.quantity': quantity});
  }
  
  /**
   * Handle equipped checkbox
   */
  async _onItemEquipped(event) {
    const checkbox = event.currentTarget;
    const li = checkbox.closest('.item');
    const item = this.actor.items.get(li?.dataset.itemId);
    
    return item?.update({'system.equipped': checkbox.checked});
  }
  
  /**
   * Handle drag start
   */
  _onDragStart(event) {
    const li = event.currentTarget;
    if (event.target.classList.contains('content-link')) return;
    
    const item = this.actor.items.get(li.dataset.itemId);
    if (!item) return;
    
    const dragData = item.toDragData();
    event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
  }
  
  /**
   * Handle drop
   */
  async _onDrop(event) {
    const data = TextEditor.getDragEventData(event);
    const actor = this.actor;
    
    // Handle different drop types
    switch (data.type) {
      case 'Item':
        return this._onDropItem(event, data);
      case 'ActiveEffect':
        return this._onDropActiveEffect(event, data);
    }
    
    return super._onDrop(event);
  }
  
  async _onDropItem(event, data) {
    if (!this.actor.isOwner) return false;
    
    const item = await Item.implementation.fromDropData(data);
    const itemData = item.toObject();
    
    // Handle item pile (if from compendium or another actor)
    if (this.actor.uuid === item.parent?.uuid) {
      return this._onSortItem(event, itemData);
    }
    
    return this.actor.createEmbeddedDocuments('Item', [itemData]);
  }
}
